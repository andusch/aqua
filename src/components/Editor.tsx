import { onMount, createSignal } from 'solid-js';

// CodeMirror imports
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { defaultKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

// Tauri imports
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Local imports for storage and state management
import { fileState } from '../store/fileState.ts';
import { initDB, saveDoc, loadDoc } from '../store/store.ts';

// Import for throttle function for scroll syncing
import { throttle } from 'lodash';

// Import for ocean theme
import { oceanTheme } from '../lib/editor/oceanTheme.ts';

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

    // Initialize CodeMirror editor state
    const state = EditorState.create({
      doc: saved,
      extensions: [
        keymap.of([...defaultKeymap, indentWithTab]),
        markdown(),
        oceanTheme(),
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

    // Store unlisten functions for cleanup
    const unlisteners: Array<() => void> = [];

    // New file menu listener
    const unlistenNew = await listen('menu-new', () => {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' } });
      fileState.reset();
      props.onChange?.('');
    });
    unlisteners.push(unlistenNew);

    // Open file menu listener
    const unlistenOpen = await listen('menu-open', async () => {

      const file = await invoke<{path: string, content: string}>('open_file').catch(() => null);
      if (!file) return;

      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: file.content}});

      fileState.setPath(file.path);
      fileState.setModified(false);

      props.onChange?.(file.content);

    });
    unlisteners.push(unlistenOpen);

    // Save file menu listener
    const unlistenSave = await listen('menu-save', async () => {

      const text = v.state.doc.toString();
      const path = fileState.path();

      console.log('[SAVE] path =', path);

      // overwrite existing file
      if (path) {
        await invoke('save_file', { path, content: text });
        fileState.setModified(false);
      }
      // save as new file
      else {
        const newPath = await invoke<string | null>('save_file_dialog', { text });
        console.log('[SAVE AS] newPath =', newPath);
        if (!newPath) return;
        fileState.setPath(newPath);
        fileState.setModified(false);
      }

      
    });
    unlisteners.push(unlistenSave);

    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (!fileState.modified() || !fileState.path()) return;
      const text = v.state.doc.toString();
      invoke('save_file', { path: fileState.path(), content: text })
        .then(() => fileState.setModified(false))
        .catch(() => {/* silent fail */});
    }, 30_000);

    // Undo, Redo, Select All, Copy, Cut, Paste listeners
    const unlistenUndo = await listen('undo', () => undo(v));
    unlisteners.push(unlistenUndo);
    
    const unlistenRedo = await listen('redo', () => redo(v));
    unlisteners.push(unlistenRedo);
    
    const unlistenSelectAll = await listen('select-all', () => v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }));
    unlisteners.push(unlistenSelectAll);

    const unlistenCopy = await listen('copy', async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        try {
          const text = v.state.doc.sliceString(sel.from, sel.to);
          await ((window as any).__TAURI__ ? invoke('clipboard_write', { text }) : navigator.clipboard.writeText(text));
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      }
    });
    unlisteners.push(unlistenCopy);

    const unlistenCut = await listen('cut', async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        try {
          const text = v.state.doc.sliceString(sel.from, sel.to);
          await ((window as any).__TAURI__ ? invoke('clipboard_write', { text }) : navigator.clipboard.writeText(text));
          v.dispatch({ changes: { from: sel.from, to: sel.to, insert: '' } });
        } catch (err) {
          console.error('Failed to cut to clipboard:', err);
        }
      }
    });
    unlisteners.push(unlistenCut);

    const unlistenPaste = await listen('paste', async () => {
      try {
        const text = (window as any).__TAURI__
          ? await invoke<string>('clipboard_read')
          : await navigator.clipboard.readText();
        v.dispatch(v.state.replaceSelection(text));
      } catch (err) {
        console.error('Failed to paste from clipboard:', err);
      }
    });
    unlisteners.push(unlistenPaste);

    // Preview scroll syncing listener
    const handlePreviewScroll = (e: any) => {
      const scroller = parentEl.querySelector('.cm-scroller') as HTMLElement;
      if (!scroller) return;
      lastExternalScroll = Date.now();
      const sh = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = e.detail * sh;
    };
    window.addEventListener('preview-scroll', handlePreviewScroll);

    // Cleanup function
    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('preview-scroll', handlePreviewScroll);
      unlisteners.forEach(unlisten => unlisten());
      v.destroy();
    };
  });

  // Debounce function for onChange
  let timer: ReturnType<typeof setTimeout>;
  function debounce(fn: () => void) {
    clearTimeout(timer);
    timer = setTimeout(fn, 400);
  }

  return <div ref={(el) => (parentEl = el!)} class="editor" />;
};

export default Editor;