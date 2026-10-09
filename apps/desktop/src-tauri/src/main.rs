// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod save;
mod mods;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save::save_game,
            save::load_game,
            save::list_saves,
            save::delete_save,
            mods::list_mods,
            mods::read_mod_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
