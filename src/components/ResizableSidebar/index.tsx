import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import styles from './ResizableSidebar.module.css'

interface Props {
  children: ReactNode
  side: 'left' | 'right'
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  storageKey: string
  onToggle?: () => void
  isOpen: boolean
}

export function ResizableSidebar({
  children,
  side,
  defaultWidth = 240,
  minWidth = 160,
  maxWidth = 500,
  storageKey,
  onToggle,
  isOpen,
}: Props) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(`sidebar-width-${storageKey}`)
      return saved ? Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))) : defaultWidth
    } catch {
      return defaultWidth
    }
  })
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = width
    },
    [width]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'left' ? e.clientX - startXRef.current : startXRef.current - e.clientX
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      try {
        localStorage.setItem(`sidebar-width-${storageKey}`, String(startWidthRef.current))
      } catch {
        // ignore
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, side, minWidth, maxWidth, storageKey])

  // Update saved width when resizing ends
  useEffect(() => {
    if (!isResizing) {
      try {
        localStorage.setItem(`sidebar-width-${storageKey}`, String(width))
      } catch {
        // ignore
      }
    }
  }, [width, isResizing, storageKey])

  if (!isOpen) {
    return (
      <button
        className={`${styles.collapseBtn} ${styles[`collapseBtn-${side}`]}`}
        onClick={onToggle}
        title={side === 'left' ? '展开文件列表' : '展开目录'}
      >
        {side === 'left' ? '▸' : '◂'}
      </button>
    )
  }

  return (
    <div
      className={`${styles.sidebar} ${styles[`sidebar-${side}`]} ${isResizing ? styles.resizing : ''}`}
      style={{ width }}
    >
      <div className={styles.content}>{children}</div>
      <div
        className={`${styles.resizer} ${styles[`resizer-${side}`]}`}
        onMouseDown={handleMouseDown}
        title="拖拽调整宽度"
      />
      <button
        className={`${styles.toggleBtn} ${styles[`toggleBtn-${side}`]}`}
        onClick={onToggle}
        title={side === 'left' ? '收起文件列表' : '收起目录'}
      >
        {side === 'left' ? '◂' : '▸'}
      </button>
    </div>
  )
}
