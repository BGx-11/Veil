use reqwest::Client;
#[tokio::main]
async fn main() {
    let proxy = reqwest::Proxy::all("socks5h://127.0.0.1:9050").unwrap();
    let client = Client::builder().proxy(proxy).build().unwrap();
    match client.get("http://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion/").send().await {
        Ok(res) => println!("Success: {}", res.status()),
        Err(e) => println!("Error: {:?}", e),
    }
}
