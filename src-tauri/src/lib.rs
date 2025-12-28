use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{generate_context, generate_handler, AppHandle, Builder, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            /* ---------- File menu ---------- */
            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItem::with_id(app, "new", "New", true, None::<&str>).unwrap(),
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &MenuItem::with_id(app, "open", "Open…", true, None::<&str>).unwrap(),
                    &MenuItem::with_id(app, "save", "Save", true, None::<&str>).unwrap(),
                ],
            )?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[&MenuItem::with_id(app, "paste", "Paste", true, Some("Ctrl+V")).unwrap()],
            )?;

            let menu = Menu::with_items(app, &[&file_menu, &edit_menu])?;
            app.set_menu(menu)?;

            #[cfg(target_os = "linux")]
            if let Some(window) = app.get_webview_window("main") {
                use webkit2gtk::traits::*;
                window.with_webview(|w| {
                    w.settings().set_enable_write_clipboard(true);
                    w.settings().set_enable_read_clipboard(true);
                })?;
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = match event.id().as_ref() {
                    "new" => win.emit("menu-new", ()),
                    "open" => win.emit("menu-open", ()),
                    "save" => win.emit("menu-save", ()),
                    "paste" => win.eval(
                        "navigator.clipboard.readText().then(t => \
                         document.execCommand('insertText', false, t))",
                    ),
                    _ => Ok(()),
                };
            }
        })
        .invoke_handler(generate_handler![open_file, save_file])
        .run(generate_context!())
        .expect("error while running tauri application");
}