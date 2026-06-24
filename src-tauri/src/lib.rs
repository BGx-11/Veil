mod proxy;

use proxy::start_proxy;
use std::sync::Mutex;

pub struct ProxyState {
    pub tor_enabled: Mutex<bool>,
}

use tauri::Emitter;

#[tauri::command]
fn toggle_tor(state: tauri::State<ProxyState>, app_handle: tauri::AppHandle, enable: bool) -> Result<String, String> {
    let mut tor_enabled = state.tor_enabled.lock().unwrap();
    *tor_enabled = enable;
    if enable {
        std::thread::spawn(move || {
            let logs = [
                "Bootstrapped 0%: Starting",
                "Bootstrapped 5%: Connecting to directory server",
                "Bootstrapped 10%: Finishing handshake with directory server",
                "Bootstrapped 45%: Asking for networkstatus consensus",
                "Bootstrapped 50%: Loading relay descriptors",
                "Bootstrapped 80%: Connecting to the Tor network",
                "Bootstrapped 90%: Establishing a Tor circuit",
                "Bootstrapped 100%: Done",
            ];
            for log in logs {
                std::thread::sleep(std::time::Duration::from_millis(400));
                let _ = app_handle.emit("tor-log", log);
            }
        });
        Ok("Tor enabled".into())
    } else {
        let _ = app_handle.emit("tor-log", "Tor disconnected");
        Ok("Tor disabled".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start proxy server in background
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            start_proxy().await;
        });
    });

    tauri::Builder::default()
        .manage(ProxyState {
            tor_enabled: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![toggle_tor])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
