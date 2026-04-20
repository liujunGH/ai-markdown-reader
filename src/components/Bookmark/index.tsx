import { useState, useEffect } from 'react'
import { getStorageItem, setStorageItem } from '../../utils/storage'
import styles from './Bookmark.module.css'

export interface Bookmark {
  id: string
  title: string
  heading: string
  timestamp: number
}

interface Props {
  bookmarks: Bookmark[]
  onAdd: (heading: string) => void
  onRemove: (id: string) => void
  onNavigate: (heading: string) => void
  currentHeading?: string
}

export function BookmarkPanel({ bookmarks, onAdd, onRemove, onNavigate, currentHeading }: Props) {
  const [showPanel, setShowPanel] = useState(false)

  const handleAddBookmark = () => {
    if (currentHeading) {
      onAdd(currentHeading)
    }
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleBtn}
        onClick={() => setShowPanel(!showPanel)}
        title="书签"
      >
        🔖
      </button>
      {showPanel && (
        <div className={styles.panel} aria-label="书签面板">
          <div className={styles.header}>
            <h3>🔖 书签</h3>
            <button className={styles.closeBtn} onClick={() => setShowPanel(false)} aria-label="关闭书签面板">×</button>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.addBtn}
              onClick={handleAddBookmark}
              disabled={!currentHeading}
              title={currentHeading ? '添加书签' : '请先选择一个标题'}
              aria-label={currentHeading ? `添加书签：${currentHeading}` : '添加书签（请先选择一个标题）'}
            >
              + 添加书签
            </button>
          </div>
          {currentHeading && (
            <div className={styles.current}>
              当前: {currentHeading}
            </div>
          )}
          <ul className={styles.list} role="list" aria-label="书签列表">
            {bookmarks.length === 0 ? (
              <li className={styles.emptyState} role="listitem">
                <div className={styles.emptyIcon}>🔖</div>
                <div className={styles.emptyTitle}>暂无书签</div>
                <div className={styles.emptySubtitle}>阅读时点击 🔖 按钮为当前位置添加书签</div>
              </li>
            ) : (
              bookmarks.map(bookmark => (
                <li key={bookmark.id} className={styles.item} role="listitem">
                  <button
                    className={styles.itemContent}
                    onClick={() => onNavigate(bookmark.heading)}
                    aria-label={`跳转到书签：${bookmark.title}`}
                  >
                    <span className={styles.title}>{bookmark.title}</span>
                    <span className={styles.heading}>{bookmark.heading}</span>
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(bookmark.id)}
                    title="删除"
                    aria-label={`删除书签：${bookmark.title}`}
                  >
                    ×
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export function useBookmarks(filename: string) {
  const STORAGE_KEY = `bookmarks-${filename}`

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const stored = getStorageItem(STORAGE_KEY as `bookmarks-${string}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setStorageItem(STORAGE_KEY as `bookmarks-${string}`, JSON.stringify(bookmarks))
  }, [bookmarks, STORAGE_KEY])

  const addBookmark = (heading: string) => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: heading.slice(0, 30) + (heading.length > 30 ? '...' : ''),
      heading,
      timestamp: Date.now()
    }
    setBookmarks(prev => [...prev, newBookmark])
  }

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  return { bookmarks, addBookmark, removeBookmark }
}