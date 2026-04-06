import { RecentFile } from '../../utils/recentFiles'
import styles from './RecentFiles.module.css'

interface Props {
  files: RecentFile[]
  onSelect: (file: RecentFile) => void
  onClose: () => void
}

export function RecentFiles({ files, onSelect, onClose }: Props) {
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
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      <ul className={styles.list}>
        {files.map((file, index) => (
          <li key={index}>
            <button 
              className={styles.item}
              onClick={() => onSelect(file)}
            >
              <span className={styles.icon}>📄</span>
              <span className={styles.name}>{file.name}</span>
              <span className={styles.time}>
                {formatTime(file.openedAt)}
              </span>
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
