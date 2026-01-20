import { createSignal, onCleanup, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface SidebarProps {
  onFileSelect: (path: string) => void;
}

const Sidebar = (props: SidebarProps) => {
  const [files, setFiles] = createSignal<string[]>([]);
  const [currentFolder, setCurrentFolder] = createSignal<string | null>(null);

  const refreshFiles = async () => {
    const folder = currentFolder();
    if(!folder) return;
    try {
      const fileList = await invoke<string[]>('list_files', { path: folder });
      setFiles(fileList);
    } catch (err){
      console.error("Failed to refresh files:", err);
    }
  };

  const pickFolder = async () => {
    try {
      const fileList = await invoke<string[]>('open_folder_and_list_files');
      if (fileList && fileList.length > 0) {
        const firstFilePath = fileList[0];
        const folderPath = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'));

        setCurrentFolder(folderPath);
        setFiles(fileList);
      }
    } catch (err) {
      if (err !== "cancelled") console.log("Error:", err);
    }
    
  }

  onMount(async () => {
    const unListen = await listen('refresh-files', () => {
      refreshFiles();
    });
    onCleanup(() => unListen());
  })

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