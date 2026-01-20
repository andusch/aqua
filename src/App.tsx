// solid-js
import { Component, createSignal, createEffect } from "solid-js";
// Resizable import
import Resizable from '@corvu/resizable';

// Tauri import
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";

// components
import Editor from "./components/Editor.tsx";
import Preview from "./components/Preview.tsx";
import Sidebar from "./components/Sidebar.tsx";

// file state store
import { fileState } from './store/fileState';
// styles
import "./App.css";

const App: Component = () => {
  
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");

  // Update window title on file path or modified changeb
  createEffect(() => {
    const name = fileState.path()?.split(/[/\\]/).pop() || 'Untitled.md';
    const flag = fileState.modified() ? ' ●' : '';
    try { getCurrentWindow().setTitle(`${name}${flag} - Aqua`); } catch {}
  });

  // Handle file selection from sidebar
  const handleFileSelect = async (path: string) => {

    const content = await invoke<string>('load_file', {path});
    setMd(content);
    fileState.setPath(path);
    fileState.setModified(false);

    // Load the selected file into the editor
    // invoke<string>('load_file', { path }).then((content) => {
    //   setMd(content);
    //   fileState.setPath(path);
    //   fileState.setModified(false);
    // }).catch(() => {
    //   // If the file fails to load, show an error message
    //   alert(`Failed to load file: ${path}`);
    // });
  }
  
  return (
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
  );
};

export default App;