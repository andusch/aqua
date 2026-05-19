import { createSignal } from 'solid-js';

export type ToastVariant = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);
let nextId = 0;

export const toastState = {
  toasts,
  push(message: string, variant: ToastVariant = 'error') {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => toastState.dismiss(id), 5000);
    return id;
  },
  dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  },
};
