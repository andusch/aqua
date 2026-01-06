import type { marked } from 'marked';

/*  pretty arrows in preview only  (-> → , <- ← , <-> ↔ )  */
export const arrowExtension: marked.TokenizerAndRendererExtension = {
  name: 'arrow',
  level: 'inline',
  start(src) { return src.search(/<->|->|<-/); },
  tokenizer(src) {
    const rule = /(<->|->|<-)/g;
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.exec(src))) {
      if (m.index > last) out += src.slice(last, m.index);
      const arrowMap: Record<string, string> = { '->': '→', '<-': '←', '<->': '↔' };
      out += arrowMap[m[0]] || m[0];
      last = rule.lastIndex;
    }
    if (!out) return undefined;
    return { type: 'arrow', raw: src.slice(0, last), text: out };
  },
  renderer(t) { return t.text; },
};