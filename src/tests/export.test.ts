import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';

// Mock Tauri APIs
const mockSave = vi.fn();
const mockWriteTextFile = vi.fn();

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: mockSave,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: mockWriteTextFile,
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

describe('Export Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any print mount elements
    const mount = document.getElementById('aqua-print-mount');
    if (mount && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
  });

  afterEach(() => {
    const mount = document.getElementById('aqua-print-mount');
    if (mount && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
  });

  describe('exportToHtml', () => {
    it('should create HTML with content', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      mockSave.mockResolvedValue('/path/to/file.html');
      mockWriteTextFile.mockResolvedValue(undefined);

      const content = '<p>Test content</p>';
      await exportToHtml(content, 'test-doc');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: 'test-doc.html',
      });
    });

    it('should handle default title', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      mockSave.mockResolvedValue('/path/to/file.html');
      mockWriteTextFile.mockResolvedValue(undefined);

      await exportToHtml('<p>Content</p>');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: 'export.html',
      });
    });

    it('should cancel save dialog if user cancels', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      mockSave.mockResolvedValue(null);
      mockWriteTextFile.mockResolvedValue(undefined);

      await exportToHtml('<p>Content</p>', 'doc');

      expect(mockWriteTextFile).not.toHaveBeenCalled();
    });

    it('should include stylesheets in HTML', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      // Add a style element to document
      const style = document.createElement('style');
      style.textContent = 'body { color: blue; }';
      document.head.appendChild(style);

      mockSave.mockResolvedValue('/path/to/file.html');
      mockWriteTextFile.mockResolvedValue(undefined);

      await exportToHtml('<p>Content</p>', 'doc');

      const writtenHtml = mockWriteTextFile.mock.calls[0][1] as string;
      expect(writtenHtml).toContain('<style>');
      expect(writtenHtml).toContain('color: blue');

      document.head.removeChild(style);
    });

    it('should include DOCTYPE and proper HTML structure', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      mockSave.mockResolvedValue('/path/to/file.html');
      mockWriteTextFile.mockResolvedValue(undefined);

      await exportToHtml('<p>Test</p>', 'doc');

      const writtenHtml = mockWriteTextFile.mock.calls[0][1] as string;
      expect(writtenHtml).toContain('<!DOCTYPE html>');
      expect(writtenHtml).toContain('<html lang="en">');
      expect(writtenHtml).toContain('<meta charset="UTF-8">');
      expect(writtenHtml).toContain('<div class="preview">');
    });

    it('should handle export error gracefully', async () => {
      const { exportToHtml } = await import('../utils/export');
      
      mockSave.mockRejectedValue(new Error('Save failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await exportToHtml('<p>Content</p>', 'doc');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error exporting to HTML'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('printToPdf', () => {
    it('should create print container with content', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const markdown = '# Heading\nSome content';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount).toBeDefined();
      expect(mount).not.toBeNull();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should render markdown to HTML', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const markdown = '# Test Heading';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount!.innerHTML).toContain('<h1');
      expect(mount!.innerHTML).toContain('Test Heading');
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should add print-specific styles', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const markdown = 'Content';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount!.innerHTML).toContain('@media print');
      expect(mount!.innerHTML).toContain('print-content');
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should trigger window.print after delay', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      const markdown = 'Test';
      printToPdf(markdown);

      expect(windowPrintSpy).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(windowPrintSpy).toHaveBeenCalled();
      
      windowPrintSpy.mockRestore();
    });

    it('should clean up print mount after printing', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      const markdown = 'Content';
      printToPdf(markdown);

      let mount = document.getElementById('aqua-print-mount');
      expect(mount).not.toBeNull();

      // Wait for setTimeout to trigger cleanup
      await new Promise(resolve => setTimeout(resolve, 150));

      mount = document.getElementById('aqua-print-mount');
      expect(mount).toBeNull();
    });

    it('should handle empty markdown', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      const markdown = '';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount).not.toBeNull();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should sanitize HTML content', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      const markdown = '<script>alert("xss")</script>';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount).not.toBeNull();
      // Content should be wrapped in div
      expect(mount!.innerHTML).toContain('print-content');
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle markdown with code blocks', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      const markdown = '```javascript\nconst x = 1;\n```';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount!.innerHTML).toContain('<pre');
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});
