import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { OutlineItem } from '../../hooks/useOutline'
import styles from './QuickJump.module.css'

export interface QuickJumpProps {
  isOpen: boolean
  onClose: () => void
  content: string
  outlineItems: OutlineItem[]
  onJumpToLine: (line: number) => void
  onJumpToHeading: (id: string) => void
  totalLines: number
  showSource: boolean
}

type JumpItem =
  | { type: 'line'; line: number; label: string }
  | { type: 'heading'; id: string; level: number; text: string }
  | { type: 'image'; alt: string; src: string; line: number }

function parseJumpItems(content: string, outlineItems: OutlineItem[]): JumpItem[] {
  const items: JumpItem[] = []
  const lines = content.split('\n')

  // 行号（每 10 行生成一个）
  for (let i = 1; i <= lines.length; i += 10) {
    items.push({ type: 'line', line: i, label: `第 ${i} 行` })
  }

  // 标题（来自 outlineItems）
  outlineItems.forEach(item => {
    items.push({ type: 'heading', id: item.id, level: item.level, text: item.text })
  })

  // 图片
  lines.forEach((line, index) => {
    const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (match) {
      items.push({ type: 'image', alt: match[1], src: match[2], line: index + 1 })
    }
  })

  return items
}

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  let queryIndex = 0
  for (let i = 0; i < lowerText.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) queryIndex++
    if (queryIndex === lowerQuery.length) return true
  }
  return false
}

function getItemSearchText(item: JumpItem): string {
  switch (item.type) {
    case 'line': return `${item.line} ${item.label}`
    case 'heading': return item.text
    case 'image': return `${item.alt} ${item.src}`
  }
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const parts: JSX.Element[] = []
  let textIndex = 0
  let queryIndex = 0
  let key = 0

  while (textIndex < text.length && queryIndex < lowerQuery.length) {
    if (lowerText[textIndex] === lowerQuery[queryIndex]) {
      const start = textIndex
      while (textIndex < text.length && queryIndex < lowerQuery.length && lowerText[textIndex] === lowerQuery[queryIndex]) {
        textIndex++
        queryIndex++
      }
      parts.push(
        <span key={key++} className={styles.highlight}>{text.slice(start, textIndex)}</span>
      )
    } else {
      const start = textIndex
      while (textIndex < text.length && (queryIndex >= lowerQuery.length || lowerText[textIndex] !== lowerQuery[queryIndex])) {
        textIndex++
      }
      parts.push(<span key={key++}>{text.slice(start, textIndex)}</span>)
    }
  }

  if (textIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(textIndex)}</span>)
  }

  return <>{parts}</>
}

export default function QuickJump({
  isOpen,
  onClose,
  content,
  outlineItems,
  onJumpToLine,
  onJumpToHeading,
  totalLines: _totalLines,
  showSource,
}: QuickJumpProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const allItems = useMemo(() => parseJumpItems(content, outlineItems), [content, outlineItems])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const filteredItems = useMemo(() => {
    const q = query.trim()
    if (!q) {
      // 未输入时，根据模式过滤：渲染模式下不显示行号
      return showSource ? allItems : allItems.filter(item => item.type !== 'line')
    }

    const isNumeric = /^\d+$/.test(q)
    const isHeadingQuery = q.startsWith('#')
    const isImageQuery = q.startsWith(':')

    if (isNumeric) {
      const lineNum = parseInt(q, 10)
      // 数字输入：优先匹配行号，也显示其他类型（如果数字出现在文本中）
      return allItems.filter(item => {
        if (item.type === 'line') {
          return String(item.line).startsWith(q)
        }
        return fuzzyMatch(q, getItemSearchText(item))
      }).sort((a, b) => {
        const aIsLine = a.type === 'line'
        const bIsLine = b.type === 'line'
        if (aIsLine && !bIsLine) return -1
        if (!aIsLine && bIsLine) return 1
        if (aIsLine && bIsLine) {
          const aDist = Math.abs((a as Extract<JumpItem, { type: 'line' }>).line - lineNum)
          const bDist = Math.abs((b as Extract<JumpItem, { type: 'line' }>).line - lineNum)
          return aDist - bDist
        }
        return 0
      })
    }

    if (isHeadingQuery) {
      const headingQuery = q.slice(1)
      return allItems.filter(item => item.type === 'heading' && fuzzyMatch(headingQuery, item.text))
    }

    if (isImageQuery) {
      const imageQuery = q.slice(1)
      return allItems.filter(item => item.type === 'image' && fuzzyMatch(imageQuery, `${item.alt} ${item.src}`))
    }

    // 普通搜索
    return allItems.filter(item => {
      if (!showSource && item.type === 'line') return false
      return fuzzyMatch(q, getItemSearchText(item))
    })
  }, [query, allItems, showSource])

  const selectedItem = filteredItems[selectedIndex]

  useEffect(() => {
    if (!selectedItem) return
    const itemEl = itemRefs.current[selectedIndex]
    if (itemEl && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect()
      const itemRect = itemEl.getBoundingClientRect()
      if (itemRect.top < listRect.top) {
        listRef.current.scrollTop -= listRect.top - itemRect.top
      } else if (itemRect.bottom > listRect.bottom) {
        listRef.current.scrollTop += itemRect.bottom - listRect.bottom
      }
    }
  }, [selectedIndex, selectedItem])

  const handleSelect = useCallback((item: JumpItem) => {
    if (item.type === 'line') {
      onJumpToLine(item.line)
    } else if (item.type === 'heading') {
      onJumpToHeading(item.id)
    } else if (item.type === 'image') {
      onJumpToLine(item.line)
    }
    onClose()
  }, [onJumpToLine, onJumpToHeading, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item) {
        handleSelect(item)
      }
      return
    }
  }, [filteredItems, selectedIndex, handleSelect, onClose])

  if (!isOpen) return null

  const getIcon = (item: JumpItem) => {
    switch (item.type) {
      case 'line': return '📄'
      case 'heading': return '#'
      case 'image': return '🖼️'
    }
  }

  const getDisplayText = (item: JumpItem) => {
    switch (item.type) {
      case 'line': return item.label
      case 'heading': return item.text
      case 'image': return item.alt || item.src
    }
  }

  const getMeta = (item: JumpItem) => {
    switch (item.type) {
      case 'line': return `行 ${item.line}`
      case 'heading': return `H${item.level}`
      case 'image': return `行 ${item.line}`
    }
  }

  const searchQueryForHighlight = query.trim()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>⚡</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder={showSource ? '输入行号、#标题或 :图片' : '输入 #标题或 :图片'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              title="清空"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.list} ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className={styles.empty}>未找到匹配结果</div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex
              const displayText = getDisplayText(item)
              const meta = getMeta(item)

              return (
                <div
                  key={`${item.type}-${item.type === 'line' ? item.line : item.type === 'heading' ? item.id : item.src}`}
                  ref={el => { itemRefs.current[index] = el }}
                  className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className={styles.itemIcon}>{getIcon(item)}</span>
                  <span className={styles.itemLabel}>
                    <HighlightMatch text={displayText} query={searchQueryForHighlight} />
                  </span>
                  <span className={styles.itemMeta}>{meta}</span>
                </div>
              )
            })
          )}
        </div>

        <div className={styles.footer}>
          <span>↑↓ 导航</span>
          <span>Enter 跳转</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
