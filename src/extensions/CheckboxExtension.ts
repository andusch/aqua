import type { marked } from 'marked';

export const checkboxExtension: marked.TokenizerAndRendererExtension = {
  name: 'checkbox',
  level: 'inline',          // only touch the [ ] / [x] part
  start(src) {
    const match = src.match(/\[([ x])\](?=\s)/i);
    return match ? match.index : -1;
  },
  tokenizer(src) {
    const rule = /\[([ xX])\](?=\s)/;
    const match = rule.exec(src);
    if (!match) return undefined;
    return {
      type: 'checkbox',
      raw: match[0],
      checked: match[1].toLowerCase() === 'x',
    };
  },
  renderer(token) {
    const checked = token.checked ? 'checked' : '';
    return `<input type="checkbox" disabled ${checked} class="task-checkbox">`;
  },
};