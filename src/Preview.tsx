// Component imports
import { createEffect, onMount } from 'solid-js';
// Markdown and syntax highlighting imports
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
// Sanitization imports
import DOMPurify from 'dompurify';
// Utility imports
import { throttle } from 'lodash';
// Arrow extension import
import { arrowExtension } from './ArrowExtension';

// Configure marked with highlight.js and the arrow extension
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

// Component Props
interface PreviewProps {
  markdown: string;
}

// Preview Component
const Preview = (props: PreviewProps) => {
  let containerRef: HTMLDivElement | undefined;
  let lastExternalScroll = 0; // epoch ms

  // Preview scroll → move editor
  const handlePreviewScroll = throttle(() => {
    if (Date.now() - lastExternalScroll < 100) return;
    if (!containerRef) return;
    const el = containerRef;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    window.dispatchEvent(new CustomEvent('preview-scroll', { detail: pct }));
  }, 50);

  // Editor scroll → move preview
  onMount(() => {
    const handleEditorScroll = (e: any) => {
      if (!containerRef) return;
      lastExternalScroll = Date.now(); // mark “we are moving it”
      const scrollHeight = containerRef.scrollHeight - containerRef.clientHeight;
      containerRef.scrollTop = e.detail * scrollHeight;
    };
    window.addEventListener('editor-scroll', handleEditorScroll);
    return () => window.removeEventListener('editor-scroll', handleEditorScroll);
  });

  // Highlight code blocks on markdown change
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