// solid-js
import { Component, createSignal, createEffect, onMount, onCleanup } from "solid-js";
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

// file state store
import { fileState } from './store/fileState';
// styles
import "./styles/main.css";
// utils
import { exportToHtml, printToPdf } from './utils/export.ts';
// 
import { themeState } from './store/themeState.ts';
import StatusBar from "./components/StatusBar.tsx";

const App: Component = () => {
  
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");

  // Update window title on file path or modified changeb
  createEffect(() => {
    const name = fileState.path()?.split(/[/\\]/).pop() || 'Untitled.md';
    const flag = fileState.modified() ? ' ●' : '';
    try { getCurrentWindow().setTitle(`${name}${flag} - Aqua`); } catch {}
  });

  onMount(async() => {

    console.log("App mounted, setting up menu listeners.");
    
    const unlistenHtml = await listen("menu-export-html", () => {
      console.log("Export to HTML menu item clicked.");
      const previewEl = document.querySelector('.preview');
      if (previewEl) {
        exportToHtml(previewEl.innerHTML, "document");
      }
      else {
        console.error("Preview element not found for export.");
      }
    });

    const unlistenPdf = await listen("menu-print-pdf", () => {
      console.log("Print to PDF menu item clicked.");
      printToPdf();
    });

    onCleanup(() => {
      unlistenHtml();
      unlistenPdf();
    });

  });

  // Handle file selection from sidebar
  const handleFileSelect = async (path: string) => {

    const content = await invoke<string>('load_file', {path});
    setMd(content);
    fileState.setPath(path);
    fileState.setModified(false);

  }
  
  return (
    <div class="app-container">
    <div class="app">
      <Sidebar onFileSelect={handleFileSelect} />
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
            <Preview markdown={md()} />
          </Resizable.Panel>
        </Resizable>
      </div>
    </div>

    <StatusBar content={md()} />

    </div>
  );
};

export default App;