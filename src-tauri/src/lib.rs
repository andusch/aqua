use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu};
use tauri::{generate_context, generate_handler, AppHandle, Builder, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::fs;

#[derive(serde::Serialize)]
struct OpenedFile {
    path: String,
    content: String,
}

// Opens a file dialog to select a markdown file and reads its content
#[tauri::command]
async fn open_file(app: AppHandle) -> Result<OpenedFile, String> {

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
            let content_str = tokio::fs::read_to_string(&path_str)
                .await
                .map_err(|e| e.to_string())?;
            Ok(OpenedFile {
                path: path_str,
                content: content_str,
            })
        }
        None => Err("cancelled".into()),
    }
    
}

// Saves content to a specified file path
#[tauri::command]
async fn save_file(_app: AppHandle, path: String, content: String) -> Result<(), String> {
    tokio::fs::write(path, content)
        .await
        .map_err(|e| e.to_string())
}

// Opens a save file dialog and saves the provided text to the selected file
#[tauri::command]
async fn save_file_dialog(app: AppHandle, text: String) -> Result<String, String> {
    let path = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_str = p.to_string();
            tokio::fs::write(&path_str, text).await.map_err(|e| e.to_string())?;
            Ok(path_str)
        }
        None => Err("cancelled".into()),
    }
}

// Writes text to clipboard
#[tauri::command]
async fn clipboard_write(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

// Reads text from clipboard
#[tauri::command]
async fn clipboard_read(app: AppHandle) -> Result<String, String> {
    app.clipboard()
        .read_text()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_file_tree(app: AppHandle) -> Result<Vec<String>, String> {
    // Change app_data_dir() to document_dir() to see actual user files
    let current_dir = app.path().document_dir().map_err(|e| e.to_string())?;

    let mut file_tree = Vec::new();
    let entries = fs::read_dir(current_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            let is_md = path.extension().map_or(false, |ext| ext == "md");
            
            if path.is_file() && is_md {
                if let Some(path_str) = path.to_str() {
                    file_tree.push(path_str.to_string());
                }
            }
        }
    }
    Ok(file_tree)
}

#[tauri::command]
async fn load_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_folder_and_list_files(app: AppHandle) -> Result<Vec<String>, String> {
    let folder_path = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    match folder_path {
        Some(path) => {
            // FIX: Convert FilePath to a String, then to a PathBuf
            let path_string = path.to_string();
            let path_buf = std::path::PathBuf::from(path_string);
            
            let mut file_tree = Vec::new();
            
            // Read the selected directory
            let entries = fs::read_dir(path_buf).map_err(|e| e.to_string())?;

            for entry in entries {
                if let Ok(entry) = entry {
                    let p = entry.path();
                    if p.is_file() && p.extension().map_or(false, |ext| ext == "md") {
                        if let Some(path_str) = p.to_str() {
                            file_tree.push(path_str.to_string());
                        }
                    }
                }
            }
            Ok(file_tree)
        }
        None => Err("cancelled".into()),
    }
}

// Sets up the Tauri application with menus and command handlers
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
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

            app.set_menu(Menu::with_items(app, &[&file_menu, &edit_menu])?)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = match event.id().as_ref() {
                    "new" => win.emit("menu-new", ()),
                    "open" => win.emit("menu-open", ()),
                    "save" => win.emit("menu-save", ()),
                    "undo" => win.emit("undo", ()),
                    "redo" => win.emit("redo", ()),
                    "cut" => win.emit("cut", ()),
                    "copy" => win.emit("copy", ()),
                    "paste" => win.emit("paste", ()),
                    "select-all" => win.emit("select-all", ()),
                    _ => Ok(()),
                };
            }
        })
        .invoke_handler(generate_handler![open_file, save_file, save_file_dialog, clipboard_write, clipboard_read, get_file_tree, load_file, open_folder_and_list_files])
        .run(generate_context!())
        .expect("error while running tauri application");
}
