import { createEffect, onMount } from 'solid-js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { throttle } from 'lodash';
import './CheckboxExtension'; // registers checkbox + arrow renderer

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);
marked.setOptions({ breaks: true, gfm: true });

/* ----------  pretty arrows in preview only  ---------- */
const arrowExtension = {
  name: 'arrow',
  level: 'inline' as const,
  start(src: string) {
    return src.search(/<->|->|<-/);
  },
  tokenizer(src: string) {
    const match = src.match(/^(<->|->|<-)/);
    if (!match) return undefined;
    const map: Record<string, string> = { '->': '→', '<-': '←', '<->': '↔' };
    return {
      type: 'arrow',
      raw: match[0],
      text: map[match[0]],
    };
  },
  renderer(token: any) {
    return token.text;
  },
};

marked.use({ extensions: [arrowExtension] });

interface PreviewProps {
  markdown: string;
}

const Preview = (props: PreviewProps) => {
  let containerRef: HTMLDivElement | undefined;
  let lastExternalScroll = 0;

  const handlePreviewScroll = throttle(() => {
    if (Date.now() - lastExternalScroll < 100) return;
    if (!containerRef) return;
    const el = containerRef;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    window.dispatchEvent(new CustomEvent('preview-scroll', { detail: pct }));
  }, 50);

  onMount(() => {
    const handleEditorScroll = (e: any) => {
      if (!containerRef) return;
      lastExternalScroll = Date.now();
      const scrollHeight = containerRef.scrollHeight - containerRef.clientHeight;
      containerRef.scrollTop = e.detail * scrollHeight;
    };
    window.addEventListener('editor-scroll', handleEditorScroll);
    return () => window.removeEventListener('editor-scroll', handleEditorScroll);
  });

  /* checkbox ticking -> editor */
  onMount(() => {
    containerRef!.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName !== 'INPUT' || !target.matches('[data-checkbox]')) return;

      const label = target.parentElement!;
      const idx = Array.from(containerRef!.children).indexOf(label);
      const lines = props.markdown.split('\n');
      if (idx < 0 || idx >= lines.length) return;

      const line = lines[idx];
      const newLine = target.checked
        ? line.replace('[ ]', '[x]')
        : line.replace('[x]', '[ ]');

      lines[idx] = newLine;
      window.dispatchEvent(
        new CustomEvent('checkbox-change', { detail: lines.join('\n') })
      );
    });
  });

  createEffect(() => {
    if (containerRef) {
      containerRef.querySelectorAll('pre code').forEach((block: Element) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  });

  return (
    <div
      ref={containerRef!}
      class="preview"
      innerHTML={DOMPurify.sanitize(marked.parse(props.markdown) as string)}
      onScroll={handlePreviewScroll}
      style={{ overflow: 'auto' }}
    />
  );
};

export default Preview;