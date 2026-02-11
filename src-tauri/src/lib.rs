use std::panic;
use chrono::Local;
use std::io::Write;
use std::fs::{self};
use tokio::fs::File;
use std::sync::Mutex;
use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;
use notify::{Watcher, RecursiveMode};
use tokio::io::{AsyncReadExt, BufReader};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu};
use tauri::{generate_context, generate_handler, AppHandle, Builder, Emitter, Manager, Window};

#[derive(serde::Serialize, Clone)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}

#[derive(serde::Serialize)]
struct FolderResult {
    path: String,
    tree: Vec<FileNode>,
}

#[derive(serde::Serialize)]
struct OpenedFile {
    path: String,
    content: String,
}

#[derive(Clone, serde::Serialize)]
struct FileChunk {
    content: String,
    is_last: bool,
}

struct WatcherState(Mutex<Option<notify::RecommendedWatcher>>);

#[tauri::command]
async fn pick_file(app: AppHandle) -> Result<Option<String>, String> {

    let path = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_pick_file()    
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => Ok(Some(p.to_string())),
        None => Ok(None),
    }

}

#[tauri::command]
async fn read_file_chunked(window: Window, path: String) -> Result<(), String> {

    let file = File::open(&path).await.map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let mut buffer = [0; 65536]; // 64KB buffer

    loop {
        
        let bytes_read = reader.read(&mut buffer).await.map_err(|e| e.to_string())?;

        // EOF
        if bytes_read == 0 { 
            window.emit("file-chunk", FileChunk {
                content: "".to_string(),
                is_last: true,
            }).map_err(|e| e.to_string())?;
            break;
        }

        let chunk_str = String::from_utf8_lossy(&buffer[..bytes_read]).to_string();

        window.emit("file-chunk", FileChunk {
            content: chunk_str,
            is_last: false,
        }).map_err(|e| e.to_string())?;

    }

    Ok(())

}

fn read_dir_recursive(path: &Path) -> Vec<FileNode> {
    let mut nodes = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();

            if name.starts_with('.') {
                continue;
            }

            if p.is_dir() {
                let children = read_dir_recursive(&p);
                nodes.push(FileNode {
                    name,
                    path: p.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(children),
                });
            }
            else if p.extension().map_or(false, |ext| ext == "md") {
                nodes.push(FileNode {
                    name,
                    path: p.to_string_lossy().to_string(),
                    is_dir: false,
                    children: None,
                });
            }
        }
    }

    nodes.sort_by(|a, b | {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    nodes

}

#[tauri::command]
async fn load_file(path: String) -> Result<String, String> {
    
    // Convert the string path to PathBuf
    let p = PathBuf::from(&path);

    // canonicalize
    let actual_path = p.canonicalize().map_err(|_| format!("File not found or invalid path: {}", path))?;

    fs::read_to_string(actual_path).map_err(|e| e.to_string())

}

// Saves content to a specified file path
#[tauri::command]
async fn save_file(_app: AppHandle, path: String, content: String) -> Result<(), String> {
    
    let p = PathBuf::from(&path);

    if let Some(parent) = p.parent() {
        parent.canonicalize().map_err(|_| "Invalid destination directory")?;
    }

    fs::write(p, content).map_err(|e| e.to_string())

}

#[tauri::command]
async fn open_folder_and_list_files(app: AppHandle) -> Result<FolderResult, String> {
    
    let app_for_dialog = app.clone();
    
    let folder_path = tokio::task::spawn_blocking(move || {
        app_for_dialog.dialog()
            .file()
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    match folder_path {
        Some(path) => {
            let path_string = path.to_string();
            let path_buf = std::path::PathBuf::from(&path_string);

            // Set-up Watcher
            let app_handle = app.clone();
            let path_to_watch = path_buf.clone();

            let mut watcher = notify::recommended_watcher(move | res | {
                match res {
                    Ok(_) => { let _ = app_handle.emit("refresh-files", ()); },
                    Err(e) => println!("watch error: {:?}", e),
                }
            }).map_err(|e| e.to_string())?;

            // Changed to Recursive watching
            watcher.watch(&path_to_watch, RecursiveMode::Recursive).map_err(|e| e.to_string())?;

            let state = app.state::<WatcherState>();
            let mut managed_watch = state.0.lock().unwrap();
            *managed_watch = Some(watcher);

            let tree = read_dir_recursive(&path_buf);

            Ok(FolderResult { path: path_string, tree: tree })
        }
        None => Err("cancelled".into()),
    }
}

#[tauri::command]
fn get_directory_tree(path: String) -> Result<Vec<FileNode>, String> {
    let p = Path::new(&path);
    if p.exists() && p.is_dir() {
        Ok(read_dir_recursive(p))
    } else {
        Err("Invalid directory path".into())
    }
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
fn log_crash(message: String){
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("crash.log") 
    {
        let _ = writeln!(
            file,
            "[{}][UI_ERROR] {}",
            Local::now().format("%Y-%m-%d %H:%M:%S"),
            message
        );
    }
}

// Sets up the Tauri application with menus and command handlers
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    panic::set_hook(Box::new(|info| {

        let location = info.location().unwrap_or_else(|| panic!("Panic location unknown"));
        let msg = match info.payload().downcast_ref::<&str>() {
            Some(s) => *s,
            None => match info.payload().downcast_ref::<String>() {
                Some(s) => &s[..],
                None => "Box<Any>",
            }
        };

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open("crash.log") 
        {
            let _ = writeln!(
                file,
                "[{}][PANIC] {} at {}:{}",
                Local::now().format("%Y-%m-%d %H:%M:%S"),
                msg,
                location.file(),
                location.line(),
            );
        }

    }));

    Builder::default()
        .manage(WatcherState(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
                    &MenuItemBuilder::new("Export as HTML")
                        .id("menu-export-html")
                        .accelerator("CmdOrCtrl+E")
                        .build(app)?,
                    &MenuItemBuilder::new("Print to PDF")
                        .id("menu-print-pdf")
                        .accelerator("CmdOrCtrl+P")
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
                    "menu-export-html" => win.emit("menu-export-html", ()),
                    "menu-print-pdf" => win.emit("menu-print-pdf", ()),
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
        .invoke_handler(generate_handler![
            open_file,
            save_file,
            save_file_dialog,
            clipboard_write,
            clipboard_read,
            load_file,
            open_folder_and_list_files,
            get_directory_tree,
            read_file_chunked,
            pick_file,
            log_crash,
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}
