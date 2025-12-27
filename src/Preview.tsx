import { createEffect } from 'solid-js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Create a new Marked instance with highlighting plugin
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

// Configure marked for better output
marked.setOptions({
  breaks: true,
  gfm: true,
});

const Preview = (props: { markdown: string }) => {
  let containerRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Force re-highlight when markdown changes
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
    />
  );
};

export default Preview;