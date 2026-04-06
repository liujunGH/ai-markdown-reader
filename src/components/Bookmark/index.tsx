import { useState, useEffect } from 'react'
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
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3>🔖 书签</h3>
            <button className={styles.closeBtn} onClick={() => setShowPanel(false)}>×</button>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.addBtn}
              onClick={handleAddBookmark}
              disabled={!currentHeading}
              title={currentHeading ? '添加书签' : '请先选择一个标题'}
            >
              + 添加书签
            </button>
          </div>
          {currentHeading && (
            <div className={styles.current}>
              当前: {currentHeading}
            </div>
          )}
          <div className={styles.list}>
            {bookmarks.length === 0 ? (
              <div className={styles.empty}>暂无书签</div>
            ) : (
              bookmarks.map(bookmark => (
                <div key={bookmark.id} className={styles.item}>
                  <button
                    className={styles.itemContent}
                    onClick={() => onNavigate(bookmark.heading)}
                  >
                    <span className={styles.title}>{bookmark.title}</span>
                    <span className={styles.heading}>{bookmark.heading}</span>
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(bookmark.id)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function useBookmarks(filename: string) {
  const STORAGE_KEY = `bookmarks-${filename}`

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
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