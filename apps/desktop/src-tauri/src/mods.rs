use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
pub struct ModEntry {
    pub id: String,
    pub path: String,
    pub manifest: Option<serde_json::Value>,
}

fn mods_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("mods");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub fn list_mods(app: tauri::AppHandle) -> Result<Vec<ModEntry>, String> {
    let dir = mods_dir(&app)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let e = entry.map_err(|e| e.to_string())?;
        if !e.path().is_dir() {
            continue;
        }
        let id = e.file_name().to_string_lossy().to_string();
        let manifest_path = e.path().join("mod.json");
        let manifest = fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok());
        out.push(ModEntry {
            id,
            path: e.path().to_string_lossy().to_string(),
            manifest,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn read_mod_manifest(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let path = mods_dir(&app)?.join(&id).join("mod.json");
    fs::read_to_string(path).map_err(|e| e.to_string())
}
