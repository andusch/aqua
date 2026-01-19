import { createSignal, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';

interface SidebarProps {
  onFileSelect: (path: string) => void;
}

const Sidebar = (props: SidebarProps) => {
  const [files, setFiles] = createSignal<string[]>([]);

  const pickFolder = async () => {
    try {
      const fileList = await invoke<string[]>('open_folder_and_list_files');
      setFiles(fileList);
    } catch (err) {
      console.log("Folder pick cancelled or failed:", err);
    }
  }

  return (
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Files</h2>
        <button onClick={pickFolder} class="btn-open">Open Folder</button>
      </div>
      <ul>
        {files().map((file) => (
          <li onClick={() => props.onFileSelect(file)}>
            {file.split(/[/\\]/).pop()}
          </li>
        ))}
      </ul>
    </div>
  );
  
};

export default Sidebar;