export const checkboxExtension: any = {
  name: 'checkbox',
  level: 'inline',
  start(src: string) { return src.match(/\[([ xX])\]/)?.index; },
  tokenizer(src: string) {
    const rule = /^\[([ xX])\]/; // Match only at start of current token
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'checkbox',
        raw: match[0],
        checked: match[1].toLowerCase() === 'x',
      };
    }
  },
  renderer(token: any) {
    // Note the added spacing/display block to prevent the "inline mess"
    const checked = token.checked ? 'checked' : '';
    return `<input type="checkbox" disabled ${checked} class="task-checkbox">`;
  },
};