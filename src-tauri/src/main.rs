// src-tauri/src/main.rs

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{command, generate_context, generate_handler, Builder, Manager, State};

#[command]
async fn open_file() -> Result<String, String> {
    let path = tauri::dialog::FileDialogBuilder::new()
        .add_filter("Markdown", &["md"])
        .pick_file();
    match path {
        Some(p) => tauri::fs::read_to_string(p)
            .await
            .map_err(|e| e.to_string()),
        None => Err("cancelled".into()),
    }
}

#[command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    tauri::fs::write(path, content)
        .await
        .map_err(|e| e.to_string())
}

#[tokio::main]
async fn main() {
    let menu = Menu::new()
        .add_submenu(&Submenu::new(
            "File",
            Menu::new()
                .add_item(&MenuItem::new("New", "new"))
                .add_native_item(tauri::menu::MenuItem::Separator)
                .add_item(&MenuItem::new("Open…", "open"))
                .add_item(&MenuItem::new("Save", "save")),
        ));

    Builder::default()
        .menu(menu)
        .on_menu_event(|app, event| {
            let win = app.get_webview_window("main").unwrap();
            match event.id.as_ref() {
                "new"  => win.emit("menu-new", ()).unwrap(),
                "open" => win.emit("menu-open", ()).unwrap(),
                "save" => win.emit("menu-save", ()).unwrap(),
                _ => {}
            }
        })
        .invoke_handler(generate_handler![open_file, save_file])
        .run(generate_context!())
        .expect("error while running tauri application");
}