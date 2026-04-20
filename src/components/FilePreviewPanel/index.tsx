import { useState, useMemo } from 'react'
import { OutlineItem } from '../../hooks/useOutline'
import { Bookmark } from '../Bookmark'
import styles from './FilePreviewPanel.module.css'

interface Props {
  fileName: string
  filePath: string
  fileSize?: number
  lastModified?: number
  content: string
  outlineItems: OutlineItem[]
  bookmarks: Bookmark[]
  onNavigate: (id: string) => void
  onBookmarkNavigate: (heading: string) => void
}

type TabType = 'outline' | 'bookmarks' | 'info'

export function FilePreviewPanel({
  fileName,
  filePath,
  fileSize,
  lastModified,
  content,
  outlineItems,
  bookmarks,
  onNavigate,
  onBookmarkNavigate
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('outline')

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = useMemo(() => {
    return {
      headings: (content.match(/^#{1,6}\s/gm) || []).length,
      paragraphs: (content.match(/\n\n|^[^#\n].+/gm) || []).length,
      codeBlocks: (content.match(/^```/gm) || []).length / 2,
      images: (content.match(/!\[/g) || []).length,
      links: (content.match(/(?<!!)\[/g) || []).length,
      tables: (content.match(/\|.*\|/g) || []).length,
      tasks: {
        total: (content.match(/^\s*[-*]\s*\[[ x]\]/gim) || []).length,
        completed: (content.match(/^\s*[-*]\s*\[x\]/gim) || []).length
      },
      wordCount: content.replace(/\s/g, '').length,
      readingTime: Math.ceil(content.replace(/\s/g, '').length / 300)
    }
  }, [content])

  return (
    <div className={styles.panel} role="tabpanel" aria-label="文件预览">
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'outline' ? styles.active : ''}`}
          onClick={() => setActiveTab('outline')}
        >
          📑 目录
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'bookmarks' ? styles.active : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          🔖 书签 {bookmarks.length > 0 && <span className={styles.badge}>{bookmarks.length}</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'info' ? styles.active : ''}`}
          onClick={() => setActiveTab('info')}
        >
          ℹ️ 信息
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'outline' && (
          <div className={styles.section}>
            {outlineItems.length === 0 ? (
              <div className={styles.empty}>暂无目录</div>
            ) : (
              <ul className={styles.list}>
                {outlineItems.map((item, index) => (
                  <li key={index} className={styles.item}>
                    <button
                      className={styles.itemButton}
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                      onClick={() => onNavigate(item.id)}
                    >
                      <span className={styles.itemIcon}>§</span>
                      <span className={styles.itemText}>{item.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className={styles.section}>
            {bookmarks.length === 0 ? (
              <div className={styles.empty}>暂无书签</div>
            ) : (
              <ul className={styles.list}>
                {bookmarks.map(bookmark => (
                  <li key={bookmark.id} className={styles.item}>
                    <button
                      className={styles.itemButton}
                      onClick={() => onBookmarkNavigate(bookmark.heading)}
                    >
                      <span className={styles.bookmarkIcon}>🔖</span>
                      <div className={styles.bookmarkInfo}>
                        <span className={styles.bookmarkTitle}>{bookmark.title}</span>
                        <span className={styles.bookmarkHeading}>{bookmark.heading}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className={styles.section}>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>文件名</span>
                <span className={styles.infoValue} title={fileName}>{fileName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>路径</span>
                <span className={styles.infoValue} title={filePath}>{filePath}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>大小</span>
                <span className={styles.infoValue}>{formatSize(fileSize)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>修改时间</span>
                <span className={styles.infoValue}>{formatDate(lastModified)}</span>
              </div>
            </div>

            <div className={styles.statsDivider} />

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>📌</span>
                <span className={styles.statNumber}>{stats.headings}</span>
                <span className={styles.statLabel}>标题</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>📝</span>
                <span className={styles.statNumber}>{stats.paragraphs}</span>
                <span className={styles.statLabel}>段落</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>💻</span>
                <span className={styles.statNumber}>{Math.floor(stats.codeBlocks)}</span>
                <span className={styles.statLabel}>代码块</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>🖼️</span>
                <span className={styles.statNumber}>{stats.images}</span>
                <span className={styles.statLabel}>图片</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>🔗</span>
                <span className={styles.statNumber}>{stats.links}</span>
                <span className={styles.statLabel}>链接</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>📊</span>
                <span className={styles.statNumber}>{stats.tables}</span>
                <span className={styles.statLabel}>表格</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>✅</span>
                <span className={styles.statNumber}>{stats.tasks.completed}/{stats.tasks.total}</span>
                <span className={styles.statLabel}>任务</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>📖</span>
                <span className={styles.statNumber}>{stats.wordCount}</span>
                <span className={styles.statLabel}>字数</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>⏱️</span>
                <span className={styles.statNumber}>{stats.readingTime}</span>
                <span className={styles.statLabel}>分钟阅读</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}