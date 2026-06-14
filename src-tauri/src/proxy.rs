use axum::{
    extract::Query,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use reqwest::Client;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct ProxyQuery {
    url: String,
}

pub async fn start_proxy() {
    let app = Router::new().route("/proxy", get(handle_proxy));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8181")
        .await
        .unwrap();
    println!("Proxy listening on 127.0.0.1:8181");
    axum::serve(listener, app).await.unwrap();
}

async fn handle_proxy(Query(params): Query<ProxyQuery>) -> impl IntoResponse {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .unwrap();
    let target_url = params.url;

    match client.get(&target_url).send().await {
        Ok(res) => {
            let status = res.status();
            let mut builder = Response::builder().status(status.as_u16());

            // Copy headers but strip frame-blocking ones
            for (k, v) in res.headers() {
                let key = k.as_str().to_lowercase();
                if key == "x-frame-options"
                    || key == "content-security-policy"
                    || key == "cross-origin-opener-policy"
                    || key == "cross-origin-embedder-policy"
                {
                    continue;
                }
                builder = builder.header(k, v);
            }

            // Add CORS headers so the frontend can fetch
            builder = builder.header("Access-Control-Allow-Origin", "*");

            let bytes = res.bytes().await.unwrap_or_default();
            builder
                .body(axum::body::Body::from(bytes))
                .unwrap()
        }
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header("Access-Control-Allow-Origin", "*")
            .body(axum::body::Body::from(format!("Proxy Error: {}", e)))
            .unwrap(),
    }
}
