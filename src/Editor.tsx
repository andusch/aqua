// web/src/Editor.tsx
import { onMount } from 'solid-js';

const Editor = () => {
  let ref: HTMLDivElement | null = null;

  onMount(() => {
    if (ref) {
      ref.innerText = 'Replace me with CodeMirror in 1.2';
    }
  });

  return <div ref={(el) => (ref = el)} class="editor" style={{ height: '100%' }} />;
};

export default Editor;