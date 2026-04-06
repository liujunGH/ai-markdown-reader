import { useState, useEffect } from 'react'
import styles from './ElectronFolderExplorer.module.css'

interface FileItem {
  name: string
  filePath: string
  size?: number
  lastModified?: number
  isDirectory?: boolean
  children?: FileItem[]
}

interface Props {
  folderPath: string
  folderName: string
  currentFilePath: string
  onFileSelect: (content: string, name: string, filePath: string) => void
  onClose: () => void
}

export function ElectronFolderExplorer({
  folderPath,
  folderName,
  currentFilePath,
  onFileSelect,
  onClose
}: Props) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFolder(folderPath)
  }, [folderPath])

  useEffect(() => {
    if (!window.electronAPI) return
    
    window.electronAPI.onFileChanged((filePath: string) => {
      setChangedFiles(prev => new Set(prev).add(filePath))
    })
  }, [])

  const loadFolder = async (folderPath: string, parentItem?: FileItem) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.readFolder(folderPath)
        if (result.success && result.files) {
          const items: FileItem[] = result.files.map(f => ({
            name: f.name,
            filePath: f.filePath,
            size: f.size,
            lastModified: f.lastModified,
            isDirectory: f.isDirectory || false
          }))
          
          if (parentItem) {
            setFiles(prev => updateChildrenInTree(prev, folderPath, items))
          } else {
            setFiles(items)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load folder:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateChildrenInTree = (items: FileItem[], path: string, children: FileItem[]): FileItem[] => {
    return items.map(item => {
      if (item.filePath === path && item.isDirectory) {
        return { ...item, children }
      }
      if (item.children) {
        return { ...item, children: updateChildrenInTree(item.children, path, children) }
      }
      return item
    })
  }

  const handleRefresh = () => {
    setChangedFiles(new Set())
    setExpandedFolders(new Set())
    loadFolder(folderPath)
  }

  const handleToggleFolder = async (item: FileItem) => {
    if (expandedFolders.has(item.filePath)) {
      setExpandedFolders(prev => {
        const next = new Set(prev)
        next.delete(item.filePath)
        return next
      })
    } else {
      setExpandedFolders(prev => new Set(prev).add(item.filePath))
      if (!item.children || item.children.length === 0) {
        await loadFolder(item.filePath, item)
      }
    }
  }

  const handleFileClick = async (file: FileItem) => {
    if (window.electronAPI) {
      if (changedFiles.has(file.filePath)) {
        setChangedFiles(prev => {
          const next = new Set(prev)
          next.delete(file.filePath)
          return next
        })
      }
      const result = await window.electronAPI.readFile(file.filePath)
      if (result.success && result.content !== undefined) {
        onFileSelect(result.content, file.name, file.filePath)
      }
    }
  }

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.filePath)
    const isChanged = changedFiles.has(item.filePath)

    if (item.isDirectory) {
      return (
        <div key={item.filePath}>
          <button
            className={styles.fileItem}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => handleToggleFolder(item)}
          >
            <span className={styles.fileIcon}>
              {isExpanded ? '📂' : '📁'}
            </span>
            <span className={styles.fileName}>{item.name}</span>
          </button>
          {isExpanded && item.children && (
            <div className={styles.children}>
              {item.children.map(child => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={item.filePath}
        className={`${styles.fileItem} ${currentFilePath === item.filePath ? styles.active : ''} ${isChanged ? styles.changed : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => handleFileClick(item)}
      >
        <span className={styles.fileIcon}>
          {isChanged ? '📄⚡' : '📄'}
        </span>
        <span className={styles.fileName}>{item.name}</span>
        {isChanged && <span className={styles.changedBadge}>已变更</span>}
      </button>
    )
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.folderIcon}>📂</span>
        <span className={styles.folderName}>{folderName}</span>
        <button 
          className={`${styles.refreshBtn} ${changedFiles.size > 0 ? styles.hasChanges : ''}`} 
          onClick={handleRefresh} 
          title={changedFiles.size > 0 ? `刷新 (${changedFiles.size} 个文件有变化)` : '刷新'}
        >
          {changedFiles.size > 0 ? '🔄' : '↻'}
        </button>
        <button 
          className={styles.closeBtn} 
          onClick={onClose} 
          title="关闭"
        >
          ×
        </button>
      </div>
      <div className={styles.fileList}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : files.length === 0 ? (
          <div className={styles.empty}>暂无 Markdown 文件</div>
        ) : (
          files.map(item => renderItem(item))
        )}
      </div>
    </div>
  )
}