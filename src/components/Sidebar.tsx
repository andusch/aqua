// SolidJS imports
import { createSignal, onCleanup, onMount, Show, For, createMemo } from 'solid-js';
// Tauri imports
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
// Folder Tree Nodes
import {FileNode, FlatNode, flattenTree} from '../store/fileTreeTypes';
// Theme Toggle Component
import { ThemeToggle } from './ThemeToggle';

import { createVirtualizer } from '@tanstack/solid-virtual';

// Props
interface SidebarProps {
  onFileSelect: (path: string) => void;
}

const ITEM_HEIGHT = 30; // Height of each file tree item in pixels

const VirtualizedFileTreeItem = (props: {
  flatNode: FlatNode;
  onSelect: (p: string) => void;
  isExpanded: boolean;
  onToggle: (path: string) => void;
}) => {
  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.flatNode.isDir) {
      props.onToggle(props.flatNode.id);
    } else {
      props.onSelect(props.flatNode.id);
    }
  };

  return (
    <div
      class="file-item"
      onClick={toggle}
      style={{ "padding-left": `${props.flatNode.depth * 12 + 12}px`, height: `${ITEM_HEIGHT}px`, "line-height": `${ITEM_HEIGHT}px` }}
    >
      <span class='icon'>
        {props.flatNode.isDir ? (props.isExpanded ? '📂' : '📁') : '📄'}
      </span>
      <span class="name">{props.flatNode.name}</span>
    </div>
  );
};

// Component
const Sidebar = (props: SidebarProps) => {
  const [fileTree, setFileTree] = createSignal<FileNode[]>([]);
  const [currentRoot, setCurrentRoot] = createSignal<string | null>(null);
  const [expandedKeys, setExpandedKeys] = createSignal<Set<string>>(new Set());
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | undefined>(undefined);
  
  // Create a memoized flattened tree that updates whenever fileTree or expandedKeys change
  const flattenedTree = createMemo(() => {
    return flattenTree(fileTree(), expandedKeys());
  });

  // Virtualizer setup
  const virtualizer = createMemo(() => {
    const container = containerRef();
    if (!container) return null;
    return createVirtualizer({
      count: flattenedTree().length,
      getScrollElement: () => container,
      estimateSize: () => ITEM_HEIGHT,
      overscan: 10, // Render 10 extra items above and below viewport for smoother scrolling
    });
  });

  const virtualItems = createMemo(() => {
    return virtualizer()?.getVirtualItems() ?? [];
  });

  const totalSize = createMemo(() => {
    return virtualizer()?.getTotalSize() ?? 0;
  });

  // Toggle folder expansion
  const toggleExpanded = (path: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };
  
  // Pick folder and generate tree
  const pickFolder = async () => {
    try {
      const result = await invoke<{path: string, tree: FileNode[]}>('open_folder_and_list_files');
      if (result) {
        setFileTree(result.tree);
        setCurrentRoot(result.path);
        setExpandedKeys(new Set<string>()); // Reset expanded keys when opening new folder
      }
    } catch (err) {
      if (err !== "cancelled") console.error("Error:", err);
    }
  };

  // Refresh tree data from Rust
  const refreshTree = async () => {

    const path = currentRoot();
    
    if (!path) return;

    try {
      const updatedTree = await invoke<FileNode[]>('get_directory_tree', {path});
      setFileTree(updatedTree);
    } catch (err){
      console.error("Failed to refresh tree:", err);
    }

  };

  // Listen for refresh events from Rust watcher
  onMount(async () => {
    const unListen = await listen('refresh-files', async () => {
        console.log("File system change detected!");
        refreshTree();
    });
    onCleanup(() => unListen());
  });

  return (
    <div class="sidebar">
      
      <div class="sidebar-header">
        <h2>Workspace</h2>
        <button onClick={pickFolder} class="btn-open">Open Project</button>
      </div>
      
      <div class="file-tree" ref={setContainerRef}>
        <div style={{ height: `${totalSize()}px` }}>
          <For each={virtualItems()}>
            {(virtualItem) => {
              const flatNode = flattenedTree()[virtualItem.index];
              return (
                <div
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                    position: 'absolute',
                    width: '100%',
                  }}
                >
                  <VirtualizedFileTreeItem
                    flatNode={flatNode}
                    onSelect={props.onFileSelect}
                    isExpanded={expandedKeys().has(flatNode.id)}
                    onToggle={toggleExpanded}
                  />
                </div>
              );
            }}
          </For>
        </div>
        <Show when={fileTree().length === 0}>
            <div class="empty-state">No folder open</div>
        </Show>
      </div>

      <ThemeToggle />

    </div>
  );
};

export default Sidebar;