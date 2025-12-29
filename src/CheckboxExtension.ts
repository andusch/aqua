import { marked } from 'marked';

const checkboxRegex = /^\[([ xX])\] +/;

const checkboxExtension = {
  name: 'checkbox',
  level: 'inline' as const,
  start(src: string) {
    const match = src.match(checkboxRegex);
    return match ? 0 : -1;
  },
  tokenizer(src: string) {
    const match = src.match(checkboxRegex);
    if (!match) return undefined;
    const checked = match[1].toLowerCase() === 'x';
    const text = src.slice(match[0].length);
    return {
      type: 'checkbox',
      raw: match[0],
      checked,
      text, // raw text after the checkbox
    };
  },
  renderer(token: any) {
    const checked = token.checked ? 'checked' : '';
    return `<label class="check-label"><input type="checkbox" ${checked} data-checkbox> ${token.text}</label>`;
  },
};

marked.use({ extensions: [checkboxExtension] });