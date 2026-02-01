import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Use CSS variables instead of hardcoded hex strings
const themeStyles = EditorView.theme({
  '&': { 
      backgroundColor: 'var(--bg)', color: 'var(--text)', height: '100%'
  },
  '.cm-content': { 
    caretColor: 'var(--primary)',
    fontSize: 'var(--base-size)',
    lineHeight: '1.65',
    fontFamily: 'Inter, sans-serif'
  },
  '.cm-line': { padding: '0 16px' },
  '.cm-cursor': { borderLeftColor: 'var(--primary)' },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#0EA5E944 !important' },
  '.cm-activeLine': { backgroundColor: 'var(--accent)', opacity: '0.5' },
  '.cm-gutters': { 
    backgroundColor: 'var(--sidebar)', 
    borderRight: '1px solid var(--border)',
    color: 'var(--muted-foreground)', 
  },
}, { dark: true }); // You can add logic here to toggle the 'dark' boolean based on system prefs

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--primary)', fontWeight: 'bold' },
  { tag: tags.keyword, color: '#0EA5E9' },
  { tag: tags.url, color: '#0EA5E9', textDecoration: 'underline' },
  { tag: tags.comment, color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  
  { tag: tags.monospace, color: '#0EA5E9', backgroundColor: 'var(--accent)', borderRadius: '4px' },
  
  { tag: tags.special, color: '#0EA5E9' }, 
  
  { tag: tags.punctuation, color: 'var(--foreground)', opacity: '0.7' },
  { tag: tags.bracket, color: 'var(--primary)' },
]);

export const oceanTheme = (): Extension[] => [
  themeStyles,
  syntaxHighlighting(highlightStyle),
];