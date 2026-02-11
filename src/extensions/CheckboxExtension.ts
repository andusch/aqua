export const checkboxExtension: any = {
  name: 'checkbox',
  level: 'inline',
  start(src: string) { return src.match(/\[([ xX])\]/)?.index; },
  tokenizer(src: string) {
    // checked checkbox
    const rule = /^\[([ xX])\]/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'checkbox',
        raw: match[0],
        checked: match[1].toLowerCase() === 'x',
      };
    }

    // unchecked checkbox
    const uncheckedRule = /^\[\]/;
    const uncheckedMatch = uncheckedRule.exec(src);
    if (uncheckedMatch) {
      return {
        type: 'checkbox',
        raw: uncheckedMatch[0],
        checked: false,
      };
    }

  },
  renderer(token: any) {
    const checked = token.checked ? 'checked' : 'unchecked';
    return `<input type="checkbox" disabled ${checked} class="task-checkbox">`;
  },
};