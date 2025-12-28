import { onMount, createSignal } from 'solid-js';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { initDB, saveDoc, loadDoc } from './store';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { listen } from '@tauri-apps/api/event';
import { throttle } from 'lodash';

interface EditorProps {
  onChange?: (text: string) => void;
}

const Editor = (props: EditorProps) => {
  let parentEl: HTMLDivElement;
  const [view, setView] = createSignal<EditorView>();

  /* ----------  scroll-sync lock (timestamp based)  ---------- */
  let lastExternalScroll = 0; // epoch ms

  onMount(async () => {
    await initDB();
    const saved = (await loadDoc()) ?? '# Hello Aqua\nStart typing…';

    const state = EditorState.create({
      doc: saved,
      extensions: [
        keymap.of([...defaultKeymap, indentWithTab]),
        markdown(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.updateListener.of((up) => {
          if (up.docChanged) {
            const txt = up.state.doc.toString();
            debounce(() => {
              saveDoc(txt);
              props.onChange?.(txt);
            });
          }
        }),
        /*  human scroll  →  send percentage  (throttled)  */
        EditorView.domEventHandlers({
          scroll: throttle((event, _view) => {
            // ignore if we triggered this scroll < 100 ms ago
            if (Date.now() - lastExternalScroll < 100) return;
            const el = event.target as HTMLElement;
            const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
            window.dispatchEvent(new CustomEvent('editor-scroll', { detail: pct }));
          }, 50),
        }),
      ],
    });

    const v = new EditorView({ state, parent: parentEl });
    setView(v);

    listen('menu-new', () => v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' } }));

    listen('menu-open', async () => {
      const selected = await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md'] }] });
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

    /*  preview scroll  →  move editor  */
    window.addEventListener('preview-scroll', (e: any) => {
      const scrollable = parentEl.querySelector('.cm-scroller') as HTMLElement;
      if (!scrollable) return;
      lastExternalScroll = Date.now(); // mark “we are moving it”
      const scrollHeight = scrollable.scrollHeight - scrollable.clientHeight;
      scrollable.scrollTop = e.detail * scrollHeight;
    });
  });

  let timer: number;
  function debounce(fn: () => void) {
    clearTimeout(timer);
    timer = setTimeout(fn, 400);
  }

  return <div ref={(el) => (parentEl = el!)} class="editor" />;
};

export default Editor;