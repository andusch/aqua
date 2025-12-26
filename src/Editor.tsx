import { onMount, createSignal } from 'solid-js';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

const Editor = () => {
  let ref: HTMLDivElement | null = null;
  const [view, setView] = createSignal<EditorView>();

  onMount(() => {
    const startState = EditorState.create({
      doc: '# Hello Aqua\nStart typing in markdown…',
      extensions: [basicSetup, markdown(), oneDark],
    });
    if (ref) {
      const v = new EditorView({ state: startState, parent: ref });
      setView(v);
    }
  });

  return <div ref={(el) => (ref = el)} class="editor" />;
};

export default Editor;