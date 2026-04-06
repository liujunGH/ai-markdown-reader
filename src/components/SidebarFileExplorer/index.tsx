import { useState, useEffect } from 'react'
import styles from './SidebarFileExplorer.module.css'

interface FileNode {
  name: string
  path: string
  isFolder: boolean
  children?: FileNode[]
  file?: File
}

interface SidebarFileExplorerProps {
  folderName: string
  handle: FileSystemDirectoryHandle
  currentFilePath: string
  onFileSelect: (content: string, name: string, path: string) => void
  onClose: () => void
}

function buildFileTree(handle: FileSystemDirectoryHandle, basePath: string = ''): Promise<FileNode[]> {
  return new Promise(async (resolve) => {
    const nodes: FileNode[] = []
    
    for await (const entry of handle.values()) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name
      const kind = (entry as any).kind as string
      
      if (kind === 'directory') {
        try {
          const subHandle = await handle.getDirectoryHandle(entry.name)
          const children = await buildFileTree(subHandle, entryPath)
          if (children.length > 0) {
            nodes.push({
              name: entry.name,
              path: entryPath,
              isFolder: true,
              children
            })
          }
        } catch {
          // Skip inaccessible folders
        }
      } else if (kind === 'file' && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
        const file = await entry.getFile()
        nodes.push({
          name: entry.name,
          path: entryPath,
          isFolder: false,
          file
        })
      }
    }
    
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
    
    resolve(nodes)
  })
}

function FileTreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
  onFileClick,
  currentFilePath
}: {
  node: FileNode
  depth: number
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onFileClick: (name: string, file: File, path: string) => void
  currentFilePath: string
}) {
  const isExpanded = expandedPaths.has(node.path)
  const paddingLeft = depth * 16 + 8

  if (node.isFolder) {
    return (
      <div>
        <button
          className={styles.treeItem}
          style={{ paddingLeft }}
          onClick={() => onToggle(node.path)}
        >
          <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
          <span className={styles.folderIcon}>📁</span>
          <span className={styles.nodeName}>{node.name}</span>
        </button>
        {isExpanded && node.children?.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
            onFileClick={onFileClick}
            currentFilePath={currentFilePath}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      className={`${styles.treeItem} ${styles.fileItem} ${node.path === currentFilePath ? styles.active : ''}`}
      style={{ paddingLeft }}
      onClick={() => node.file && onFileClick(node.name, node.file, node.path)}
    >
      <span className={styles.fileIcon}>📄</span>
      <span className={styles.nodeName}>{node.name}</span>
    </button>
  )
}

export function SidebarFileExplorer({
  folderName,
  handle,
  currentFilePath,
  onFileSelect,
  onClose
}: SidebarFileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [localActivePath, setLocalActivePath] = useState<string>('')
  
  const activePath = currentFilePath || localActivePath
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFileTree()
  }, [handle])

  const loadFileTree = async () => {
    setLoading(true)
    try {
      const tree = await buildFileTree(handle)
      setFileTree(tree)
      if (tree.length > 0) {
        const firstFolder = findFirstFolder(tree)
        if (firstFolder) {
          setExpandedPaths(new Set([firstFolder]))
        }
      }
    } catch (err) {
      console.error('Failed to load file tree:', err)
    } finally {
      setLoading(false)
    }
  }

  const findFirstFolder = (nodes: FileNode[]): string | null => {
    for (const node of nodes) {
      if (node.isFolder) return node.path
      if (node.children) {
        const found = findFirstFolder(node.children)
        if (found) return found
      }
    }
    return null
  }

  const handleToggle = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const handleFileClick = async (name: string, file: File, path: string) => {
    const content = await file.text()
    setLocalActivePath(path)
    onFileSelect(content, name, path)
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.folderIcon}>📂</span>
        <span className={styles.folderName}>{folderName}</span>
        <button className={styles.closeBtn} onClick={onClose} title="关闭">×</button>
      </div>
      <div className={styles.fileList}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : fileTree.length === 0 ? (
          <div className={styles.empty}>暂无 Markdown 文件</div>
        ) : (
          fileTree.map(node => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onFileClick={handleFileClick}
              currentFilePath={activePath}
            />
          ))
        )}
      </div>
    </div>
  )
}
