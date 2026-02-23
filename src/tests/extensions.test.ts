import { describe, it, expect } from 'vitest';
import { arrowExtension } from '../extensions/ArrowExtension';
import { checkboxExtension } from '../extensions/CheckboxExtension';
import { latexExtension } from '../extensions/LatexExtension';

describe('ArrowExtension - Arrow Replacement', () => {
  it('should find arrow in source code', () => {
    const src = 'This has an arrow -> somewhere';
    const result = arrowExtension.start!(src);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should return -1 when no arrow found', () => {
    const src = 'No arrow here';
    const result = arrowExtension.start!(src);
    expect(result).toBe(-1);
  });

  it('should tokenize right arrow', () => {
    const src = '-> some text';
    const token = arrowExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('arrow');
    expect(token.text).toContain('→');
  });

  it('should tokenize left arrow', () => {
    const src = '<- some text';
    const token = arrowExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.text).toContain('←');
  });

  it('should tokenize bidirectional arrow', () => {
    const src = '<-> some text';
    const token = arrowExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.text).toContain('↔');
  });

  it('should handle multiple arrows in text', () => {
    const src = 'A -> B <- C <-> D';
    const token = arrowExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.text).toContain('→');
    expect(token.text).toContain('←');
    expect(token.text).toContain('↔');
  });

  it('should render arrow token', () => {
    const token = { type: 'arrow', text: '→', raw: '->' };
    const rendered = arrowExtension.renderer!(token as any);
    expect(rendered).toBe('→');
  });
});

describe('CheckboxExtension - Checkbox Rendering', () => {
  it('should find checkbox in source', () => {
    const src = 'Task: [x] Complete item';
    const result = checkboxExtension.start!(src);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should return undefined when no checkbox found', () => {
    const src = 'No checkbox here';
    const result = checkboxExtension.start!(src);
    expect(result).toBeUndefined();
  });

  it('should tokenize checked checkbox', () => {
    const src = '[x]';
    const token = checkboxExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('checkbox');
    expect(token.checked).toBe(true);
  });

  it('should tokenize unchecked checkbox with space', () => {
    const src = '[ ]';
    const token = checkboxExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('checkbox');
    expect(token.checked).toBe(false);
  });

  it('should tokenize unchecked checkbox with empty brackets', () => {
    const src = '[]';
    const token = checkboxExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('checkbox');
    expect(token.checked).toBe(false);
  });

  it('should tokenize uppercase X', () => {
    const src = '[X]';
    const token = checkboxExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.checked).toBe(true);
  });

  it('should render checked checkbox', () => {
    const token = { type: 'checkbox', checked: true, raw: '[x]' };
    const rendered = checkboxExtension.renderer!(token);
    expect(rendered).toContain('checkbox');
    expect(rendered).toContain('checked');
  });

  it('should render unchecked checkbox', () => {
    const token = { type: 'checkbox', checked: false, raw: '[]' };
    const rendered = checkboxExtension.renderer!(token);
    expect(rendered).toContain('checkbox');
    expect(rendered).toContain('disabled');
    // For unchecked, the renderer outputs 'unchecked' as an attribute
    expect(rendered).toContain('unchecked');
  });

  it('should include disabled attribute', () => {
    const token = { type: 'checkbox', checked: false, raw: '[]' };
    const rendered = checkboxExtension.renderer!(token);
    expect(rendered).toContain('disabled');
  });
});

describe('LatexExtension - LaTeX Rendering', () => {
  it('should find inline LaTeX in source', () => {
    const src = 'Formula: $E = mc^2$';
    const result = latexExtension.start!(src);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should find block LaTeX in source', () => {
    const src = 'Formula: $$ E = mc^2 $$';
    const result = latexExtension.start!(src);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should return -1 when no LaTeX found', () => {
    const src = 'No latex here';
    const result = latexExtension.start!(src);
    expect(result).toBe(-1);
  });

  it('should tokenize block LaTeX', () => {
    const src = '$$E = mc^2$$';
    const token = latexExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('latex');
    expect(token.displayMode).toBe(true);
    expect(token.text).toBe('E = mc^2');
  });

  it('should tokenize inline LaTeX', () => {
    const src = '$E = mc^2$';
    const token = latexExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.type).toBe('latex');
    expect(token.displayMode).toBe(false);
    expect(token.text).toBe('E = mc^2');
  });

  it('should handle LaTeX with spaces', () => {
    const src = '$$ a = b + c $$';
    const token = latexExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.text).toBe('a = b + c');
  });

  it('should render block LaTeX token', () => {
    const token = { type: 'latex', text: 'x^2', displayMode: true };
    const rendered = latexExtension.renderer!(token as any);
    expect(rendered).toContain('latex-block');
  });

  it('should render inline LaTeX token', () => {
    const token = { type: 'latex', text: 'x', displayMode: false };
    const rendered = latexExtension.renderer!(token as any);
    expect(rendered).toContain('katex');
    expect(rendered).not.toContain('latex-block');
  });

  it('should handle invalid LaTeX gracefully', () => {
    const token = { type: 'latex', text: '\\invalid{', displayMode: false };
    // Should not throw, as latexExtension uses throwOnError: false
    expect(() => {
      latexExtension.renderer!(token as any);
    }).not.toThrow();
  });

  it('should handle escaped dollar sign', () => {
    const src = '$\\$$';
    const token = latexExtension.tokenizer!(src);
    expect(token).toBeDefined();
    expect(token.text).toBe('\\$');
  });
});
