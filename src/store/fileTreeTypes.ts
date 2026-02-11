export interface FileNode {

    name: string;
    path: string;
    is_dir: boolean;
    children?: FileNode[];

};

export interface FlatNode {

    id: string;
    name: string;
    isDir: boolean;
    depth: number;
    node: FileNode;

};

export const flattenTree = (nodes: FileNode[], expandedKeys: Set<string>, depth = 0): FlatNode[] => {
    
    let flat: FlatNode[] = [];

    for (const node of nodes) {
        
        flat.push({ id: node.path, name: node.name, isDir: node.is_dir, depth, node });

        if (node.is_dir && expandedKeys.has(node.path) && node.children) {
            flat.push(...flattenTree(node.children, expandedKeys, depth + 1));
        }

    }

    return flat;

};