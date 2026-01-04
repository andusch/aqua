import { createEffect, onMount } from 'solid-js';

// Marked and Highlight.js imports
import { Marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { markedHighlight } from 'marked-highlight';

// DOMPurify import for sanitizing HTML
import DOMPurify from 'dompurify';

// Throttle function import
import { throttle } from 'lodash';

// Arrow extension for marked
import { arrowExtension } from './ArrowExtension';

// Configure marked with highlight.js
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
).use({ extensions: [arrowExtension] });

marked.setOptions({ breaks: true, gfm: true });

interface PreviewProps {
  markdown: string;
}

const Preview = (props: PreviewProps) => {
  let containerRef: HTMLDivElement | undefined;
  let lastExternalScroll = 0;

  const handlePreviewScroll = throttle(() => {
    if (Date.now() - lastExternalScroll < 100 || !containerRef) return;
    const pct = containerRef.scrollTop / (containerRef.scrollHeight - containerRef.clientHeight);
    window.dispatchEvent(new CustomEvent('preview-scroll', { detail: pct }));
  }, 50);

  onMount(() => {
    const onEdScroll = (e: any) => {
      if (!containerRef) return;
      lastExternalScroll = Date.now();
      const sh = containerRef.scrollHeight - containerRef.clientHeight;
      containerRef.scrollTop = e.detail * sh;
    };
    window.addEventListener('editor-scroll', onEdScroll);
    return () => window.removeEventListener('editor-scroll', onEdScroll);
  });

  createEffect(() => {
    if (!containerRef) return;
    containerRef.querySelectorAll('pre code').forEach((b) => hljs.highlightElement(b as HTMLElement));
  });

  return (
    <div
      ref={containerRef!}
      class="preview"
      innerHTML={DOMPurify.sanitize(marked.parse(props.markdown) as string)}
      onScroll={handlePreviewScroll}
    />
  );
};

export default Preview;