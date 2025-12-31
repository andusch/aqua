import { createEffect, onMount } from 'solid-js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { throttle } from 'lodash';
import { arrowExtension } from './ArrowExtension';

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
  let lastExternalScroll = 0; // epoch ms

  /*  human scroll  →  send percentage  (throttled)  */
  const handlePreviewScroll = throttle(() => {
    if (Date.now() - lastExternalScroll < 100) return;
    if (!containerRef) return;
    const el = containerRef;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    window.dispatchEvent(new CustomEvent('preview-scroll', { detail: pct }));
  }, 50);

  /*  editor scroll  →  move preview  */
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