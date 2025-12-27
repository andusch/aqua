import { Component, createSignal } from "solid-js";
import Resizable from '@corvu/resizable';
import Editor from "./Editor";
import Preview from "./Preview";
import "./App.css";

const App: Component = () => {
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");

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