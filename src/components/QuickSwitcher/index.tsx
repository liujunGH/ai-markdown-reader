import { useState, useEffect, useRef, useMemo } from 'react'
import { FolderBookmark, getFolderBookmarks, addFolderBookmark, removeFolderBookmark } from '../../utils/folderBookmarks'
import styles from './QuickSwitcher.module.css'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

interface QuickSwitcherProps {
  recentFiles: RecentFile[]
  onFileSelect: (content: string, name: string, filePath: string) => void
  onClose: () => void
  onRemoveRecent: (filePath: string) => void
  onClearRecent: () => void
}

type Tab = 'recent' | 'folders'

interface FolderEntry {
  name: string
  path: string
  isFolder: boolean
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle>
    getFile(): Promise<File>
    queryPermission(options?: { mode?: string }): Promise<PermissionState>
    requestPermission(options?: { mode?: string }): Promise<PermissionState>
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>
  }
}

export default function QuickSwitcher({ recentFiles, onFileSelect, onClose, onRemoveRecent, onClearRecent }: QuickSwitcherProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('recent')
  const [folderBookmarks, setFolderBookmarks] = useState<FolderBookmark[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [folderFiles, setFolderFiles] = useState<Record<string, { name: string; file: File }[]>>({})
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setFolderBookmarks(getFolderBookmarks())
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredRecentFiles = useMemo(() => {
    if (!query.trim()) return recentFiles.slice(0, 20)
    const lower = query.toLowerCase()
    return recentFiles.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.filePath.toLowerCase().includes(lower)
    ).slice(0, 20)
  }, [query, recentFiles])

  const filteredFolders = useMemo(() => {
    if (!query.trim()) return folderBookmarks
    const lower = query.toLowerCase()
    return folderBookmarks.filter(f => f.name.toLowerCase().includes(lower))
  }, [query, folderBookmarks])

  const allItems = useMemo((): FolderEntry[] => {
    if (activeTab === 'recent') {
      return filteredRecentFiles.map(f => ({ name: f.name, path: f.filePath, isFolder: false }))
    }
    const items: FolderEntry[] = []
    filteredFolders.forEach(folder => {
      items.push({ name: folder.name, path: folder.name, isFolder: true })
      if (expandedFolders.has(folder.name) && folderFiles[folder.name]) {
        folderFiles[folder.name].forEach(file => {
          items.push({ name: file.name, path: `${folder.name}/${file.name}`, isFolder: false })
        })
      }
    })
    return items
  }, [activeTab, filteredRecentFiles, filteredFolders, expandedFolders, folderFiles])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeTab])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = allItems[selectedIndex]
      if (item) handleSelect(item)
    }
  }

  const handleSelect = async (item: FolderEntry) => {
    if (item.isFolder) {
      if (expandedFolders.has(item.name)) {
        const newExpanded = new Set(expandedFolders)
        newExpanded.delete(item.name)
        setExpandedFolders(newExpanded)
      } else {
        await expandFolder(item.name)
      }
    } else {
      if (activeTab === 'recent') {
        const file = recentFiles.find(f => f.filePath === item.path)
        if (file && window.electronAPI) {
          const result = await window.electronAPI.readFile(file.filePath)
          if (result.success && result.content !== undefined) {
            onFileSelect(result.content, file.name, file.filePath)
          }
        }
      } else {
        const folderName = item.path.split('/')[0]
        const fileName = item.path.split('/')[1]
        const files = folderFiles[folderName]
        const fileData = files?.find(f => f.name === fileName)
        if (fileData) {
          const content = await fileData.file.text()
          // Folder tab files don't have real paths (browser FileSystemHandle API limitation)
          onFileSelect(content, fileData.name, '')
        }
      }
    }
  }

  const expandFolder = async (folderName: string) => {
    const bookmarks = getFolderBookmarks()
    const bookmark = bookmarks.find(b => b.name === folderName)
    if (!bookmark) return

    setLoadingFolders(prev => new Set(prev).add(folderName))
    try {
      const permission = await bookmark.handle.queryPermission({ mode: 'read' })
      if (permission !== 'granted') {
        const request = await bookmark.handle.requestPermission({ mode: 'read' })
        if (request !== 'granted') return
      }
      const files: { name: string; file: File }[] = []
      for await (const entry of bookmark.handle.values() as AsyncIterableIterator<FileSystemFileHandle>) {
        if (entry.kind === 'file' && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
          const file = await entry.getFile()
          files.push({ name: entry.name, file })
        }
      }
      setFolderFiles(prev => ({ ...prev, [folderName]: files.sort((a, b) => a.name.localeCompare(b.name)) }))
      setExpandedFolders(prev => new Set(prev).add(folderName))
    } catch (err) {
      console.error('Failed to open folder:', err)
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev)
        next.delete(folderName)
        return next
      })
    }
  }

  const handleOpenFolder = async () => {
    if (!window.showDirectoryPicker) {
      alert('您的浏览器不支持打开文件夹功能，请使用 Chrome 或 Edge 浏览器')
      return
    }
    try {
      const handle = await window.showDirectoryPicker()
      await addFolderBookmark(handle.name, handle as unknown as FileSystemDirectoryHandle)
      setFolderBookmarks(getFolderBookmarks())
      setActiveTab('folders')
    } catch {
      // User cancelled
    }
  }

  const handleRemoveBookmark = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await removeFolderBookmark(name)
    setFolderBookmarks(getFolderBookmarks())
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="命令面板">
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="搜索文件..."
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.shortcut}>Ctrl+O</span>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'recent' ? styles.active : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            最近
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'folders' ? styles.active : ''}`}
            onClick={() => setActiveTab('folders')}
          >
            文件夹
          </button>
          {activeTab === 'recent' && recentFiles.length > 0 && (
            <button 
              className={styles.openFolderBtn} 
              onClick={() => {
                if (confirm('确定要清空所有最近文件吗？')) {
                  onClearRecent()
                }
              }}
            >
              🗑️ 清空
            </button>
          )}
          {activeTab === 'folders' && (
            <button className={styles.openFolderBtn} onClick={handleOpenFolder}>
              📂 打开文件夹
            </button>
          )}
        </div>

        <div id="command-list" className={styles.list} ref={listRef} role="listbox">
          {allItems.length === 0 ? (
            <div className={styles.empty}>
              {activeTab === 'recent' ? '暂无最近文件' : '暂无文件夹'}
            </div>
          ) : (
            allItems.map((item, index) => (
              <div
                key={item.path}
                className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <span className={styles.itemIcon}>
                  {item.isFolder ? (
                    expandedFolders.has(item.name) ? '📂' : '📁'
                  ) : (
                    '📄'
                  )}
                </span>
                <div className={styles.itemContent}>
                  <span className={styles.itemName}>{item.name}</span>
                  {activeTab === 'recent' && item.path && (
                    <span className={styles.itemPath}>{item.path}</span>
                  )}
                </div>
                {activeTab === 'recent' && (
                  <button
                    className={styles.removeBtn}
                    onClick={e => {
                      e.stopPropagation()
                      onRemoveRecent(item.path)
                    }}
                    title="从最近文件移除"
                    aria-label={`从最近文件移除 ${item.name}`}
                  >
                    ×
                  </button>
                )}
                {item.isFolder && folderBookmarks.some(b => b.name === item.name) && (
                  <button
                    className={styles.removeBtn}
                    onClick={e => handleRemoveBookmark(item.name, e)}
                    title="移除书签"
                    aria-label={`移除文件夹书签 ${item.name}`}
                  >
                    ×
                  </button>
                )}
                {loadingFolders.has(item.name) && (
                  <span className={styles.loading}>加载中...</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>↑↓ 导航</span>
          <span>Enter 选择</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
