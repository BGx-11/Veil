use axum::{
    extract::Query,
    http::StatusCode,
    response::{IntoResponse, Response, Json},
    routing::get,
    Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ProxyQuery {
    url: String,
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

pub async fn start_proxy() {
    let app = Router::new()
        .route("/proxy", get(handle_proxy))
        .route("/readability", get(handle_readability));
        
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8181")
        .await
        .unwrap();
    println!("Proxy listening on 127.0.0.1:8181");
    axum::serve(listener, app).await.unwrap();
}

async fn handle_proxy(Query(params): Query<ProxyQuery>) -> impl IntoResponse {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .unwrap();
    let target_url = params.url;

    match client.get(&target_url).send().await {
        Ok(res) => {
            let status = res.status();
            let mut builder = Response::builder().status(status.as_u16());

            let is_html = res.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.contains("text/html"))
                .unwrap_or(false);

            // Copy headers but strip frame-blocking ones
            for (k, v) in res.headers() {
                let key = k.as_str().to_lowercase();
                if key == "x-frame-options"
                    || key == "content-security-policy"
                    || key == "cross-origin-opener-policy"
                    || key == "cross-origin-embedder-policy"
                    || (is_html && key == "content-length") // strip content-length if we modify HTML
                {
                    continue;
                }
                builder = builder.header(k, v);
            }

            // Enforce strict CSP to prevent frame-busting and limit malicious scripts inside the proxy
            builder = builder.header("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-same-origin");

            // Add CORS headers so the frontend can fetch
            builder = builder.header("Access-Control-Allow-Origin", "*");

            if is_html {
                let mut text = res.text().await.unwrap_or_default();
                let base_url = match url::Url::parse(&target_url) {
                    Ok(mut u) => {
                        u.set_path("");
                        u.set_query(None);
                        u.set_fragment(None);
                        u.to_string()
                    },
                    Err(_) => target_url.clone(),
                };
                
                let base_tag = format!("<base href=\"{}\">", base_url);
                if let Some(idx) = text.find("<head>") {
                    text.insert_str(idx + 6, &base_tag);
                } else if let Some(idx) = text.find("<HEAD>") {
                    text.insert_str(idx + 6, &base_tag);
                } else {
                    text.insert_str(0, &base_tag);
                }
                
                builder.body(axum::body::Body::from(text)).unwrap()
            } else {
                let bytes = res.bytes().await.unwrap_or_default();
                builder.body(axum::body::Body::from(bytes)).unwrap()
            }
        }
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header("Access-Control-Allow-Origin", "*")
            .body(axum::body::Body::from(format!("Proxy Error: {}", e)))
            .unwrap(),
    }
}

async fn handle_readability(Query(params): Query<ProxyQuery>) -> impl IntoResponse {
    let target_url = params.url;
    
    // We fetch HTML first to parse it
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .unwrap();
        
    match client.get(&target_url).send().await {
        Ok(res) => {
            let html = res.text().await.unwrap_or_default();
            let mut cursor = std::io::Cursor::new(html);
            let url = url::Url::parse(&target_url).unwrap();
            
            match readability::extractor::extract(&mut cursor, &url) {
                Ok(product) => {
                    let words = product.text.split_whitespace().count();
                    let reading_time = std::cmp::max(1, (words / 200) as u32);
                    
                    let resp = ReadabilityResponse {
                        title: product.title,
                        content: product.content, // HTML content
                        site_name: url.domain().unwrap_or("").to_string(),
                        reading_time,
                        word_count: words,
                    };
                    
                    let mut response = Json(resp).into_response();
                    response.headers_mut().insert("Access-Control-Allow-Origin", "*".parse().unwrap());
                    response
                },
                Err(_) => {
                    let response = Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(axum::body::Body::from("Failed to parse article"))
                        .unwrap();
                    response
                }
            }
        },
        Err(e) => {
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Access-Control-Allow-Origin", "*")
                .body(axum::body::Body::from(format!("Fetch Error: {}", e)))
                .unwrap()
        }
    }
}
