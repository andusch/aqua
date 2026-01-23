// SolidJS imports
import { createSignal, onCleanup, onMount, Show, For } from 'solid-js';
// Tauri imports
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
// Folder Tree Nodes
import { FileNode } from '../types';
// Theme Toggle Component
import { ThemeToggle } from './ThemeToggle';

// Props
interface SidebarProps {
  onFileSelect: (path: string) => void;
}

const FileTreeItem = (props: {node: FileNode; onSelect: (p: string) => void; depth: number}) => {

  const [expanded, setExpanded] = createSignal(false);

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.node.is_dir) {
      setExpanded(!expanded());
    } else {
      props.onSelect(props.node.path);
    }
  };

  return (
    <div>
      <div
        class="file-item"
        onClick={toggle}
        style={{ "padding-left": `${props.depth * 12 + 12}px` }}
      >
        <span class='icon'>
          {props.node.is_dir ? (expanded() ? '📂' : '📁') : '📄'}
        </span>
        <span class="name">{props.node.name}</span>
      </div>

      <Show when={props.node.is_dir && expanded() && props.node.children}>
        <For each={props.node.children}>
          {(child) => (
            <FileTreeItem 
              node={child} 
              onSelect={props.onSelect} 
              depth={props.depth + 1} 
            />
          )}
        </For>
      </Show>

    </div>
  );

};

// Component
const Sidebar = (props: SidebarProps) => {
  const [fileTree, setFileTree] = createSignal<FileNode[]>([]);
  
  // Pick folder and generate tree
  const pickFolder = async () => {
    try {
      const tree = await invoke<FileNode[]>('open_folder_and_list_files');
      if (tree) {
        setFileTree(tree);
      }
    } catch (err) {
      if (err !== "cancelled") console.error("Error:", err);
    }
  };

  // Listen for refresh events from Rust watcher
  onMount(async () => {
    const unListen = await listen('refresh-files', async () => {
        // In a real app, we'd invoke a 'refresh_tree' command here
        // For now, we rely on the user re-opening or we can add that command later
        console.log("File system changed - reload logic pending");
    });
    onCleanup(() => unListen());
  });

  return (
    <div class="sidebar">
      
      <div class="sidebar-header">
        <h2>Workspace</h2>
        <button onClick={pickFolder} class="btn-open">Open Project</button>
      </div>
      
      <div class="file-tree">
        <For each={fileTree()}>
          {(node) => <FileTreeItem node={node} onSelect={props.onFileSelect} depth={0} />}
        </For>
        <Show when={fileTree().length === 0}>
            <div class="empty-state">No folder open</div>
        </Show>
      </div>

      <ThemeToggle />

    </div>
  );
};

export default Sidebar;