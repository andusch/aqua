import { createEffect, onMount } from 'solid-js';
import { open as openExternal } from '@tauri-apps/plugin-shell';

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
import { arrowExtension } from '../extensions/ArrowExtension';
// Checkbox extension for marked
import { checkboxExtension } from '../extensions/CheckboxExtension';
// Latex extension for marked
import { latexExtension } from '../extensions/LatexExtension';
import 'katex/dist/katex.min.css'

// Import for typography styles
import '../styles/typography.css';

// Import for animations styles
import '../styles/animations.css';

// handle hyperlink clicks in the preview to open in default browser
const handleContentClick = (e: MouseEvent) => {
  
  const target = (e.target as HTMLElement).closest('a');

  if(target) {
    
    const href = target.getAttribute('href');

    if (href && (href.startsWith('http') || href.startsWith('mailto:'))){
      
      e.preventDefault();
      e.stopPropagation();

      openExternal(href).catch((err: Error) => console.error('Failed to open link:', err));

    }

  }

};

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
).use({ extensions: [arrowExtension, checkboxExtension, latexExtension] });

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface PreviewProps {
  markdown: string;
}

const Preview = (props: PreviewProps) => {

  let containerRef: HTMLDivElement | undefined;
  let lastExternalScroll = 0;

  // Throttled scroll handler to sync preview scroll with editor
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

  // Memoized function to render markdown to sanitized HTML
  const renderMarkdown = (markdown: string) => {

    const html = marked.parse(markdown) as string;
  
    return DOMPurify.sanitize(html, {
      ADD_TAGS: [
        "img",
        "math", "semantics", "annotation", "mtext", "mspace", 
        "mrow", "mfrac", "root", "annotation-xml", "svg", 
        "path", "rect", "symbol", "use", "g", "foreignObject"
      ],
      ADD_ATTR: [
        "viewbox", "d", "fill", "stroke", "width", "height", 
        "xlink:href", "class", "aria-hidden", "style"
      ],
    });
  };

  return (
    <div
      ref={containerRef!}
      class="preview"
      innerHTML={renderMarkdown(props.markdown)}
      onScroll={handlePreviewScroll}
      onClick={handleContentClick}
    />
  );
};

export default Preview;