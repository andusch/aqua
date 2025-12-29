use tauri::menu::{
    Menu, PredefinedMenuItem, Submenu, MenuItemBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri::{AppHandle, Emitter, Manager, generate_context, generate_handler, Builder};

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
            tokio::fs::read_to_string(path_str)
                .await
                .map_err(|e| e.to_string())
        }
        None => Err("cancelled".into()),
    }
}

#[tauri::command]
async fn save_file(_app: AppHandle, path: String, content: String) -> Result<(), String> {
    tokio::fs::write(path, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn clipboard_write(text: String, app: AppHandle) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn clipboard_read(app: AppHandle) -> Result<String, String> {
    app.clipboard()
        .read_text()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            /* ----------  File menu  ---------- */
            let new_mi = MenuItemBuilder::new("New")
                .id("new")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open_mi = MenuItemBuilder::new("Open…")
                .id("open")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save_mi = MenuItemBuilder::new("Save")
                .id("save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_mi,
                    &PredefinedMenuItem::separator(app)?,
                    &open_mi,
                    &save_mi,
                ],
            )?;

            /* ----------  Edit menu  ---------- */
            let undo_mi = MenuItemBuilder::new("Undo")
                .id("undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo_mi = MenuItemBuilder::new("Redo")
                .id("redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;
            let cut_mi = MenuItemBuilder::new("Cut")
                .id("cut")
                .accelerator("CmdOrCtrl+X")
                .build(app)?;
            let copy_mi = MenuItemBuilder::new("Copy")
                .id("copy")
                .accelerator("CmdOrCtrl+C")
                .build(app)?;
            let paste_mi = MenuItemBuilder::new("Paste")
                .id("paste")
                .accelerator("CmdOrCtrl+V")
                .build(app)?;
            let select_all_mi = MenuItemBuilder::new("Select All")
                .id("select-all")
                .accelerator("CmdOrCtrl+A")
                .build(app)?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo_mi,
                    &redo_mi,
                    &PredefinedMenuItem::separator(app)?,
                    &cut_mi,
                    &copy_mi,
                    &paste_mi,
                    &PredefinedMenuItem::separator(app)?,
                    &select_all_mi,
                ],
            )?;

            let menu = Menu::with_items(app, &[&file_menu, &edit_menu])?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                /* file actions */
                let _ = match event.id().as_ref() {
                    "new"  => win.emit("menu-new",  ()),
                    "open" => win.emit("menu-open", ()),
                    "save" => win.emit("menu-save", ()),
                    _ => Ok(()),
                };
                /* clipboard / edit actions */
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
        .invoke_handler(generate_handler![
            open_file,
            save_file,
            clipboard_read,
            clipboard_write
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}