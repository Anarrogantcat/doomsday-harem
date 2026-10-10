// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod save;
mod mods;
mod data;

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
            mods::set_mod_enabled,
            mods::read_mod_file,
            mods::list_mod_files,
            mods::open_mods_dir,
            data::get_data_layout,
            data::open_data_dir,
            data::set_data_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}