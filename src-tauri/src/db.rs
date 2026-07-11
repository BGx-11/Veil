use rusqlite::{Connection, Result};
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
pub struct HistoryItem {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub favicon: Option<String>,
    pub timestamp: i64,
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection> {
    let app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&app_dir).unwrap_or(());
    
    let db_path = app_dir.join("history.sqlite");
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            favicon TEXT,
            timestamp INTEGER NOT NULL
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history (timestamp DESC)",
        [],
    )?;
    
    Ok(conn)
}

#[tauri::command]
pub fn add_history(state: tauri::State<Mutex<Connection>>, url: String, title: String, favicon: Option<String>) -> Result<(), String> {
    let conn = state.lock().map_err(|_| "Failed to lock database")?;
    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
    
    conn.execute(
        "INSERT INTO history (url, title, favicon, timestamp) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![url, title, favicon, timestamp],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_history(state: tauri::State<Mutex<Connection>>, limit: i64, offset: i64) -> Result<Vec<HistoryItem>, String> {
    let conn = state.lock().map_err(|_| "Failed to lock database")?;
    let mut stmt = conn.prepare("SELECT id, url, title, favicon, timestamp FROM history ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2").map_err(|e| e.to_string())?;
    
    let history_iter = stmt.query_map(rusqlite::params![limit, offset], |row| {
        Ok(HistoryItem {
            id: row.get(0)?,
            url: row.get(1)?,
            title: row.get(2)?,
            favicon: row.get(3)?,
            timestamp: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for item in history_iter {
        if let Ok(i) = item {
            items.push(i);
        }
    }
    
    Ok(items)
}

#[tauri::command]
pub fn clear_history(state: tauri::State<Mutex<Connection>>) -> Result<(), String> {
    let conn = state.lock().map_err(|_| "Failed to lock database")?;
    conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
    Ok(())
}

