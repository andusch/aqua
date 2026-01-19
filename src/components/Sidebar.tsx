import { createSignal, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';

interface SidebarProps {
  onFileSelect: (path: string) => void;
}

const Sidebar = (props: SidebarProps) => {
  const [files, setFiles] = createSignal<string[]>([]);

  onMount(async () => {
    const fileTree = await invoke<string[]>('get_file_tree');
    setFiles(fileTree);
  });

  return (
    <div class="sidebar">
      <h2>Files</h2>
      <ul>
        {files().map((file) => (
          <li onClick={() => props.onFileSelect(file)}>{file}</li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;