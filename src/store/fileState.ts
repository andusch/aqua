import { createSignal } from 'solid-js';

const [path, setPath] = createSignal<string | null>(null);
const [modified, setModified] = createSignal(false);

export const fileState = {
  path,
  modified,
  setPath,
  setModified,
  reset: () => {
    setPath(null);
    setModified(false);
  },
};