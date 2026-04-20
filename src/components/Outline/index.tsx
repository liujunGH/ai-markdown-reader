import { useState, useMemo, useEffect } from 'react'
import { OutlineItem } from '../../hooks/useOutline'
import { getStorageItem, setStorageItem } from '../../utils/storage'
import styles from './Outline.module.css'

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

interface Props {
  items: OutlineItem[]
  activeId: string | null
  onItemClick: (id: string) => void
  filePath?: string
}

export function Outline({ items, activeId, onItemClick, filePath }: Props) {
  const storageKey = useMemo(() => {
    const suffix = filePath || simpleHash(JSON.stringify(items))
    return `outline-fold-${suffix}`
  }, [filePath, items])

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = getStorageItem(storageKey as `outline-fold-${string}`)
      if (stored) {
        const arr = JSON.parse(stored) as string[]
        setCollapsedIds(new Set(arr))
      } else {
        setCollapsedIds(new Set())
      }
    } catch {
      setCollapsedIds(new Set())
    }
  }, [storageKey])

  useEffect(() => {
    try {
      setStorageItem(storageKey as `outline-fold-${string}`, JSON.stringify(Array.from(collapsedIds)))
    } catch {}
  }, [collapsedIds, storageKey])

  const isParent = useMemo(() => {
    return items.map((item, i) => i + 1 < items.length && items[i + 1].level > item.level)
  }, [items])

  const visible = useMemo(() => {
    let cutLevel = Infinity
    return items.map((item, i) => {
      if (item.level > cutLevel) {
        return false
      }
      if (collapsedIds.has(item.id) && isParent[i]) {
        cutLevel = item.level
      } else {
        cutLevel = Infinity
      }
      return true
    })
  }, [items, collapsedIds, isParent])

  const toggle = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (items.length === 0) {
    return (
      <nav className={styles.outline} aria-label="文档目录">
        <div className={styles.title}>目录</div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📑</div>
          <div className={styles.emptyTitle}>本文档没有标题层级</div>
          <div className={styles.emptySubtitle}>添加 # 标题来创建目录</div>
        </div>
      </nav>
    )
  }

  return (
    <nav className={styles.outline} aria-label="文档目录">
      <div className={styles.title}>目录</div>
      <ul className={styles.list} role="list">
        {items.map((item, index) => {
          const hidden = !visible[index]
          return (
            <li
              key={`${item.id}-${index}`}
              className={`${styles.item} ${hidden ? styles.hidden : ''}`}
              style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
              role="listitem"
            >
              {isParent[index] && (
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(item.id)
                  }}
                  title={collapsedIds.has(item.id) ? '展开' : '折叠'}
                  aria-label={collapsedIds.has(item.id) ? `展开 ${item.text}` : `折叠 ${item.text}`}
                >
                  {collapsedIds.has(item.id) ? '▸' : '▾'}
                </button>
              )}
              <button
                type="button"
                className={`${styles.link} ${activeId === item.id ? styles.active : ''}`}
                onClick={() => onItemClick(item.id)}
                aria-label={`跳转到 ${item.text}`}
              >
                {item.text}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
