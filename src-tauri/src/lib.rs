mod proxy;
mod db;

use proxy::start_proxy;
use std::sync::Mutex;
use std::sync::Arc;
use serde::Deserialize;
use tauri::{Emitter, Manager};

/// Privacy settings synced from the frontend
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    pub ad_blocker: bool,
    pub strip_referer: bool,
    pub block_cookies: bool,
    pub https_only: bool,
    #[serde(rename = "blockWebRTC")]
    pub block_webrtc: bool,
    pub canvas_noise: bool,
    pub normal_mode: bool,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            ad_blocker: true,
            strip_referer: true,
            block_cookies: true,
            https_only: false,
            block_webrtc: true,
            canvas_noise: true,
            normal_mode: false,
        }
    }
}

pub struct ProxyState {
    pub tor_enabled: Arc<Mutex<bool>>,
    pub tor_process: Mutex<Option<std::process::Child>>,
    pub privacy_settings: Arc<Mutex<PrivacySettings>>,
    pub blocked_count: Arc<Mutex<u64>>,
}

#[tauri::command]
fn sync_privacy_settings(state: tauri::State<ProxyState>, settings: PrivacySettings) -> Result<String, String> {
    let mut ps = state.privacy_settings.lock().unwrap();
    *ps = settings;
    Ok("Settings synced".into())
}

#[tauri::command]
fn get_blocked_count(state: tauri::State<ProxyState>) -> u64 {
    *state.blocked_count.lock().unwrap()
}

#[tauri::command]
fn toggle_tor(state: tauri::State<ProxyState>, app_handle: tauri::AppHandle, enable: bool) -> Result<String, String> {
    let mut tor_enabled = state.tor_enabled.lock().unwrap();
    *tor_enabled = enable;
    if enable {
        let app_clone = app_handle.clone();
        std::thread::spawn(move || {
            let tor_dir = std::env::temp_dir().join("veil-tor");
            let tor_exe = tor_dir.join("tor").join("tor.exe");
            
            if !tor_exe.exists() {
                let _ = app_clone.emit("tor-log", "Downloading Tor Expert Bundle...");
                let archive_path = tor_dir.join("tor.tar.gz");
                let _ = std::fs::create_dir_all(&tor_dir);
                
                let mut extract = false;
                if let Ok(resource_path) = app_clone.path().resolve("tor.tar.gz", tauri::path::BaseDirectory::Resource) {
                    if resource_path.exists() {
                        let _ = app_clone.emit("tor-log", "Using bundled Tor Expert Bundle...");
                        let _ = std::fs::copy(&resource_path, &archive_path);
                        extract = true;
                    }
                }
                
                if !extract {
                    let _ = app_clone.emit("tor-log", "Downloading Tor Expert Bundle...");
                    let url = "https://archive.torproject.org/tor-package-archive/torbrowser/13.5.3/tor-expert-bundle-windows-x86_64-13.5.3.tar.gz";
                    let status = std::process::Command::new("curl")
                        .args(["-s", "-L", url, "-o", archive_path.to_str().unwrap()])
                        .status();
                        
                    if let Ok(st) = status {
                        if st.success() { extract = true; }
                    }
                }
                
                if extract {
                    let _ = app_clone.emit("tor-log", "Extracting Tor (this may take a moment)...");
                    let _ = std::process::Command::new("tar")
                        .args(["-xf", archive_path.to_str().unwrap(), "-C", tor_dir.to_str().unwrap()])
                        .status();
                }
            }
            
            if tor_exe.exists() {
                let _ = app_clone.emit("tor-log", "Starting local Tor daemon...");
                let mut child = std::process::Command::new(&tor_exe)
                    .current_dir(&tor_dir)
                    .args([
                        "--DataDirectory",
                        tor_dir.join("data").to_str().unwrap(),
                        "--GeoIPFile",
                        tor_dir.join("data").join("geoip").to_str().unwrap(),
                        "--GeoIPv6File",
                        tor_dir.join("data").join("geoip6").to_str().unwrap(),
                    ])
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn()
                    .expect("Failed to start Tor");

                let stdout = child.stdout.take().unwrap();
                
                // Store the child process so we can kill it later
                if let Some(state) = app_clone.try_state::<ProxyState>() {
                    let mut proc = state.tor_process.lock().unwrap();
                    *proc = Some(child);
                }

                use std::io::{BufRead, BufReader};
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(l) = line {
                        if l.contains("Bootstrapped") {
                            let parts: Vec<&str> = l.split("Bootstrapped").collect();
                            if parts.len() > 1 {
                                let _ = app_clone.emit("tor-log", format!("Bootstrapped{}", parts[1]));
                            }
                        }
                    }
                }
            } else {
                let _ = app_clone.emit("tor-log", "Failed to setup Tor automatically. Please install manually.");
            }
        });
        Ok("Tor enabled".into())
    } else {
        // Kill the Tor process if it exists
        let mut proc = state.tor_process.lock().unwrap();
        if let Some(mut child) = proc.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        let _ = app_handle.emit("tor-log", "Tor disconnected");
        Ok("Tor disabled".into())
    }
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if let Ok(is_maximized) = window.is_maximized() {
        if is_maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
async fn open_incognito_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::{WebviewWindowBuilder, WebviewUrl};
    
    let label = format!("incognito-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
    
    let _ = WebviewWindowBuilder::new(&app_handle, label, WebviewUrl::App("/browser/?incognito=true".into()))
        .title("Veil Browser - Incognito")
        .inner_size(1200.0, 800.0)
        .decorations(false)
        .build()
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    open::that(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn pause_download(_id: String) -> Result<(), String> {
    // Stub: Pause not yet implemented natively
    Ok(())
}

#[tauri::command]
fn resume_download(_id: String) -> Result<(), String> {
    // Stub: Resume not yet implemented natively
    Ok(())
}

#[tauri::command]
fn cancel_download(_id: String) -> Result<(), String> {
    // Stub: Cancel not yet implemented natively
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let tor_state = Arc::new(Mutex::new(false));
    let privacy_settings = Arc::new(Mutex::new(PrivacySettings::default()));
    let blocked_count = Arc::new(Mutex::new(0u64));
    
    tauri::Builder::default()
        .manage(ProxyState {
            tor_enabled: tor_state.clone(),
            tor_process: Mutex::new(None),
            privacy_settings: privacy_settings.clone(),
            blocked_count: blocked_count.clone(),
        })
        .setup(move |app| {
            let app_handle = app.handle().clone();
            
            // Initialize SQLite DB
            if let Ok(conn) = db::init_db(&app_handle) {
                app.manage(Mutex::new(conn));
            } else {
                eprintln!("Failed to initialize history database.");
            }
            
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    start_proxy(tor_state, privacy_settings, blocked_count, app_handle).await;
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync_privacy_settings,
            get_blocked_count,
            toggle_tor,
            maximize_window,
            minimize_window,
            close_window,
            open_file,
            open_incognito_window,
            pause_download,
            resume_download,
            cancel_download,
            db::add_history,
            db::get_history,
            db::clear_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
