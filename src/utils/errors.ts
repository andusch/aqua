import { toastState } from '../store/toastState';

export function formatError(err: unknown): string {
  if (typeof err === 'string') {
    if (err === 'cancelled') return '';
    return err;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function showError(err: unknown, fallback = 'An unexpected error occurred') {
  const message = formatError(err);
  if (!message) return;
  toastState.push(message, 'error');
}

export function showInfo(message: string) {
  toastState.push(message, 'info');
}
