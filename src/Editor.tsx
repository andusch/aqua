import { onMount, createSignal } from "solid-js";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  EditorView,
  keymap,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, indentWithTab, undo, redo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { initDB, saveDoc, loadDoc } from "./store";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { throttle } from "lodash";
import { insertNewlineAndIndent } from "@codemirror/commands";

interface EditorProps {
  onChange?: (text: string) => void;
}

/* ----------  clipboard helpers  ---------- */
async function copyToClipboard(text: string) {
  if ((window as any).__TAURI__) {
    await invoke("clipboard_write", { text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}
async function readFromClipboard(): Promise<string> {
  if ((window as any).__TAURI__) {
    return invoke("clipboard_read");
  } else {
    return navigator.clipboard.readText();
  }
}

const Editor = (props: EditorProps) => {
  let parentEl: HTMLDivElement;
  const [view, setView] = createSignal<EditorView>();

  let lastExternalScroll = 0;

  onMount(async () => {
    await initDB();
    const saved = (await loadDoc()) ?? "# Hello Aqua\nStart typing…";

    const state = EditorState.create({
      doc: saved,
      extensions: [
        keymap.of([...defaultKeymap, indentWithTab]),
        keymap.of([
          { key: "Enter", run: insertNewlineAndIndent },
          ...defaultKeymap,
          indentWithTab,
        ]),
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
        EditorView.domEventHandlers({
          scroll: throttle((event, _view) => {
            if (Date.now() - lastExternalScroll < 100) return;
            const el = event.target as HTMLElement;
            const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
            window.dispatchEvent(
              new CustomEvent("editor-scroll", { detail: pct })
            );
          }, 50),
        }),
      ],
    });

    const v = new EditorView({ state, parent: parentEl });
    (window as any).__currentEditorView = v; // for widget
    setView(v);

    /* ----------  menu & keyboard shortcuts  ---------- */
    listen("menu-new", () =>
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: "" } })
    );

    listen("menu-open", async () => {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const text = await readTextFile(path);
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: text },
      });
      (window as any).__CURRENT_PATH__ = path;
    });

    listen("menu-save", async () => {
      const text = v.state.doc.toString();
      let path = (window as any).__CURRENT_PATH__;
      if (!path) {
        path = await save({
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (!path) return;
        (window as any).__CURRENT_PATH__ = path;
      }
      await writeFile(path, new TextEncoder().encode(text));
    });

    /* ----------  edit commands  ---------- */
    const selectAll = () =>
      v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } });

    listen("undo", () => undo(v));
    listen("redo", () => redo(v));
    listen("select-all", () => selectAll());

    listen("copy", async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        const text = v.state.doc.sliceString(sel.from, sel.to);
        await copyToClipboard(text);
      }
    });
    listen("cut", async () => {
      const sel = v.state.selection.main;
      if (!sel.empty) {
        const text = v.state.doc.sliceString(sel.from, sel.to);
        await copyToClipboard(text);
        v.dispatch({ changes: { from: sel.from, to: sel.to, insert: "" } });
      }
    });
    listen("paste", async () => {
      const text = await readFromClipboard();
      v.dispatch(v.state.replaceSelection(text));
    });

    /* ----------  scroll sync  ---------- */
    window.addEventListener("preview-scroll", (e: any) => {
      const scrollable = parentEl.querySelector(".cm-scroller") as HTMLElement;
      if (!scrollable) return;
      lastExternalScroll = Date.now();
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
