import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Use CSS variables instead of hardcoded hex strings
const themeStyles = EditorView.theme({
  '&': { backgroundColor: 'var(--bg)', color: 'var(--text)' },
  '.cm-content': { 
    caretColor: 'var(--accent)',
    fontSize: 'var(--base-size)',
    lineHeight: '1.65',
  },
  '.cm-line': { padding: '0 16px' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--bg-mute)' },
  '.cm-activeLine': { backgroundColor: 'var(--bg-soft)' },
  '.cm-gutters': { 
    backgroundColor: 'var(--bg-soft)', 
    borderRight: '1px solid var(--border)',
    color: 'var(--ocean-500)' 
  },
}, { dark: false }); // You can add logic here to toggle the 'dark' boolean based on system prefs

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--accent)', fontWeight: 'bold' },
  { tag: tags.keyword, color: 'var(--ocean-600)' },
  { tag: tags.url, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.comment, color: 'var(--ocean-400)', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.punctuation, color: 'var(--code-syntax)' },
  { tag: tags.bracket, color: 'var(--code-syntax)' },
]);

export const oceanTheme = (): Extension[] => [
  themeStyles,
  syntaxHighlighting(highlightStyle),
];