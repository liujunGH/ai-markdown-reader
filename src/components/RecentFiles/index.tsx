import { useState, useMemo } from 'react'
import styles from './RecentFiles.module.css'

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
}

type SortType = 'time' | 'name' | 'path'

export function RecentFiles({ files, onSelect, onRemove, onClearAll, onClose }: Props) {
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
    <div className={styles.container}>
      <div className={styles.header}>
        <span>最近文件</span>
        <div className={styles.actions}>
          <select 
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
          >
            <option value="time">按时间</option>
            <option value="name">按名称</option>
            <option value="path">按路径</option>
          </select>
          {files.length > 0 && (
            <button className={styles.clearBtn} onClick={onClearAll} title="清空历史">清空</button>
          )}
          <button className={styles.closeBtn} onClick={onClose} title="关闭">✕</button>
        </div>
      </div>
      
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索文件名或路径..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      {filteredAndSortedFiles.length === 0 ? (
        <div className={styles.empty}>
          {files.length === 0 ? '暂无最近文件' : '未找到匹配的文件'}
        </div>
      ) : (
        <div className={styles.stats}>
          共 {filteredAndSortedFiles.length} 个文件
        </div>
      )}
      
      <ul className={styles.list}>
        {filteredAndSortedFiles.map((file, index) => (
          <li key={index} className={styles.itemWrapper}>
            <button 
              className={styles.item}
              onClick={() => onSelect(file)}
            >
              <span className={styles.icon}>📄</span>
              <div className={styles.fileInfo}>
                <span className={styles.name}>{file.name}</span>
                <span className={styles.path} title={file.filePath}>{file.filePath}</span>
              </div>
              <span 
                className={styles.time}
                title={formatFullTime(file.openedAt)}
              >
                {formatTime(file.openedAt)}
              </span>
            </button>
            <button 
              className={styles.removeBtn}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(file.filePath)
              }}
              title="删除"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
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

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
