// solid-js
import { Component, createSignal, createEffect, onMount, onCleanup, Show, ErrorBoundary } from "solid-js";
// Resizable import
import Resizable from '@corvu/resizable';

// Tauri import
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// components
import Editor from "./components/Editor.tsx";
import Preview from "./components/Preview.tsx";
import Sidebar from "./components/Sidebar.tsx";
import ToastContainer from "./components/ToastContainer.tsx";

// file loading utility
import { loadFileChunked } from "./utils/fileLoader.ts";
// file state store
import { fileState } from './store/fileState';
// styles
import "./styles/main.css";
// utils
import { printToPdf } from './utils/export.ts';
import { showError } from './utils/errors.ts';
import { toastState } from './store/toastState.ts';
// status bar
import StatusBar from "./components/StatusBar.tsx";

const PreviewErrorFallback = (err: Error) => (
  <div class="preview-error-fallback">
    <p>Preview failed to render: {err.message}</p>
  </div>
);

const App: Component = () => {
  
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");
  const [showSidebar, setShowSidebar] = createSignal(true);

  createEffect(() => {
    const name = fileState.path()?.split(/[/\\]/).pop() || 'Untitled.md';
    try { getCurrentWindow().setTitle(`${name} - Aqua`); } catch (error) { console.error("Failed to set window title:", error); }
  });

  onMount(() => {

    let unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      
      const u1 = await listen("menu-print-pdf", () => {
        const content = md();
        printToPdf(content);
      });

      const u2 = await listen("menu-toggle-sidebar", () => {
        setShowSidebar(!showSidebar());
      });

      const u3 = await listen<{ level: string; message: string }>("app-toast", (event) => {
        const { level, message } = event.payload;
        const variant = level === 'error' ? 'error' : level === 'success' ? 'success' : 'info';
        toastState.push(message, variant);
      });

      const u4 = await listen<string>("open-file-path", async (event) => {
        const path = event.payload;
        try {
          const content = await loadFileChunked(path);
          setMd(content);
          fileState.setPath(path);
          fileState.setModified(false);
        } catch (error) {
          showError(error, 'Failed to open file');
        }
      });

      unlisteners.push(u1, u2, u3, u4);

    };

    window.addEventListener('unhandledrejection', (event) => {
      const errorMsg = `[JS-UI] Unhandled Promise Rejection: ${event.reason}`;
      invoke('log_crash', { message: errorMsg }).catch(() => {});
    })

    window.onerror = (msg, url, line, col, error) => {
      const errorMsg = `[JS-UI] Error: ${msg} at ${url}:${line}:${col}`;
      invoke('log_crash', { message: errorMsg }).catch(() => {});
      return false;
    };

    setupListeners();
    
    onCleanup(() => {
      unlisteners.forEach(u => u());
    });

  });

  const handleFileSelect = async (path: string) => {
    try {
      const content = await loadFileChunked(path);
      setMd(content);
      fileState.setPath(path);
      fileState.setModified(false);
    } catch (error) {
      showError(error, 'Failed to load file');
    }
  }
  
  return (
    <div class="app-container">
    <ToastContainer />
    <div class="app">
      <Show when={showSidebar()}>
        <Sidebar onFileSelect={handleFileSelect} />
      </Show>

      <div class="main-content">
        <Resizable class="resizable-container">
          <Resizable.Panel
            initialSize={0.5}
            minSize={0.2}
            class="editor-panel"
          >
            <Editor value={md()} onChange={setMd} />
          </Resizable.Panel>
          
          <Resizable.Handle
            aria-label="Resize Handle"
            class="resize-handle"
          >
            <div class="resize-indicator" />
          </Resizable.Handle>
          
          <Resizable.Panel
            initialSize={0.5}
            minSize={0.2}
            class="preview-panel"
          >
            <ErrorBoundary fallback={PreviewErrorFallback}>
              <Preview markdown={md()} />
            </ErrorBoundary>
          </Resizable.Panel>
        </Resizable>
      </div>
    </div>

    <StatusBar content={md()} />

    </div>
  );
};

export default App;
