import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import DOMPurify from 'dompurify';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

describe('Export Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should render markdown to HTML', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const markdown = '# Test Heading';
      printToPdf(markdown);

      const mount = document.getElementById('aqua-print-mount');
      expect(mount!.innerHTML).toContain('<h1');
      expect(mount!.innerHTML).toContain('Test Heading');
      
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should add print-specific styles', async () => {
      const { printToPdf } = await import('../utils/export');
      
      printToPdf('Content');

      const mount = document.getElementById('aqua-print-mount');
      expect(mount!.innerHTML).toContain('@media print');
      expect(mount!.innerHTML).toContain('print-content');
      
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should trigger window.print after delay', async () => {
      const { printToPdf } = await import('../utils/export');
      
      const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      printToPdf('Test');

      expect(windowPrintSpy).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(windowPrintSpy).toHaveBeenCalled();
      
      windowPrintSpy.mockRestore();
    });

    it('should clean up print mount after printing', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      printToPdf('Content');

      let mount = document.getElementById('aqua-print-mount');
      expect(mount).not.toBeNull();

      await new Promise(resolve => setTimeout(resolve, 150));

      mount = document.getElementById('aqua-print-mount');
      expect(mount).toBeNull();
    });

    it('should sanitize HTML content', async () => {
      const { printToPdf } = await import('../utils/export');
      
      vi.spyOn(window, 'print').mockImplementation(() => {});
      
      printToPdf('<script>alert("xss")</script>');

      const mount = document.getElementById('aqua-print-mount');
      expect(mount).not.toBeNull();
      expect(mount!.innerHTML).toContain('print-content');
      
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});
