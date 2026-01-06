// solid-js
import { Component, createSignal, createEffect } from "solid-js";
// Resizable import
import Resizable from '@corvu/resizable';

// Tauri import
import { getCurrentWindow } from '@tauri-apps/api/window';

// components
import Editor from "./components/Editor.tsx";
import Preview from "./components/Preview.tsx";

// file state store
import { fileState } from './store/fileState';
// styles
import "./App.css";

const App: Component = () => {
  
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");

  // Update window title on file path or modified change
  createEffect(() => {
    const name = fileState.path()?.split(/[/\\]/).pop() || 'Untitled.md';
    const flag = fileState.modified() ? ' ●' : '';
    try { getCurrentWindow().setTitle(`${name}${flag} - Aqua`); } catch {}
  });
  
  return (
    <div class="app">
      <Resizable class="resizable-container">
        <Resizable.Panel
          initialSize={0.5}
          minSize={0.2}
          class="editor-panel"
        >
          <Editor onChange={setMd} />
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
  );
};

export default App;