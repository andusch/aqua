import { onMount, createSignal, createEffect } from 'solid-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const Preview = (props: { markdown: string }) => {
  let containerRef: HTMLDivElement | null = null;

  createEffect(() => {
    props.markdown; // track
    (containerRef as HTMLDivElement | null)?.querySelectorAll('pre code').forEach((block: Element) => {
      hljs.highlightElement(block as HTMLElement);
    });
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