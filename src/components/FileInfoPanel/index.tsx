import { useMemo } from 'react'
import styles from './FileInfoPanel.module.css'

interface FileInfo {
  name: string
  size: number
  lastModified: number
  created?: number
}

interface Props {
  fileInfo: FileInfo | null
  onClose: () => void
}

export function FileInfoPanel({ fileInfo, onClose }: Props) {
  const formattedInfo = useMemo(() => {
    if (!fileInfo) return null

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return {
      name: fileInfo.name,
      size: formatSize(fileInfo.size),
      lastModified: formatDate(fileInfo.lastModified),
      created: fileInfo.created ? formatDate(fileInfo.created) : null
    }
  }, [fileInfo])

  if (!formattedInfo) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📋 文件信息</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.content}>
          <div className={styles.row}>
            <span className={styles.label}>文件名</span>
            <span className={styles.value}>{formattedInfo.name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>文件大小</span>
            <span className={styles.value}>{formattedInfo.size}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>修改时间</span>
            <span className={styles.value}>{formattedInfo.lastModified}</span>
          </div>
          {formattedInfo.created && (
            <div className={styles.row}>
              <span className={styles.label}>创建时间</span>
              <span className={styles.value}>{formattedInfo.created}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}