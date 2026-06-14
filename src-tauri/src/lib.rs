mod proxy;

use proxy::start_proxy;
use std::sync::Mutex;

pub struct ProxyState {
    pub tor_enabled: Mutex<bool>,
}

#[tauri::command]
fn toggle_tor(state: tauri::State<ProxyState>, enable: bool) -> Result<String, String> {
    let mut tor_enabled = state.tor_enabled.lock().unwrap();
    *tor_enabled = enable;
    if enable {
        Ok("Tor enabled".into())
    } else {
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
