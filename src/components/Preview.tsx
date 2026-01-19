import { createEffect, onMount } from 'solid-js';

// Marked and Highlight.js imports
import { Marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { markedHighlight } from 'marked-highlight';

// DOMPurify import for sanitizing HTML
import DOMPurify from 'dompurify';

// Latex support
import katex from 'katex';

// Throttle function import
import { throttle } from 'lodash';

// Arrow extension for marked
import { arrowExtension } from '../extensions/ArrowExtension';
// Checkbox extension for marked
import { checkboxExtension } from '../extensions/CheckboxExtension';

// Import for typography styles
import '../lib/styles/typography.css';

// Import for animations styles
import '../lib/styles/animations.css';
import { markdown } from '@codemirror/lang-markdown';

// Configure marked with highlight.js and custom extensions
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
).use({ extensions: [arrowExtension, checkboxExtension] });

marked.setOptions({
  breaks: true,
  gfm: true,
  tables: true,
  taskLists: true
});

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

  const renderMarkdown = (markdown : string) => {
    // Parse the markdown to HTML
    const html = marked.parse(markdown);
    // Sanitize HTML to prevent XSS atacks
    const sanitizedHtml = DOMPurify.sanitize(html);
    const blockLatexRenderedHtml = sanitizedHtml.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
    return `<div class="latex-block">${katex.renderToString(p1.trim(), { throwOnError: false })}</div>`;
  });
  const inlineLatexRenderedHtml = blockLatexRenderedHtml.replace(/\$(.*?)\$/g, (match, p1) => {
    return `<span class="latex-inline">${katex.renderToString(p1.trim(), { throwOnError: false })}</span>`;
  });
  return inlineLatexRenderedHtml;
  };

  return (
    <div
      ref={containerRef!}
      class="preview"
      innerHTML={renderMarkdown(props.markdown)}
      onScroll={handlePreviewScroll}
    />
  );
};

export default Preview;