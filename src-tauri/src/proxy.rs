use axum::{
    extract::{Query, Extension},
    http::{StatusCode, HeaderMap, Uri},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use url::Url;
use tauri::{AppHandle, Emitter};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;

use crate::PrivacySettings;

#[derive(Deserialize)]
pub struct ProxyQuery {
    url: String,
    #[serde(default)]
    raw: Option<bool>,
}

#[derive(Serialize)]
pub struct ReadabilityResponse {
    title: String,
    content: String,
    #[serde(rename = "siteName")]
    site_name: String,
    #[serde(rename = "readingTime")]
    reading_time: u32,
    #[serde(rename = "wordCount")]
    word_count: usize,
}

/// Shared proxy context
#[derive(Clone)]
pub struct ProxyContext {
    pub tor_state: Arc<Mutex<bool>>,
    pub privacy: Arc<Mutex<PrivacySettings>>,
    pub blocked_count: Arc<Mutex<u64>>,
    pub blocklist: Arc<HashSet<String>>,
    pub app_handle: AppHandle,
    pub referer_map: Arc<Mutex<std::collections::HashMap<String, String>>>,
}

#[derive(Serialize, Clone)]
pub struct DownloadEvent {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub total_bytes: u64,
}

#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    pub id: String,
    pub received_bytes: u64,
    pub state: String,
    pub save_path: Option<String>,
}

fn handle_download(res: reqwest::Response, app_handle: AppHandle, target_url: String) {
    let id = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis().to_string();
    
    let mut filename = "downloaded_file".to_string();
    if let Some(cd) = res.headers().get("content-disposition").and_then(|v| v.to_str().ok()) {
        if let Some(idx) = cd.find("filename=") {
            let part = &cd[idx + 9..];
            let part = part.trim_matches(|c| c == '"' || c == '\'');
            let name = part.split(';').next().unwrap_or(part);
            filename = name.to_string();
        }
    } else if let Ok(url) = Url::parse(&target_url) {
        if let Some(segments) = url.path_segments() {
            if let Some(last) = segments.last() {
                if !last.is_empty() {
                    filename = last.to_string();
                }
            }
        }
    }
    
    let total_bytes = res.content_length().unwrap_or(0);
    
    let _ = app_handle.emit("download-started", DownloadEvent {
        id: id.clone(),
        filename: filename.clone(),
        url: target_url.clone(),
        total_bytes,
    });
    
    tokio::spawn(async move {
        let download_dir = dirs::download_dir().unwrap_or_else(|| PathBuf::from("."));
        let save_path = download_dir.join(&filename);
        let save_path_str = save_path.to_string_lossy().to_string();
        
        let mut file = match File::create(&save_path).await {
            Ok(f) => f,
            Err(_) => return,
        };
        
        let mut stream = res.bytes_stream();
        let mut received_bytes = 0u64;
        let mut last_emit = std::time::Instant::now();
        
        while let Some(chunk) = stream.next().await {
            if let Ok(bytes) = chunk {
                if let Err(_) = file.write_all(&bytes).await {
                    break;
                }
                received_bytes += bytes.len() as u64;
                
                if last_emit.elapsed().as_millis() > 500 {
                    let _ = app_handle.emit("download-progress", DownloadProgress {
                        id: id.clone(),
                        received_bytes,
                        state: "progressing".to_string(),
                        save_path: Some(save_path_str.clone()),
                    });
                    last_emit = std::time::Instant::now();
                }
            } else {
                break;
            }
        }
        
        let _ = app_handle.emit("download-progress", DownloadProgress {
            id,
            received_bytes,
            state: "completed".to_string(),
            save_path: Some(save_path_str),
        });
    });
}

/// Build the ad/tracker blocklist from embedded domains
fn build_blocklist() -> HashSet<String> {
    // Curated list of ~2500 most common ad/tracker domains
    // Sources: Peter Lowe's list, StevenBlack/hosts (condensed)
    let domains = include_str!("blocklist.txt");
    domains
        .lines()
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .map(|l| l.trim().to_lowercase())
        .collect()
}

/// Check if a URL's domain matches any blocked domain
fn is_blocked(url_str: &str, blocklist: &HashSet<String>) -> bool {
    if let Ok(parsed) = Url::parse(url_str) {
        if let Some(host) = parsed.host_str() {
            let host = host.to_lowercase();
            // Check exact match
            if blocklist.contains(&host) {
                return true;
            }
            // Check parent domains (e.g., sub.tracker.com → tracker.com)
            let parts: Vec<&str> = host.split('.').collect();
            for i in 1..parts.len().saturating_sub(1) {
                let parent = parts[i..].join(".");
                if blocklist.contains(&parent) {
                    return true;
                }
            }
        }
    }
    false
}

/// JavaScript to inject for WebRTC leak protection
const WEBRTC_BLOCK_SCRIPT: &str = r#"<script>
(function(){
  // Block WebRTC IP leak by neutering RTCPeerConnection
  if(window.RTCPeerConnection){
    const orig=window.RTCPeerConnection;
    window.RTCPeerConnection=function(cfg,cons){
      if(cfg&&cfg.iceServers){cfg.iceServers=[];}
      return new orig(cfg,cons);
    };
    window.RTCPeerConnection.prototype=orig.prototype;
  }
  if(window.webkitRTCPeerConnection){window.webkitRTCPeerConnection=window.RTCPeerConnection;}
  if(window.mozRTCPeerConnection){window.mozRTCPeerConnection=window.RTCPeerConnection;}
  // Also block enumerateDevices to prevent fingerprinting
  if(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices){
    navigator.mediaDevices.enumerateDevices=function(){return Promise.resolve([]);};
  }
})();
</script>"#;

/// JavaScript to inject for canvas fingerprint noise
const CANVAS_NOISE_SCRIPT: &str = r#"<script>
(function(){
  // Add random noise to canvas fingerprinting methods
  const origToDataURL=HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL=function(type){
    const ctx=this.getContext('2d');
    if(ctx){
      const imageData=ctx.getImageData(0,0,this.width,this.height);
      for(let i=0;i<imageData.data.length;i+=4){
        imageData.data[i]^=(Math.random()*2)|0;
      }
      ctx.putImageData(imageData,0,0);
    }
    return origToDataURL.apply(this,arguments);
  };
  const origGetImageData=CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData=function(){
    const data=origGetImageData.apply(this,arguments);
    for(let i=0;i<data.data.length;i+=4){
      data.data[i]^=(Math.random()*2)|0;
    }
    return data;
  };
  // WebGL fingerprinting protection
  const getParam=WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter=function(p){
    if(p===37445)return'Veil Browser';
    if(p===37446)return'Veil Graphics';
    return getParam.apply(this,arguments);
  };
})();
</script>"#;

pub async fn start_proxy(
    tor_state: Arc<Mutex<bool>>,
    privacy: Arc<Mutex<PrivacySettings>>,
    blocked_count: Arc<Mutex<u64>>,
    app_handle: AppHandle,
) {
    let blocklist = Arc::new(build_blocklist());
    let referer_map = Arc::new(Mutex::new(std::collections::HashMap::new()));
    let ctx = ProxyContext { tor_state, privacy, blocked_count, blocklist, app_handle, referer_map };

    let app = Router::new()
        .route("/proxy", get(handle_proxy))
        .route("/readability", get(handle_readability))
        .route("/ac", get(handle_autocomplete))
        .fallback(axum::routing::any(handle_fallback))
        .layer(Extension(ctx));
        
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8181")
        .await
        .unwrap();
    println!("Proxy listening on 127.0.0.1:8181");
    axum::serve(listener, app).await.unwrap();
}

fn build_client(ctx: &ProxyContext) -> Client {
    let mut client_builder = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .danger_accept_invalid_certs(true);
        
    let tor_enabled = *ctx.tor_state.lock().unwrap();
    if tor_enabled {
        if let Ok(proxy) = reqwest::Proxy::all("socks5h://127.0.0.1:9050") {
            client_builder = client_builder.proxy(proxy);
        }
    }
    
    client_builder.build().unwrap()
}

/// Apply HTTPS-only upgrade to URL
fn maybe_upgrade_https(url: &str, settings: &PrivacySettings) -> String {
    if settings.https_only && url.starts_with("http://") {
        url.replacen("http://", "https://", 1)
    } else {
        url.to_string()
    }
}

async fn handle_proxy(
    Query(params): Query<ProxyQuery>,
    Extension(ctx): Extension<ProxyContext>,
) -> impl IntoResponse {
    let settings = ctx.privacy.lock().unwrap().clone();
    let is_normal = settings.normal_mode;
    
    // Ad blocking check (skip in normal mode)
    if !is_normal && settings.ad_blocker && is_blocked(&params.url, &ctx.blocklist) {
        let mut count = ctx.blocked_count.lock().unwrap();
        *count += 1;
        return Response::builder()
            .status(StatusCode::NO_CONTENT)
            .header("Access-Control-Allow-Origin", "*")
            .header("X-Veil-Blocked", "true")
            .body(axum::body::Body::empty())
            .unwrap();
    }

    let client = build_client(&ctx);
    let target_url = maybe_upgrade_https(&params.url, &settings);
    let is_raw = params.raw.unwrap_or(false);

    let mut request = client.get(&target_url);
    
    // Strip referer in privacy mode
    if !is_normal && settings.strip_referer {
        request = request.header("Referer", "");
    }
    
    // Block cookies
    if !is_normal && settings.block_cookies {
        request = request.header("Cookie", "");
    }

    match request.send().await {
        Ok(res) => {
            let status = res.status();
            let mut builder = Response::builder().status(status.as_u16());

            let is_html = res.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.contains("text/html"))
                .unwrap_or(false);

            let is_attachment = res.headers()
                .get("content-disposition")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.to_lowercase().contains("attachment"))
                .unwrap_or(false);

            let is_octet_stream = res.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.to_lowercase().contains("application/octet-stream") || v.to_lowercase().contains("application/zip") || v.to_lowercase().contains("application/x-msdownload"))
                .unwrap_or(false);

            if is_attachment || (is_octet_stream && !is_raw) {
                handle_download(res, ctx.app_handle.clone(), target_url);
                return Response::builder()
                    .status(StatusCode::NO_CONTENT)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(axum::body::Body::empty())
                    .unwrap();
            }

            for (key, val) in res.headers().iter() {
                let key_str = key.as_str().to_lowercase();
                // Skip transfer/encoding headers
                if key_str == "transfer-encoding" || key_str == "content-length" || key_str == "content-encoding" {
                    continue;
                }
                // Skip original CORS headers so we don't send duplicates
                if key_str.starts_with("access-control-allow-") {
                    continue;
                }
                // Block Set-Cookie in privacy mode
                if !is_normal && settings.block_cookies && key_str == "set-cookie" {
                    continue;
                }
                builder = builder.header(key.as_str(), val.as_bytes());
            }
            builder = builder.header("Access-Control-Allow-Origin", "*");

            if is_html && !is_raw {
                let final_url = res.url().to_string();
                let mut text = res.text().await.unwrap_or_default();
                
                let style_tag = "<style>html, body { display: block !important; visibility: visible !important; opacity: 1 !important; }</style>";
                let script_tag = format!(r#"<script>
                  const ORIGINAL_URL = "{}";
                  document.addEventListener('click', function(e) {{
                    let a = e.target.closest('a');
                    if (a && a.getAttribute('href') && !a.getAttribute('href').startsWith('javascript:')) {{
                      e.preventDefault();
                      try {{
                          let target = new URL(a.getAttribute('href'), ORIGINAL_URL).href;
                          window.parent.postMessage({{ type: 'navigate', url: target }}, '*');
                      }} catch(err) {{}}
                    }}
                  }}, true);
                  document.addEventListener('submit', function(e) {{
                    let f = e.target;
                    if (f && f.method && f.method.toUpperCase() === 'GET') {{
                      e.preventDefault();
                      try {{
                          let action = f.getAttribute('action') || '';
                          let url = new URL(action, ORIGINAL_URL);
                          let formData = new FormData(f);
                          for (let [key, val] of formData.entries()) {{
                              url.searchParams.set(key, val);
                          }}
                          window.parent.postMessage({{ type: 'navigate', url: url.toString() }}, '*');
                      }} catch(err) {{}}
                    }}
                  }}, true);
                  window.history.pushState = function() {{}};
                  window.history.replaceState = function() {{}};
                  window.addEventListener('DOMContentLoaded', function() {{
                    window.parent.postMessage({{ type: 'page-info', title: document.title }}, '*');
                    let icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
                    if (icon && icon.href) {{
                      window.parent.postMessage({{ type: 'favicon', url: icon.href }}, '*');
                    }}
                    const obs = new MutationObserver(() => {{
                      window.parent.postMessage({{ type: 'page-info', title: document.title }}, '*');
                    }});
                    const t = document.querySelector('title');
                    if(t) obs.observe(t, {{ childList: true }});
                  }});
                </script>"#, final_url);
                
                // Build privacy injection scripts
                let mut privacy_scripts = String::new();
                if !is_normal {
                    if settings.block_webrtc {
                        privacy_scripts.push_str(WEBRTC_BLOCK_SCRIPT);
                    }
                    if settings.canvas_noise {
                        privacy_scripts.push_str(CANVAS_NOISE_SCRIPT);
                    }
                }
                
                let injected = format!("{}{}{}", style_tag, script_tag, privacy_scripts);

                let lower_text = text.to_lowercase();
                if let Some(idx) = lower_text.find("<head") {
                    if let Some(end_idx) = lower_text[idx..].find('>') {
                        text.insert_str(idx + end_idx + 1, &injected);
                    } else {
                        text.insert_str(0, &injected);
                    }
                } else if let Some(idx) = lower_text.find("<html") {
                    if let Some(end_idx) = lower_text[idx..].find('>') {
                        let head_block = format!("<head>{}</head>", injected);
                        text.insert_str(idx + end_idx + 1, &head_block);
                    } else {
                        text.insert_str(0, &injected);
                    }
                } else {
                    text.insert_str(0, &injected);
                }
                
                builder.body(axum::body::Body::from(text)).unwrap()
            } else {
                let bytes = res.bytes().await.unwrap_or_default();
                builder.body(axum::body::Body::from(bytes)).unwrap()
            }
        }
        Err(e) => {
            let error_html = format!(r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Connection Failed - Veil Browser</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #fafafa;
            font-family: system-ui, -apple-system, sans-serif;
            color: #111827;
        }}
        .container {{
            max-width: 420px;
            padding: 40px;
            text-align: center;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            border: 1px solid #f3f4f6;
        }}
        .icon {{
            width: 64px;
            height: 64px;
            background: #fee2e2;
            color: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
            font-size: 32px;
        }}
        h1 {{ margin: 0 0 12px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }}
        p {{ margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.5; }}
        .details {{
            margin: 0 0 24px 0;
            padding: 16px;
            background: #f3f4f6;
            border-radius: 12px;
            font-family: monospace;
            font-size: 12px;
            color: #4b5563;
            word-break: break-all;
            text-align: left;
        }}
        button {{
            background: #6366f1;
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }}
        button:hover {{ background: #4f46e5; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">!</div>
        <h1>Connection Failed</h1>
        <p>Veil Browser could not connect to this website. It may be offline, or blocked by your current network settings (e.g. Tor Mode).</p>
        <div class="details">{}</div>
        <button onclick="window.location.reload()">Try Again</button>
    </div>
    <!-- Padding to ensure Chromium doesn't replace this with its own error page:
         {}
    -->
</body>
</html>
"#, e, "X".repeat(512));

            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header("Content-Type", "text/html")
                .header("Access-Control-Allow-Origin", "*")
                .body(axum::body::Body::from(error_html))
                .unwrap()
        }
    }
}

async fn handle_readability(
    Query(params): Query<ProxyQuery>,
    Extension(ctx): Extension<ProxyContext>,
) -> impl IntoResponse {
    let target_url = params.url;
    let client = build_client(&ctx);

    match client.get(&target_url).send().await {
        Ok(res) => {
            let html = res.text().await.unwrap_or_default();
            let url_obj = Url::parse(&target_url).unwrap_or(Url::parse("http://example.com").unwrap());
            
            let mut cursor = std::io::Cursor::new(html);
            match readability::extractor::extract(&mut cursor, &url_obj) {
                Ok(product) => {
                    let word_count = product.content.split_whitespace().count();
                    let reading_time = std::cmp::max(1, (word_count / 200) as u32);
                    
                    let resp = ReadabilityResponse {
                        title: product.title,
                        content: product.content,
                        site_name: url_obj.host_str().unwrap_or("").to_string(),
                        reading_time,
                        word_count,
                    };
                    
                    Response::builder()
                        .status(StatusCode::OK)
                        .header("Access-Control-Allow-Origin", "*")
                        .header("Content-Type", "application/json")
                        .body(axum::body::Body::from(serde_json::to_string(&resp).unwrap()))
                        .unwrap()
                }
                Err(_) => {
                    Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(axum::body::Body::from("Failed to parse article"))
                        .unwrap()
                }
            }
        }
        Err(_) => {
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header("Access-Control-Allow-Origin", "*")
                .body(axum::body::Body::from("Failed to fetch article"))
                .unwrap()
        }
    }
}

async fn handle_autocomplete(
    Query(params): Query<ProxyQuery>,
    Extension(ctx): Extension<ProxyContext>,
) -> impl IntoResponse {
    let client = build_client(&ctx);
    let url = format!("https://duckduckgo.com/ac/?q={}&type=list", urlencoding::encode(&params.url));
    
    match client.get(&url).send().await {
        Ok(res) => {
            let status = res.status();
            let mut builder = Response::builder().status(status.as_u16());
            builder = builder.header("Access-Control-Allow-Origin", "*");
            let bytes = res.bytes().await.unwrap_or_default();
            builder.body(axum::body::Body::from(bytes)).unwrap()
        }
        Err(_) => {
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header("Access-Control-Allow-Origin", "*")
                .body(axum::body::Body::from("[]"))
                .unwrap()
        }
    }
}

async fn handle_fallback(
    headers: HeaderMap,
    uri: Uri,
    Extension(ctx): Extension<ProxyContext>,
) -> impl IntoResponse {
    let referer = match headers.get("referer").and_then(|v| v.to_str().ok()) {
        Some(r) => r,
        None => return Response::builder().status(404).body(axum::body::Body::from("Not Found")).unwrap(),
    };
    
    let mut base_target_str = String::new();
    
    if let Ok(ref_url) = Url::parse(referer) {
        if ref_url.path() == "/proxy" {
            if let Some((_, v)) = ref_url.query_pairs().find(|(k, _)| k == "url") {
                base_target_str = v.into_owned();
            }
        }
    }
    
    if base_target_str.is_empty() {
        let map = ctx.referer_map.lock().unwrap();
        if let Some(target) = map.get(referer) {
            base_target_str = target.clone();
        }
    }
    
    if base_target_str.is_empty() {
        return Response::builder().status(404).body(axum::body::Body::from("Not Found")).unwrap();
    }
    
    let base_target = match Url::parse(&base_target_str) {
        Ok(u) => u,
        Err(_) => return Response::builder().status(404).body(axum::body::Body::from("Not Found")).unwrap(),
    };
    
    let path_and_query = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
    let resolved_url = match base_target.join(path_and_query) {
        Ok(u) => u.to_string(),
        Err(_) => return Response::builder().status(404).body(axum::body::Body::from("Not Found")).unwrap(),
    };
    
    let current_url = format!("http://127.0.0.1:8181{}", path_and_query);
    {
        let mut map = ctx.referer_map.lock().unwrap();
        if map.len() > 10000 {
            map.clear();
        }
        map.insert(current_url, resolved_url.clone());
    }
    
    // Ad blocking check for sub-resources
    let settings = ctx.privacy.lock().unwrap().clone();
    if !settings.normal_mode && settings.ad_blocker && is_blocked(&resolved_url, &ctx.blocklist) {
        let mut count = ctx.blocked_count.lock().unwrap();
        *count += 1;
        return Response::builder()
            .status(StatusCode::NO_CONTENT)
            .header("Access-Control-Allow-Origin", "*")
            .header("X-Veil-Blocked", "true")
            .body(axum::body::Body::empty())
            .unwrap();
    }
    
    let client = build_client(&ctx);
    
    let res = match client.get(&resolved_url).send().await {
        Ok(r) => r,
        Err(_) => return Response::builder().status(502).body(axum::body::Body::from("Bad Gateway")).unwrap(),
    };
    
    let mut builder = Response::builder().status(res.status());
        
    for (key, val) in res.headers().iter() {
        let key_str = key.as_str().to_lowercase();
        if key_str == "transfer-encoding" {
            continue;
        }
        // Skip original CORS headers
        if key_str.starts_with("access-control-allow-") {
            continue;
        }
        // Block Set-Cookie in privacy mode
        if !settings.normal_mode && settings.block_cookies && key_str == "set-cookie" {
            continue;
        }
        builder = builder.header(key.as_str(), val.as_bytes());
    }
    builder = builder.header("Access-Control-Allow-Origin", "*");
    
    let bytes = res.bytes().await.unwrap_or_default();
    builder.body(axum::body::Body::from(bytes)).unwrap()
}
