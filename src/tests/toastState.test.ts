import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastState } from '../store/toastState';

describe('toastState', () => {
  beforeEach(() => {
    toastState.toasts().forEach((t) => toastState.dismiss(t.id));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should push a toast', () => {
    toastState.push('Test message', 'error');
    expect(toastState.toasts()).toHaveLength(1);
    expect(toastState.toasts()[0].message).toBe('Test message');
    expect(toastState.toasts()[0].variant).toBe('error');
  });

  it('should dismiss a toast by id', () => {
    const id = toastState.push('Dismiss me', 'info');
    toastState.dismiss(id);
    expect(toastState.toasts()).toHaveLength(0);
  });

  it('should auto-dismiss after timeout', () => {
    toastState.push('Auto dismiss', 'success');
    expect(toastState.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    expect(toastState.toasts()).toHaveLength(0);
  });
});
