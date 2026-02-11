import { describe, it, expect, beforeEach } from 'vitest';
import { fileState } from '../store/fileState';
import { themeState } from '../store/themeState';

describe('FileState - Signal Management', () => {
  beforeEach(() => {
    fileState.reset();
  });

  it('should initialize with null path and false modified', () => {
    expect(fileState.path()).toBeNull();
    expect(fileState.modified()).toBe(false);
  });

  it('should update path', () => {
    const testPath = '/home/user/document.md';
    fileState.setPath(testPath);
    expect(fileState.path()).toBe(testPath);
  });

  it('should set modified flag', () => {
    fileState.setModified(true);
    expect(fileState.modified()).toBe(true);
  });

  it('should toggle modified state', () => {
    expect(fileState.modified()).toBe(false);
    fileState.setModified(true);
    expect(fileState.modified()).toBe(true);
    fileState.setModified(false);
    expect(fileState.modified()).toBe(false);
  });

  it('should reset path and modified state', () => {
    fileState.setPath('/some/path');
    fileState.setModified(true);
    
    fileState.reset();
    
    expect(fileState.path()).toBeNull();
    expect(fileState.modified()).toBe(false);
  });

  it('should handle multiple path changes', () => {
    const paths = ['/path/1', '/path/2', '/path/3'];
    
    paths.forEach(path => {
      fileState.setPath(path);
      expect(fileState.path()).toBe(path);
    });
  });
});

describe('ThemeState - Theme Management', () => {
  beforeEach(() => {
    // Reset theme to light for consistent testing
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme) {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('should have initial theme based on system preference', () => {
    const theme = themeState.theme();
    expect(['light', 'dark']).toContain(theme);
  });

  it('should toggle theme', () => {
    const initialTheme = themeState.theme();
    themeState.toggle();
    const newTheme = themeState.theme();
    
    expect(newTheme).not.toBe(initialTheme);
    expect(['light', 'dark']).toContain(newTheme);
  });

  it('should toggle theme multiple times', () => {
    const initial = themeState.theme();
    
    themeState.toggle();
    const afterFirst = themeState.theme();
    
    themeState.toggle();
    const afterSecond = themeState.theme();
    
    expect(initial).toBe(afterSecond);
    expect(initial).not.toBe(afterFirst);
  });

  it('should set data-theme attribute on toggle', () => {
    themeState.toggle();
    const dataTheme = document.documentElement.getAttribute('data-theme');
    expect(dataTheme).toBe(themeState.theme());
  });

  it('should initialize data-theme attribute', () => {
    // Clear previous attribute
    document.documentElement.removeAttribute('data-theme');
    
    themeState.init();
    const dataTheme = document.documentElement.getAttribute('data-theme');
    expect(dataTheme).toBe(themeState.theme());
  });

  it('should alternate between light and dark', () => {
    const themes = [];
    for (let i = 0; i < 4; i++) {
      themes.push(themeState.theme());
      themeState.toggle();
    }
    
    expect(themes[0]).toBe(themes[2]);
    expect(themes[1]).toBe(themes[3]);
  });
});
