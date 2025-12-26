import { onMount, createSignal } from 'solid-js';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { initDB, saveDoc, loadDoc } from './store';

const Editor = () => {
  let ref: HTMLDivElement | null = null;
  const [view, setView] = createSignal<EditorView>();

  onMount(async () => {
    await initDB();
    const saved = (await loadDoc()) ?? '# Hello Aqua\nStart typing…';

    const startState = EditorState.create({
      doc: saved,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) debounce(() => saveDoc(v.state.doc.toString()));
        }),
      ],
    });
    if (ref) {
      const v = new EditorView({ state: startState, parent: ref });
      setView(v);
    }
  });

  // debounce helper
  let timer: number;
  function debounce(fn: () => void) {
    clearTimeout(timer);
    timer = setTimeout(fn, 400);
  }

  return <div ref={(el) => (ref = el)} class="editor" />;
};

export default Editor;