import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface FileChunk {
  content: string;
  is_last: boolean;
}

export async function loadFileChunked(path: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let fullContent = "";
    let unlisten: () => void;

    // 1. Setup Listener
    try {
      unlisten = await listen<FileChunk>('file-chunk', (event) => {
        const { content, is_last } = event.payload;
        fullContent += content;

        if (is_last) {
          unlisten();
          resolve(fullContent);
        }
      });
    } catch (err) {
      reject(err);
      return;
    }

    // 2. Trigger Read
    try {
      await invoke('read_file_chunked', { path });
    } catch (err) {
      if (unlisten) unlisten();
      reject(err);
    }
  });
}