import { useState, useMemo } from 'react'
import styles from './RecentFilesPage.module.css'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

interface Props {
  files: RecentFile[]
  onSelect: (file: RecentFile) => void
  onRemove: (filePath: string) => void
  onClearAll: () => void
  onClose: () => void
  onOpenFolder: () => void
}

type SortType = 'time' | 'name' | 'path'

export function RecentFilesPage({ files, onSelect, onRemove, onClearAll, onClose, onOpenFolder }: Props) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('time')

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files]
    
    if (search.trim()) {
      const lower = search.toLowerCase()
      result = result.filter(f => 
        f.name.toLowerCase().includes(lower) ||
        f.filePath.toLowerCase().includes(lower)
      )
    }
    
    result.sort((a, b) => {
      if (sortBy === 'time') return b.openedAt - a.openedAt
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return a.filePath.localeCompare(b.filePath)
    })
    
    return result
  }, [files, search, sortBy])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h2>最近文件</h2>
          <span className={styles.count}>共 {files.length} 个文件</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.openBtn} onClick={onOpenFolder} title="打开文件夹">
            📂 打开文件夹
          </button>
          {files.length > 0 && (
            <button className={styles.clearBtn} onClick={onClearAll} title="清空历史">
              清空历史
            </button>
          )}
          <button className={styles.closeBtn} onClick={onClose} title="返回">
            返回
          </button>
        </div>
      </div>
      
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索文件名或路径..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <select 
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
        >
          <option value="time">按时间排序</option>
          <option value="name">按名称排序</option>
          <option value="path">按路径排序</option>
        </select>
      </div>
      
      <div className={styles.content}>
        {filteredAndSortedFiles.length === 0 ? (
          <div className={styles.empty}>
            {files.length === 0 ? (
              <>
                <div className={styles.emptyIcon}>📂</div>
                <div className={styles.emptyTitle}>暂无最近文件</div>
                <div className={styles.emptySubtitle}>打开一个 Markdown 文件开始阅读</div>
              </>
            ) : (
              <div className={styles.emptyText}>未找到匹配的文件</div>
            )}
          </div>
        ) : (
          <div className={styles.grid} role="list" aria-label="最近文件列表">
            {filteredAndSortedFiles.map((file) => (
              <div key={file.filePath} role="listitem">
                <button
                  className={styles.fileCard}
                  onClick={() => onSelect(file)}
                  aria-label={`打开 ${file.name}`}
                >
                  <div className={styles.fileIcon}>📄</div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName} title={file.name}>{file.name}</div>
                    <div className={styles.filePath} title={file.filePath}>{file.filePath}</div>
                    <div className={styles.fileTime}>{formatTime(file.openedAt)}</div>
                  </div>
                  <button 
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(file.filePath)
                    }}
                    title="删除"
                    aria-label={`从最近文件中删除 ${file.name}`}
                  >
                    ×
                  </button>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  
  return new Date(timestamp).toLocaleDateString('zh-CN')
}