import { useState, useMemo } from 'react'
import styles from './FloatingTOC.module.css'
import type { OutlineItem } from '../../hooks/useOutline'

interface FloatingTOCProps {
  outlineItems: OutlineItem[]
  activeHeadingId: string | null
  onNavigate: (id: string) => void
}

export function FloatingTOC({ outlineItems, activeHeadingId, onNavigate }: FloatingTOCProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeIndex = useMemo(() => {
    return outlineItems.findIndex(item => item.id === activeHeadingId)
  }, [outlineItems, activeHeadingId])

  const nearbyItems = useMemo(() => {
    if (activeIndex === -1) return outlineItems.slice(0, 5)
    const start = Math.max(0, activeIndex - 2)
    const end = Math.min(outlineItems.length, start + 5)
    return outlineItems.slice(start, end)
  }, [outlineItems, activeIndex])

  const currentItem = useMemo(() => {
    return outlineItems.find(item => item.id === activeHeadingId)
  }, [outlineItems, activeHeadingId])

  if (outlineItems.length < 3) return null

  return (
    <div
      className={styles.floatingToc}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={styles.currentTitle}>
        <span className={styles.icon}>▸</span>
        <span className={styles.text} title={currentItem?.text || ''}>
          {currentItem?.text || '目录'}
        </span>
      </div>
      {isExpanded && (
        <div className={styles.menu}>
          {nearbyItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${item.id === activeHeadingId ? styles.menuItemActive : ''}`}
              style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
              onClick={() => onNavigate(item.id)}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
