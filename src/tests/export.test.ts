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
