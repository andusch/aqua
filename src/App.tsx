import { Component, createSignal } from "solid-js";
import { SplitPane } from "solid-split-pane";
import Editor from "./Editor";
import Preview from "./Preview.tsx";
import "./App.css";

const App: Component = () => {
  const [md, setMd] = createSignal("# Hello Aqua\nStart typing…");

  return (
    <div class="app">
      <SplitPane
        direction="vertical"
        minSize={200}
        // defaultSize={50}
        // resizerClass="resizer"
      >
        <Editor onChange={setMd} />
        <Preview markdown={md()} />
      </SplitPane>
    </div>
  );
};

export default App;
