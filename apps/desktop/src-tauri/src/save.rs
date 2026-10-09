use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

type HmacSha256 = Hmac<Sha256>;

const NONCE_LEN: usize = 12;

/// 派生密钥：生产环境应改用系统密钥环 / 用户口令 KDF。
fn key_from_app(app: &tauri::AppHandle) -> [u8; 32] {
    let mut key = [0u8; 32];
    let seed = app
        .path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "doomsday-harem".into());
    let digest = Sha256::digest(seed.as_bytes());
    key.copy_from_slice(&digest[..32]);
    key
}

fn saves_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("saves");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn checksum(key: &[u8; 32], payload: &[u8]) -> String {
    let mut mac = <HmacSha256 as Mac>::new_from_slice(key).expect("hmac key");
    mac.update(payload);
    hex(&mac.finalize().into_bytes())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// 存档格式： [12B nonce][ciphertext]，明文为 JSON {checksum, payload}
#[tauri::command]
pub fn save_game(app: tauri::AppHandle, slot: String, json: String) -> Result<String, String> {
    let key = key_from_app(&app);
    let sum = checksum(&key, json.as_bytes());
    let envelope = serde_json::json!({ "checksum": sum, "payload": json }).to_string();

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    use aes_gcm::aead::rand_core::RngCore;
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ct = cipher
        .encrypt(nonce, envelope.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ct);

    let path = saves_dir(&app)?.join(format!("{slot}.sav"));
    fs::write(&path, out).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_game(app: tauri::AppHandle, slot: String) -> Result<String, String> {
    let key = key_from_app(&app);
    let path = saves_dir(&app)?.join(format!("{slot}.sav"));
    let raw = fs::read(&path).map_err(|e| e.to_string())?;
    if raw.len() <= NONCE_LEN {
        return Err("存档损坏".into());
    }
    let (nonce_bytes, ct) = raw.split_at(NONCE_LEN);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let pt = cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ct)
        .map_err(|_| "解密失败（密钥不符或存档被篡改）".to_string())?;

    let envelope: serde_json::Value =
        serde_json::from_slice(&pt).map_err(|e| e.to_string())?;
    let payload = envelope["payload"].as_str().ok_or("缺少 payload")?;
    let stored = envelope["checksum"].as_str().ok_or("缺少 checksum")?;

    if checksum(&key, payload.as_bytes()) != stored {
        return Err("校验失败：存档已被篡改".into());
    }
    Ok(payload.to_string())
}

#[tauri::command]
pub fn list_saves(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = saves_dir(&app)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let e = entry.map_err(|e| e.to_string())?;
        let name = e.file_name().to_string_lossy().to_string();
        if let Some(stem) = name.strip_suffix(".sav") {
            out.push(stem.to_string());
        }
    }
    out.sort();
    Ok(out)
}

#[tauri::command]
pub fn delete_save(app: tauri::AppHandle, slot: String) -> Result<(), String> {
    let path = saves_dir(&app)?.join(format!("{slot}.sav"));
    fs::remove_file(path).map_err(|e| e.to_string())
}
