import { For } from 'solid-js';
import { toastState } from '../store/toastState';

const ToastContainer = () => {
  return (
    <div class="toast-container" aria-live="polite">
      <For each={toastState.toasts()}>
        {(toast) => (
          <div class={`toast toast-${toast.variant}`} role="alert">
            <span class="toast-message">{toast.message}</span>
            <button
              type="button"
              class="toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => toastState.dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        )}
      </For>
    </div>
  );
};

export default ToastContainer;
