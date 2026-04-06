import { RecentFile } from '../../utils/recentFiles'
import styles from './RecentFiles.module.css'

interface Props {
  files: RecentFile[]
  onSelect: (file: RecentFile) => void
  onRemove: (name: string) => void
  onClearAll: () => void
  onClose: () => void
}

export function RecentFiles({ files, onSelect, onRemove, onClearAll, onClose }: Props) {
  if (files.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span>最近打开</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.empty}>暂无最近文件</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>最近打开</span>
        <div className={styles.actions}>
          <button className={styles.clearBtn} onClick={onClearAll}>清空</button>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
      <ul className={styles.list}>
        {files.map((file, index) => (
          <li key={index} className={styles.itemWrapper}>
            <button 
              className={styles.item}
              onClick={() => onSelect(file)}
            >
              <span className={styles.icon}>📄</span>
              <span className={styles.name}>{file.name}</span>
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
                onRemove(file.name)
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
