import katex from 'katex';
import { TokenizerAndRendererExtension } from 'marked';

export const latexExtension: TokenizerAndRendererExtension = {
  name: 'latex',
  level: 'inline', // Inline level allows it to find $ even inside paragraphs
  start(src: string) { return src.indexOf('$'); },
  tokenizer(src: string) {
    // 1. Check for Block ($$ ... $$)
    const blockMatch = /^\$\$\s*([\s\S]+?)\s*\$\$/.exec(src);
    if (blockMatch) {
      return {
        type: 'latex',
        raw: blockMatch[0],
        text: blockMatch[1].trim(),
        displayMode: true,
      };
    }

    // 2. Check for Inline ($ ... $)
    const inlineMatch = /^\$((?:[^\$\\]|\\.)+?)\$/.exec(src);
    if (inlineMatch) {
      return {
        type: 'latex',
        raw: inlineMatch[0],
        text: inlineMatch[1].trim(),
        displayMode: false,
      };
    }
    return;
  },
  renderer(token) {
    const html = katex.renderToString(token.text, {
      displayMode: token.displayMode,
      throwOnError: false,
    });

    if (token.displayMode) {
      return `\n<div class="latex-block">${html}</div>\n`;
    }
    return html;
  }
};