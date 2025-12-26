// web/src/Editor.tsx
import { onMount, createSignal } from 'solid-js';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { initDB, saveDoc, loadDoc } from './store';
// Tauri APIs
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { listen } from '@tauri-apps/api/event';

interface EditorProps {
  onChange?: (text: string) => void;
}

const Editor = (props: EditorProps) => {
  let parentEl: HTMLDivElement;
  const [view, setView] = createSignal<EditorView>();

  onMount(async () => {
    await initDB();
    const saved = (await loadDoc()) ?? '# Hello Aqua\nStart typing…';

    // create CM6 instance
    const state = EditorState.create({
      doc: saved,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.updateListener.of((up) => {
          if (up.docChanged) {
            const txt = up.state.doc.toString();
            debounce(() => {
              saveDoc(txt);
              props.onChange?.(txt);
            });
          }
        }),
      ],
    });
    const v = new EditorView({ state, parent: parentEl });
    setView(v);

    // menu listeners
    listen('menu-new', () =>
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' } })
    );

    listen('menu-open', async () => {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const text = await readTextFile(path);
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
      (window as any).__CURRENT_PATH__ = path;
    });

    listen('menu-save', async () => {
      const text = v.state.doc.toString();
      let path = (window as any).__CURRENT_PATH__;
      if (!path) {
        path = await save({ filters: [{ name: 'Markdown', extensions: ['md'] }] });
        if (!path) return;
        (window as any).__CURRENT_PATH__ = path;
      }
      await writeFile(path, new TextEncoder().encode(text));
    });
  });

  // debounce
  let timer: number;
  function debounce(fn: () => void) {
    clearTimeout(timer);
    timer = setTimeout(fn, 400);
  }

  return <div ref={(el) => (parentEl = el!)} class="editor" />;
};

export default Editor;