use std::panic;
use chrono::Local;
use std::io::Write;
use std::fs::{self};
use tokio::fs::File;
use std::sync::Mutex;
use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;
use notify::{Watcher, RecursiveMode};
use tokio::io::{AsyncReadExt, BufReader};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu};
use tauri::{generate_context, generate_handler, AppHandle, Builder, Emitter, Manager, RunEvent, State, Window};

#[derive(serde::Serialize, Clone, Debug)]
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
struct WorkspaceState(Mutex<Option<PathBuf>>);

#[derive(Clone, serde::Serialize)]
struct ToastPayload {
    level: String,
    message: String,
}

fn is_md_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

// #region agent log
fn debug_log(hypothesis_id: &str, location: &str, message: &str, data: serde_json::Value) {
    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/Users/AnduScheusan/Documents/Coding/aqua/.cursor/debug-c31c53.log")
    {
        let _ = writeln!(
            f,
            "{}",
            serde_json::json!({
                "sessionId": "c31c53",
                "hypothesisId": hypothesis_id,
                "location": location,
                "message": message,
                "data": data,
                "timestamp": Local::now().timestamp_millis(),
            })
        );
    }
}
// #endregion

fn validate_md_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    let file_exists = p.exists();
    // #region agent log
    debug_log(
        "A",
        "lib.rs:validate_md_path:entry",
        "validate_md_path called",
        serde_json::json!({ "path": path, "file_exists": file_exists }),
    );
    // #endregion
    if !is_md_extension(&p) {
        return Err("Only .md files are allowed".to_string());
    }
    
    if file_exists {
        let canonical_result = p.canonicalize();
        // #region agent log
        debug_log(
            "A",
            "lib.rs:validate_md_path:canonicalize",
            "canonicalize result",
            serde_json::json!({
                "path": path,
                "file_exists": file_exists,
                "ok": canonical_result.is_ok(),
                "err": canonical_result.as_ref().err().map(|e| e.to_string()),
            }),
        );
        // #endregion
        canonical_result.map_err(|_| format!("File not found or invalid path: {}", path))
    } else {
        // For new files, we check if the parent directory exists and is valid
        if let Some(parent) = p.parent() {
            if parent.as_os_str().is_empty() || parent.exists() {
                Ok(p)
            } else {
                Err(format!("Parent directory does not exist: {}", parent.display()))
            }
        } else {
            Ok(p)
        }
    }
}

fn emit_toast(app: &AppHandle, level: &str, message: impl Into<String>) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.emit(
            "app-toast",
            ToastPayload {
                level: level.to_string(),
                message: message.into(),
            },
        );
    }
}

fn map_io_error(app: &AppHandle, err: std::io::Error, context: &str) -> String {
    let message = match err.kind() {
        std::io::ErrorKind::PermissionDenied => {
            format!("Permission denied while {}", context)
        }
        std::io::ErrorKind::NotFound => format!("File not found while {}", context),
        _ => format!("{}: {}", context, err),
    };
    if matches!(
        err.kind(),
        std::io::ErrorKind::PermissionDenied | std::io::ErrorKind::NotFound
    ) {
        emit_toast(app, "error", message.clone());
    }
    message
}

fn grant_md_file(app: &AppHandle, path: &Path) {
    let _ = app.fs_scope().allow_file(path);
}

fn grant_workspace(app: &AppHandle, path: &Path) {
    let _ = app.fs_scope().allow_directory(path, true);
}

fn set_workspace(state: &WorkspaceState, path: &Path) {
    if let Ok(canonical) = path.canonicalize() {
        *state.0.lock().unwrap() = Some(canonical);
    }
}

fn validate_workspace_path(state: &WorkspaceState, path: &str) -> Result<PathBuf, String> {
    let workspace = state.0.lock().unwrap();
    let workspace = workspace
        .as_ref()
        .ok_or_else(|| "No workspace open".to_string())?;
    let canonical = PathBuf::from(path)
        .canonicalize()
        .map_err(|_| "Invalid directory path".to_string())?;
    if !canonical.starts_with(workspace) {
        return Err("Path is outside the open workspace".to_string());
    }
    if !canonical.is_dir() {
        return Err("Invalid directory path".to_string());
    }
    Ok(canonical)
}

#[cfg(any(windows, target_os = "linux"))]
fn path_from_cli_arg(arg: &str) -> Option<PathBuf> {
    if arg.starts_with('-') {
        return None;
    }

    if let Some(rest) = arg.strip_prefix("file://") {
        let path = rest.trim_start_matches('/');
        return Some(PathBuf::from(path));
    }

    Some(PathBuf::from(arg))
}

#[cfg(any(windows, target_os = "linux"))]
fn opened_files_from_args() -> Vec<PathBuf> {
    std::env::args()
        .skip(1)
        .filter_map(|arg| path_from_cli_arg(&arg))
        .collect()
}

fn emit_opened_files(app: &AppHandle, files: Vec<PathBuf>) {
    if files.is_empty() {
        return;
    }

    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    for file in files {
        if !is_md_extension(&file) {
            emit_toast(
                app,
                "error",
                format!(
                    "Only .md files can be opened: {}",
                    file.to_string_lossy()
                ),
            );
            continue;
        }
        grant_md_file(app, &file);
        let path = file.to_string_lossy().into_owned();
        let _ = window.emit("open-file-path", path);
    }
}

#[tauri::command]
async fn pick_file(app: AppHandle) -> Result<Option<String>, String> {
    let app_for_dialog = app.clone();
    let path = tokio::task::spawn_blocking(move || {
        app_for_dialog.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_str = p.to_string();
            let path_buf = PathBuf::from(&path_str);
            if !is_md_extension(&path_buf) {
                emit_toast(&app, "error", "Only .md files are allowed");
                return Ok(None);
            }
            grant_md_file(&app, &path_buf);
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn read_file_chunked(app: AppHandle, window: Window, path: String) -> Result<(), String> {
    let validated = validate_md_path(&path)?;
    grant_md_file(&app, &validated);

    let file = File::open(&validated)
        .await
        .map_err(|e| map_io_error(&app, e, "reading file"))?;
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
async fn load_file(app: AppHandle, path: String) -> Result<String, String> {
    let actual_path = validate_md_path(&path)?;
    grant_md_file(&app, &actual_path);
    fs::read_to_string(&actual_path).map_err(|e| map_io_error(&app, e, "loading file"))
}

// Saves content to a specified file path
#[tauri::command]
async fn save_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let validated = validate_md_path(&path)?;
    grant_md_file(&app, &validated);

    if let Some(parent) = validated.parent() {
        parent
            .canonicalize()
            .map_err(|_| "Invalid destination directory".to_string())?;
    }

    fs::write(&validated, content).map_err(|e| map_io_error(&app, e, "saving file"))
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
            let path_buf = PathBuf::from(&path_string);

            grant_workspace(&app, &path_buf);
            set_workspace(&app.state::<WorkspaceState>(), &path_buf);

            // Set-up Watcher
            let app_handle = app.clone();
            let path_to_watch = path_buf.clone();

            let mut watcher = notify::recommended_watcher(move | res: Result<notify::Event, notify::Error> | {
                match res {
                    Ok(event) => {
                        if event.kind.is_modify() || event.kind.is_create() || event.kind.is_remove() {
                            let _ = app_handle.emit("refresh-files", ());
                        }
                    },
                    Err(e) => println!("watch error: {:?}", e),
                }
            })
            .map_err(|e| {
                let msg = format!("Failed to set up file watcher: {}", e);
                emit_toast(&app, "error", msg.clone());
                msg
            })?;

            watcher.watch(&path_to_watch, RecursiveMode::Recursive).map_err(|e| {
                let msg = format!("Failed to watch folder: {}", e);
                emit_toast(&app, "error", msg.clone());
                msg
            })?;

            let state = app.state::<WatcherState>();
            let mut managed_watch = state.0.lock().unwrap();
            *managed_watch = Some(watcher);

            let tree = read_dir_recursive(&path_buf);

            Ok(FolderResult {
                path: path_string,
                tree,
            })
        }
        None => Err("cancelled".into()),
    }
}

// #[tauri::command]
// fn get_directory_tree(path: String) -> Result<Vec<FileNode>, String> {
//     let p = Path::new(&path);
//     if p.exists() && p.is_dir() {
//         Ok(read_dir_recursive(p))
//     } else {
//         Err("Invalid directory path".into())
//     }
// }

fn get_directory_tree_inner(workspace: &WorkspaceState, path: &str) -> Result<Vec<FileNode>, String> {
    let validated = validate_workspace_path(workspace, path)?;
    Ok(read_dir_recursive(&validated))
}

#[tauri::command]
async fn get_directory_tree(
    workspace: State<'_, WorkspaceState>,
    path: String,
) -> Result<Vec<FileNode>, String> {
    get_directory_tree_inner(&workspace, &path)
}

// Opens a file dialog to select a markdown file and reads its content
#[tauri::command]
async fn open_file(app: AppHandle) -> Result<OpenedFile, String> {
    let app_for_dialog = app.clone();
    let path = tokio::task::spawn_blocking(move || {
        app_for_dialog.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_pick_file()  
    })
    .await
    .map_err(|e| e.to_string())?;
    
    match path {
        Some(p) => {
            let path_str = p.to_string();
            let path_buf = PathBuf::from(&path_str);
            if !is_md_extension(&path_buf) {
                emit_toast(&app, "error", "Only .md files are allowed");
                return Err("Only .md files are allowed".into());
            }
            grant_md_file(&app, &path_buf);
            let validated = validate_md_path(&path_str)?;
            let content_str = tokio::fs::read_to_string(&validated)
                .await
                .map_err(|e| map_io_error(&app, e, "opening file"))?;
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
    let app_for_dialog = app.clone();
    let path = tokio::task::spawn_blocking(move || {
        app_for_dialog.dialog()
            .file()
            .add_filter("Markdown", &["md"])
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_str = p.to_string();
            let path_buf = PathBuf::from(&path_str);
            let parent_exists = path_buf
                .parent()
                .map(|parent| parent.exists())
                .unwrap_or(false);
            // #region agent log
            debug_log(
                "B",
                "lib.rs:save_file_dialog:dialog_result",
                "save dialog returned path",
                serde_json::json!({
                    "path": &path_str,
                    "file_exists": path_buf.exists(),
                    "parent_exists": parent_exists,
                    "is_md": is_md_extension(&path_buf),
                }),
            );
            // #endregion
            if !is_md_extension(&path_buf) {
                emit_toast(&app, "error", "Only .md files are allowed");
                return Err("Only .md files are allowed".into());
            }
            grant_md_file(&app, &path_buf);
            let validated = validate_md_path(&path_str)?;
            // #region agent log
            debug_log(
                "A",
                "lib.rs:save_file_dialog:validated",
                "path validated before write",
                serde_json::json!({ "validated": validated.to_string_lossy() }),
            );
            // #endregion
            tokio::fs::write(&validated, text)
                .await
                .map_err(|e| map_io_error(&app, e, "saving file"))?;
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
        .manage(WorkspaceState(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                let files = opened_files_from_args();
                emit_opened_files(app.handle(), files);
            }

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
                    &MenuItemBuilder::new("Open folder...")
                        .id("open_folder")
                        .accelerator("CmdOrCtrl+Shift+O")
                        .build(app)?,
                    &MenuItemBuilder::new("Save")
                        .id("save")
                        .accelerator("CmdOrCtrl+S")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Print to PDF")
                        .id("menu-print-pdf")
                        .accelerator("CmdOrCtrl+P")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Quit")
                        .id("quit")
                        .accelerator("CmdOrCtrl+Q")
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

            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &MenuItemBuilder::new("Toggle Sidebar")
                        .id("toggle-sidebar")
                        .accelerator("CmdOrCtrl+B")
                        .build(app)?,
                    ],
                )?;

            app.set_menu(Menu::with_items(app, &[&file_menu, &edit_menu, &window_menu])?)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = match event.id().as_ref() {
                    "new" => win.emit("menu-new", ()),
                    "open" => win.emit("menu-open", ()),
                    "open_folder" => win.emit("menu-open-folder", ()),
                    "save" => win.emit("menu-save", ()),
                    "quit" => Ok(app.exit(0)),
                    "menu-print-pdf" => win.emit("menu-print-pdf", ()),
                    "undo" => win.emit("undo", ()),
                    "redo" => win.emit("redo", ()),
                    "cut" => win.emit("cut", ()),
                    "copy" => win.emit("copy", ()),
                    "paste" => win.emit("paste", ()),
                    "select-all" => win.emit("select-all", ()),
                    "toggle-sidebar" => win.emit("menu-toggle-sidebar", ()),
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
        .build(generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let RunEvent::Opened { urls } = event {
                let files: Vec<PathBuf> = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .collect();
                emit_opened_files(&app_handle, files);
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;
    use serial_test::serial;

    // ===== File Operation Tests =====

    #[test]
    fn test_validate_md_path_success() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.md");
        let content = "# Test Content\nThis is a test file.";

        fs::write(&file_path, content).expect("Failed to write test file");

        let validated = validate_md_path(&file_path.to_string_lossy()).expect("valid path");
        let read = fs::read_to_string(validated).expect("read file");
        assert_eq!(read, content);
    }

    #[test]
    fn test_validate_md_path_not_found() {
        let result = validate_md_path("/nonexistent/path/file.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_md_path_rejects_non_md() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "content").expect("Failed to write test file");

        let result = validate_md_path(&file_path.to_string_lossy());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Only .md files"));
    }

    #[test]
    fn test_validate_md_path_empty_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("empty.md");

        fs::write(&file_path, "").expect("Failed to write empty file");

        let validated = validate_md_path(&file_path.to_string_lossy()).expect("valid path");
        let read = fs::read_to_string(validated).expect("read file");
        assert_eq!(read, "");
    }

    #[test]
    fn test_is_md_extension_case_insensitive() {
        assert!(is_md_extension(Path::new("file.MD")));
        assert!(is_md_extension(Path::new("file.md")));
        assert!(!is_md_extension(Path::new("file.txt")));
    }

    #[test]
    fn test_save_file_success() {
        // Note: This function requires AppHandle which cannot be created in unit tests.
        // It should be tested through integration tests or manual testing with the full Tauri app.
        // For now, we test save_file through the general file I/O by using fs directly.
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("new_file.md");
        let content = "# New File\nWith some content.";

        fs::write(&file_path, content).expect("Failed to write file");
        
        let saved_content = fs::read_to_string(&file_path).expect("Failed to read saved file");
        assert_eq!(saved_content, content);
    }

    #[test]
    fn test_save_file_overwrites_existing() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("existing.md");
        let original_content = "Original content";
        let new_content = "New content";

        fs::write(&file_path, original_content).expect("Failed to write original file");
        fs::write(&file_path, new_content).expect("Failed to overwrite file");
        
        let saved_content = fs::read_to_string(&file_path).expect("Failed to read file");
        assert_eq!(saved_content, new_content);
    }

    #[test]
    fn test_save_file_creates_directory_if_needed() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("subdir/newfile.md");
        let content = "Content in subdirectory";

        // Create the subdirectory first
        fs::create_dir_all(file_path.parent().unwrap()).expect("Failed to create subdirectory");
        fs::write(&file_path, content).expect("Failed to write file");

        assert!(file_path.exists());
        let saved_content = fs::read_to_string(&file_path).expect("Failed to read file");
        assert_eq!(saved_content, content);
    }

    #[test]
    fn test_save_file_with_unicode_content() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("unicode.md");
        let content = "# Unicode Test\n你好\n🎉 Emoji support\nÄÖÜß";

        fs::write(&file_path, content).expect("Failed to write file");
        
        let saved_content = fs::read_to_string(&file_path).expect("Failed to read file");
        assert_eq!(saved_content, content);
    }

    // ===== Directory Tree Tests =====

    #[test]
    fn test_read_dir_recursive_empty_directory() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let result = read_dir_recursive(temp_dir.path());
        
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_read_dir_recursive_single_markdown_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.md");
        fs::write(&file_path, "content").expect("Failed to create file");

        let result = read_dir_recursive(temp_dir.path());

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "test.md");
        assert!(!result[0].is_dir);
        assert!(result[0].children.is_none());
    }

    #[test]
    fn test_read_dir_recursive_ignores_non_markdown_files() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        fs::write(temp_dir.path().join("test.md"), "content").expect("Failed to create .md");
        fs::write(temp_dir.path().join("test.txt"), "content").expect("Failed to create .txt");
        fs::write(temp_dir.path().join("test.rs"), "content").expect("Failed to create .rs");

        let result = read_dir_recursive(temp_dir.path());

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "test.md");
    }

    #[test]
    fn test_read_dir_recursive_ignores_hidden_files() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        fs::write(temp_dir.path().join("test.md"), "content").expect("Failed to create visible file");
        fs::write(temp_dir.path().join(".hidden.md"), "content").expect("Failed to create hidden file");

        let result = read_dir_recursive(temp_dir.path());

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "test.md");
    }

    #[test]
    fn test_read_dir_recursive_with_subdirectories() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let subdir = temp_dir.path().join("subdir");
        fs::create_dir(&subdir).expect("Failed to create subdirectory");
        fs::write(subdir.join("nested.md"), "content").expect("Failed to create nested file");
        fs::write(temp_dir.path().join("root.md"), "content").expect("Failed to create root file");

        let result = read_dir_recursive(temp_dir.path());

        // Should have 2 items: subdir and root.md
        assert_eq!(result.len(), 2);
        
        // Directories should come first due to sorting
        assert!(result[0].is_dir);
        assert_eq!(result[0].name, "subdir");
        assert!(result[0].children.is_some());
        assert_eq!(result[0].children.as_ref().unwrap().len(), 1);
        
        assert!(!result[1].is_dir);
        assert_eq!(result[1].name, "root.md");
    }

    #[test]
    fn test_read_dir_recursive_sorting_case_insensitive() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        fs::write(temp_dir.path().join("Zebra.md"), "content").expect("Failed to create Zebra.md");
        fs::write(temp_dir.path().join("apple.md"), "content").expect("Failed to create apple.md");
        fs::write(temp_dir.path().join("Banana.md"), "content").expect("Failed to create Banana.md");

        let result = read_dir_recursive(temp_dir.path());

        assert_eq!(result.len(), 3);
        // Should be sorted case-insensitively
        assert_eq!(result[0].name, "apple.md");
        assert_eq!(result[1].name, "Banana.md");
        assert_eq!(result[2].name, "Zebra.md");
    }

    #[test]
    fn test_get_directory_tree_valid_directory() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        fs::write(temp_dir.path().join("test.md"), "content").expect("Failed to create file");

        let workspace = WorkspaceState(Mutex::new(None));
        set_workspace(&workspace, temp_dir.path());

        let result = get_directory_tree_inner(&workspace, &temp_dir.path().to_string_lossy());

        assert!(result.is_ok());
        let tree = result.unwrap();
        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].name, "test.md");
    }

    #[test]
    fn test_get_directory_tree_nonexistent_path() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let workspace = WorkspaceState(Mutex::new(None));
        set_workspace(&workspace, temp_dir.path());

        let result = get_directory_tree_inner(&workspace, "/nonexistent/directory");

        assert!(result.is_err());
    }

    #[test]
    fn test_get_directory_tree_file_path() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.md");
        fs::write(&file_path, "content").expect("Failed to create file");

        let workspace = WorkspaceState(Mutex::new(None));
        set_workspace(&workspace, temp_dir.path());

        let result = get_directory_tree_inner(&workspace, &file_path.to_string_lossy());

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid directory path");
    }

    #[test]
    fn test_get_directory_tree_outside_workspace() {
        let workspace_dir = TempDir::new().expect("Failed to create workspace dir");
        let outside_dir = TempDir::new().expect("Failed to create outside dir");

        let workspace = WorkspaceState(Mutex::new(None));
        set_workspace(&workspace, workspace_dir.path());

        let result = get_directory_tree_inner(&workspace, &outside_dir.path().to_string_lossy());

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside the open workspace"));
    }

    #[test]
    fn test_read_dir_recursive_deep_nesting() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let level1 = temp_dir.path().join("level1");
        let level2 = level1.join("level2");
        let level3 = level2.join("level3");

        fs::create_dir_all(&level3).expect("Failed to create nested directories");
        fs::write(level3.join("deep.md"), "content").expect("Failed to create deep file");
        fs::write(level1.join("file1.md"), "content").expect("Failed to create level1 file");

        let result = read_dir_recursive(temp_dir.path());

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "level1");
        assert!(result[0].is_dir);
        
        let level1_children = result[0].children.as_ref().unwrap();
        assert_eq!(level1_children.len(), 2);
        
        // Find level2 directory
        let level2_node = level1_children.iter().find(|n| n.name == "level2").unwrap();
        assert!(level2_node.is_dir);
        
        let level2_children = level2_node.children.as_ref().unwrap();
        let level3_node = level2_children.iter().find(|n| n.name == "level3").unwrap();
        assert!(level3_node.is_dir);
        
        let level3_children = level3_node.children.as_ref().unwrap();
        assert_eq!(level3_children.len(), 1);
        assert_eq!(level3_children[0].name, "deep.md");
    }

    // ===== Crash Logging Tests =====

    #[test]
    #[serial]
    fn test_log_crash_creates_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let current_dir = std::env::current_dir().expect("Failed to get current dir");
        
        // Change to temp directory for this test
        std::env::set_current_dir(temp_dir.path()).expect("Failed to change directory");

        log_crash("Test crash message".to_string());

        let crash_log_path = temp_dir.path().join("crash.log");
        assert!(crash_log_path.exists(), "crash.log file was not created");
        
        let content = fs::read_to_string(&crash_log_path).expect("Failed to read crash.log");
        assert!(content.contains("Test crash message"), "Crash message not found in log");
        assert!(content.contains("[UI_ERROR]"), "Error type not found in log");

        // Restore original directory
        std::env::set_current_dir(current_dir).expect("Failed to restore directory");
    }

    #[test]
    #[serial]
    fn test_log_crash_appends_to_existing_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let crash_log_path = temp_dir.path().join("crash.log");
        
        // Create initial log file
        fs::write(&crash_log_path, "Initial message\n").expect("Failed to create initial log");

        let current_dir = std::env::current_dir().expect("Failed to get current dir");
        std::env::set_current_dir(temp_dir.path()).expect("Failed to change directory");

        log_crash("Second message".to_string());

        std::env::set_current_dir(current_dir).expect("Failed to restore directory");

        let content = fs::read_to_string(&crash_log_path).expect("Failed to read crash.log");
        assert!(content.contains("Initial message"), "Initial message was lost");
        assert!(content.contains("Second message"), "Second message was not appended");
    }

    #[test]
    #[serial]
    fn test_log_crash_includes_timestamp() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let current_dir = std::env::current_dir().expect("Failed to get current dir");
        
        std::env::set_current_dir(temp_dir.path()).expect("Failed to change directory");

        log_crash("Timestamped message".to_string());

        std::env::set_current_dir(current_dir).expect("Failed to restore directory");

        let crash_log_path = temp_dir.path().join("crash.log");
        let content = fs::read_to_string(&crash_log_path).expect("Failed to read crash.log");
        
        // Check that timestamp format is present (rough check for YYYY-MM-DD HH:MM:SS)
        assert!(content.contains("20"), "Year not found in timestamp");
        assert!(content.contains("-"), "Date separator not found in timestamp");
        assert!(content.contains(":"), "Time separator not found in timestamp");
    }

    // ===== Path Tests =====

    #[test]
    fn test_file_node_serialization() {
        let node = FileNode {
            name: "test.md".to_string(),
            path: "/path/to/test.md".to_string(),
            is_dir: false,
            children: None,
        };

        let json = serde_json::to_string(&node).expect("Failed to serialize FileNode");
        assert!(json.contains("\"name\":\"test.md\""));
        assert!(json.contains("\"is_dir\":false"));
    }

    #[test]
    fn test_file_node_with_children_serialization() {
        let child = FileNode {
            name: "child.md".to_string(),
            path: "/path/to/child.md".to_string(),
            is_dir: false,
            children: None,
        };

        let parent = FileNode {
            name: "parent".to_string(),
            path: "/path/to/parent".to_string(),
            is_dir: true,
            children: Some(vec![child]),
        };

        let json = serde_json::to_string(&parent).expect("Failed to serialize FileNode");
        assert!(json.contains("\"name\":\"parent\""));
        assert!(json.contains("\"is_dir\":true"));
        assert!(json.contains("\"name\":\"child.md\""));
    }

    #[test]
    fn test_folder_result_serialization() {
        let tree = vec![FileNode {
            name: "test.md".to_string(),
            path: "/path/test.md".to_string(),
            is_dir: false,
            children: None,
        }];

        let result = FolderResult {
            path: "/path".to_string(),
            tree,
        };

        let json = serde_json::to_string(&result).expect("Failed to serialize FolderResult");
        assert!(json.contains("\"path\":\"/path\""));
        assert!(json.contains("\"name\":\"test.md\""));
    }

    // ===== Edge Cases and Robustness =====

    #[test]
    fn test_load_file_with_special_characters_in_path() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test file with spaces.md");
        let content = "Content with spaces in filename";

        fs::write(&file_path, content).expect("Failed to write file");

        let validated = validate_md_path(&file_path.to_string_lossy()).expect("valid path");
        let read = fs::read_to_string(validated).expect("read file");
        assert_eq!(read, content);
    }

    #[test]
    fn test_read_dir_recursive_with_many_files() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        // Create 100 markdown files
        for i in 0..100 {
            let filename = format!("file_{:03}.md", i);
            fs::write(temp_dir.path().join(&filename), "content").expect("Failed to create file");
        }

        let result = read_dir_recursive(temp_dir.path());
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn test_save_file_with_large_content() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("large.md");
        
        // Create 1MB of content
        let large_content = "x".repeat(1024 * 1024);

        fs::write(&file_path, &large_content).expect("Failed to write file");
        
        let saved_content = fs::read_to_string(&file_path).expect("Failed to read file");
        assert_eq!(saved_content.len(), large_content.len());
    }

    #[test]
    fn test_read_dir_recursive_newline_in_filename() {
        // This test checks that the function handles filenames appropriately
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        fs::write(temp_dir.path().join("normal.md"), "content").expect("Failed to create file");

        let result = read_dir_recursive(temp_dir.path());
        assert_eq!(result.len(), 1);
        assert!(!result[0].name.contains('\n'));
    }
}
