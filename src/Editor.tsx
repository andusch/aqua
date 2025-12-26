// web/src/Editor.tsx
import { onMount } from 'solid-js';

const Editor = () => {
  let ref: HTMLDivElement;

  onMount(() => {
    ref.innerText = 'Replace me with CodeMirror in 1.2';
  });

  return <div ref={ref!} class="editor" style={{ height: '100%' }} />;
};

export default Editor;