import { onMount, createSignal } from 'solid-js';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { listen } from '@tauri-apps/api/event';
import { initDB, saveDoc, loadDoc } from './store';
import { throttle } from 'lodash';
import { fileState } from './store/fileState';

interface EditorProps {
  onChange?: (text: string) => void;
}

const Editor = (props: EditorProps) => {
  let parentEl: HTMLDivElement;
  const [view, setView] = createSignal<EditorView>();

  let lastExternalScroll = 0;

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
              fileState.setModified(true);
            });
          }
        }),
        EditorView.domEventHandlers({
          scroll: throttle((event) => {
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

    listen('undo', () => undo(v));
    listen('redo', () => redo(v));
    listen('select-all', () => v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }));

    listen('copy', async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        const text = v.state.doc.sliceString(sel.from, sel.to);
        await ((window as any).__TAURI__ ? invoke('clipboard_write', { text }) : navigator.clipboard.writeText(text));
      }
    });

    listen('cut', async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        const text = v.state.doc.sliceString(sel.from, sel.to);
        await ((window as any).__TAURI__ ? invoke('clipboard_write', { text }) : navigator.clipboard.writeText(text));
        v.dispatch({ changes: { from: sel.from, to: sel.to, insert: '' } });
      }
    });

    listen('paste', async () => {
      const text = (window as any).__TAURI__
        ? await invoke('clipboard_read')
        : await navigator.clipboard.readText();
      v.dispatch(v.state.replaceSelection(text));
    });

    window.addEventListener('preview-scroll', (e: any) => {
      const scroller = parentEl.querySelector('.cm-scroller') as HTMLElement;
      if (!scroller) return;
      lastExternalScroll = Date.now();
      const sh = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = e.detail * sh;
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