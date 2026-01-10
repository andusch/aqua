import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// universal ocean palette
const ocean = {
  50 : '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
};

const lightBase = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: ocean[900] },
  '.cm-content': { caretColor: ocean[600] },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: ocean[600] },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: ocean[200] },
  '.cm-activeLine': { backgroundColor: ocean[50] },
  '.cm-selectionMatch': { backgroundColor: ocean[100] },
  '.cm-searchMatch': { backgroundColor: ocean[200], outline: `1px solid ${ocean[400]}` },
  '.cm-gutters': { backgroundColor: ocean[50], border: 'none', color: ocean[500] },
  '.cm-activeLineGutter': { backgroundColor: ocean[100] },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px' },
  '.cm-tooltip': { backgroundColor: '#fff', border: `1px solid ${ocean[200]}`, borderRadius: '6px' },
}, { dark: false });

const darkBase = EditorView.theme({
  '&': { backgroundColor: ocean[900], color: ocean[100] },
  '.cm-content': { caretColor: ocean[300] },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: ocean[300] },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: ocean[700] },
  '.cm-activeLine': { backgroundColor: ocean[800] },
  '.cm-selectionMatch': { backgroundColor: ocean[800] },
  '.cm-searchMatch': { backgroundColor: ocean[700], outline: `1px solid ${ocean[500]}` },
  '.cm-gutters': { backgroundColor: ocean[800], border: 'none', color: ocean[400] },
  '.cm-activeLineGutter': { backgroundColor: ocean[700] },
  '.cm-tooltip': { backgroundColor: ocean[800], border: `1px solid ${ocean[700]}`, borderRadius: '6px' },
}, { dark: true });

const highlightLight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: ocean[600] },
  { tag: tags.name, color: ocean[800] },
  { tag: tags.heading, color: ocean[700], fontWeight: '600' },
  { tag: tags.quote, color: ocean[500], fontStyle: 'italic' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.url, color: ocean[500], textDecoration: 'underline' },
  { tag: tags.comment, color: ocean[400] },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)' },
]));

const highlightDark = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: ocean[300] },
  { tag: tags.name, color: ocean[200] },
  { tag: tags.heading, color: ocean[200], fontWeight: '600' },
  { tag: tags.quote, color: ocean[400], fontStyle: 'italic' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.url, color: ocean[400], textDecoration: 'underline' },
  { tag: tags.comment, color: ocean[500] },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)' },
]));

export const oceanTheme = (): Extension[] => [
  EditorView.theme({}, { dark: window.matchMedia('(prefers-color-scheme: dark)').matches }),
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? [darkBase, highlightDark]
    : [lightBase, highlightLight],
];