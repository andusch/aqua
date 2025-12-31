// Tauri imports
use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu};
use tauri_plugin_dialog::DialogExt;
use tauri::{AppHandle, Emitter, generate_context, generate_handler, Builder, Manager};

// Open File dialog and read file contents
#[tauri::command]
async fn open_file(app: AppHandle) -> Result<String, String> {
    let path = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_str = p.to_string();
            tokio::fs::read_to_string(path_str).await.map_err(|e| e.to_string())
        }
        None => Err("cancelled".into()),
    }
}

// Save file contents to specified path
#[tauri::command]
async fn save_file(_app: AppHandle, path: String, content: String) -> Result<(), String> {
    tokio::fs::write(path, content).await.map_err(|e| e.to_string())
}

// Main entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // File Menu (Work in Progress)
            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItemBuilder::new("New")
                        .id("new")
                        .accelerator("CmdOrCtrl+N")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Open…")
                        .id("open")
                        .accelerator("CmdOrCtrl+O")
                        .build(app)?,
                    &MenuItemBuilder::new("Save")
                        .id("save")
                        .accelerator("CmdOrCtrl+S")
                        .build(app)?,
                ],
            )?;

            // Edit menu (gives native undo/cut/copy/paste/select-all)
            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &MenuItemBuilder::new("Undo")
                        .id("undo")
                        .accelerator("CmdOrCtrl+Z")
                        .build(app)?,
                    &MenuItemBuilder::new("Redo")
                        .id("redo")
                        .accelerator("CmdOrCtrl+Shift+Z")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Cut")
                        .id("cut")
                        .accelerator("CmdOrCtrl+X")
                        .build(app)?,
                    &MenuItemBuilder::new("Copy")
                        .id("copy")
                        .accelerator("CmdOrCtrl+C")
                        .build(app)?,
                    &MenuItemBuilder::new("Paste")
                        .id("paste")
                        .accelerator("CmdOrCtrl+V")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Select All")
                        .id("select-all")
                        .accelerator("CmdOrCtrl+A")
                        .build(app)?,
                ],
            )?;

            let menu = Menu::with_items(app, &[&file_menu, &edit_menu])?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                // file actions (work in progress)
                let _ = match event.id().as_ref() {
                    "new"  => win.emit("menu-new",  ()),
                    "open" => win.emit("menu-open", ()),
                    "save" => win.emit("menu-save", ()),
                    _ => Ok(()),
                };
                // edit actions
                let _ = match event.id().as_ref() {
                    "undo"  => win.emit("undo",  ()),
                    "redo"  => win.emit("redo",  ()),
                    "cut"   => win.emit("cut",   ()),
                    "copy"  => win.emit("copy",  ()),
                    "paste" => win.emit("paste", ()),
                    "select-all" => win.emit("select-all", ()),
                    _ => Ok(()),
                };
            }
        })
        .invoke_handler(generate_handler![open_file, save_file])
        .run(generate_context!())
        .expect("error while running tauri application");
}