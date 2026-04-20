import { useState, useEffect, useMemo } from 'react'
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

function filterTree(items: FileItem[], query: string): { items: FileItem[]; hasMatch: boolean } {
  const lowerQuery = query.toLowerCase()
  const result: FileItem[] = []
  let anyMatch = false

  for (const item of items) {
    const nameMatch = item.name.toLowerCase().includes(lowerQuery)
    if (item.isDirectory && item.children) {
      const childResult = filterTree(item.children, query)
      if (nameMatch || childResult.hasMatch) {
        result.push({ ...item, children: childResult.items })
        anyMatch = true
      }
    } else if (nameMatch) {
      result.push(item)
      anyMatch = true
    }
  }

  return { items: result, hasMatch: anyMatch }
}

function HighlightText({ text, query, className }: { text: string; query: string; className?: string }) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>
  }

  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let index = lowerText.indexOf(lowerQuery, lastIndex)

  while (index !== -1) {
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }
    parts.push(
      <span key={index} className={styles.highlight}>
        {text.slice(index, index + query.length)}
      </span>
    )
    lastIndex = index + query.length
    index = lowerText.indexOf(lowerQuery, lastIndex)
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <span className={className}>{parts}</span>
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
  const [filterQuery, setFilterQuery] = useState('')

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
    if (filterQuery.trim()) {
      // 过滤状态下不允许折叠
      return
    }
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

  const filteredTree = useMemo(() => {
    if (!filterQuery.trim()) return files
    return filterTree(files, filterQuery).items
  }, [files, filterQuery])

  const autoExpandedPaths = useMemo(() => {
    if (!filterQuery.trim()) return new Set<string>()
    const paths = new Set<string>()
    function collect(items: FileItem[]) {
      for (const item of items) {
        if (item.isDirectory && item.children && item.children.length > 0) {
          paths.add(item.filePath)
          collect(item.children)
        }
      }
    }
    collect(filteredTree)
    return paths
  }, [filteredTree, filterQuery])

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = filterQuery.trim()
      ? autoExpandedPaths.has(item.filePath)
      : expandedFolders.has(item.filePath)
    const isChanged = changedFiles.has(item.filePath)

    if (item.isDirectory) {
      return (
        <li key={item.filePath} role="treeitem" aria-expanded={isExpanded} style={{ listStyle: 'none' }}>
          <button
            className={styles.fileItem}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => handleToggleFolder(item)}
            aria-label={`文件夹：${item.name}`}
          >
            <span className={styles.fileIcon}>
              {isExpanded ? '📂' : '📁'}
            </span>
            <span className={styles.fileName}>
              <HighlightText text={item.name} query={filterQuery} />
            </span>
          </button>
          {isExpanded && item.children && (
            <ul className={styles.children} role="group">
              {item.children.map(child => renderItem(child, depth + 1))}
            </ul>
          )}
        </li>
      )
    }

    return (
      <li
        key={item.filePath}
        role="treeitem"
        style={{ listStyle: 'none' }}
      >
        <button
          className={`${styles.fileItem} ${currentFilePath === item.filePath ? styles.active : ''} ${isChanged ? styles.changed : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handleFileClick(item)}
          aria-label={`打开文件：${item.name}`}
        >
          <span className={styles.fileIcon}>
            {isChanged ? '📄⚡' : '📄'}
          </span>
          <span className={styles.fileName}>
            <HighlightText text={item.name} query={filterQuery} />
          </span>
          {isChanged && <span className={styles.changedBadge}>已变更</span>}
        </button>
      </li>
    )
  }

  const hasResults = filteredTree.length > 0

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
      <div className={styles.filterWrapper}>
        <span className={styles.filterIcon}>🔍</span>
        <input
          type="text"
          className={styles.filterInput}
          placeholder="过滤文件..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
        {filterQuery && (
          <button
            className={styles.filterClear}
            onClick={() => setFilterQuery('')}
            title="清除"
          >
            ✕
          </button>
        )}
      </div>
      <nav className={styles.fileList} aria-label="文件夹导航">
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : files.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📁</div>
            <div className={styles.emptyTitle}>此文件夹中没有 Markdown 文件</div>
          </div>
        ) : !hasResults ? (
          <div className={styles.empty}>无匹配结果</div>
        ) : (
          <ul role="tree">
            {filteredTree.map(item => renderItem(item))}
          </ul>
        )}
      </nav>
    </div>
  )
}
