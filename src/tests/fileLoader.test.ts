import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Tauri APIs
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

describe('FileLoader - Chunked File Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load file with single chunk', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    let callbackFn: any;
    
    mockListen.mockImplementation(async (eventName: string, callback: any) => {
      callbackFn = callback;
      // Return unlisten function
      return () => {};
    });

    mockInvoke.mockImplementation(async () => {
      // Simulate file chunk event
      callbackFn({
        payload: {
          content: 'Hello World',
          is_last: true,
        },
      });
    });

    const content = await loadFileChunked('/test/file.md');
    expect(content).toBe('Hello World');
    expect(mockInvoke).toHaveBeenCalledWith('read_file_chunked', { path: '/test/file.md' });
  });

  it('should load file with multiple chunks', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    let callbackFn: any;

    mockListen.mockImplementation(async (eventName: string, callback: any) => {
      callbackFn = callback;
      return () => {};
    });

    mockInvoke.mockImplementation(async () => {
      // Simulate multiple chunk events
      callbackFn({ payload: { content: 'Part 1 ', is_last: false } });
      callbackFn({ payload: { content: 'Part 2 ', is_last: false } });
      callbackFn({ payload: { content: 'Part 3', is_last: true } });
    });

    const content = await loadFileChunked('/test/large.md');
    expect(content).toBe('Part 1 Part 2 Part 3');
  });

  it('should invoke read_file_chunked command', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    let callbackFn: any;
    mockListen.mockImplementation(async (eventName: string, callback: any) => {
      callbackFn = callback;
      return () => {};
    });
    
    mockInvoke.mockImplementation(async () => {
      callbackFn({ payload: { content: '', is_last: true } });
    });

    await loadFileChunked('/some/path.txt');
    expect(mockInvoke).toHaveBeenCalledWith('read_file_chunked', { path: '/some/path.txt' });
  });

  it('should reject on invoke error', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    mockListen.mockResolvedValue(() => {});
    mockInvoke.mockRejectedValueOnce(new Error('File not found'));

    await expect(loadFileChunked('/nonexistent.md')).rejects.toThrow('File not found');
  });

  it('should reject on listen error', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    mockListen.mockRejectedValueOnce(new Error('Listen failed'));

    await expect(loadFileChunked('/test.md')).rejects.toThrow('Listen failed');
  });

  it('should handle empty file', async () => {
    const { loadFileChunked } = await import('../utils/fileLoader');
    
    let callbackFn: any;
    mockListen.mockImplementation(async (eventName: string, callback: any) => {
      callbackFn = callback;
      return () => {};
    });

    mockInvoke.mockImplementation(async () => {
      callbackFn({ payload: { content: '', is_last: true } });
    });

    const content = await loadFileChunked('/empty.md');
    expect(content).toBe('');
  });
});
