import { useEffect, useRef, useState, useMemo } from 'react'
import styles from './SearchBox.module.css'
import { Tab } from '../../types/Tab'

interface Props {
  query: string
  isRegex: boolean
  matches: number
  currentMatch: number
  onQueryChange: (query: string) => void
  onRegexChange: (isRegex: boolean) => void
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  searchHistory?: string[]
  onSelectHistory?: (query: string) => void
  tabs?: Tab[]
  activeTabId?: string
  onTabSelect?: (tabId: string) => void
  onNavigateToMatch?: (index: number) => void
}

interface CrossTabMatch {
  tabId: string
  tabName: string
  index: number
  text: string
}

export function SearchBox({
  query,
  isRegex,
  matches,
  currentMatch,
  onQueryChange,
  onRegexChange,
  onNext,
  onPrev,
  onClose,
  searchHistory = [],
  onSelectHistory,
  tabs = [],
  activeTabId,
  onTabSelect,
  onNavigateToMatch
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const allTabMatches = useMemo(() => {
    if (!query.trim() || searchScope !== 'all' || tabs.length === 0) return []

    const results: CrossTabMatch[] = []

    try {
      let pattern: RegExp
      if (isRegex) {
        pattern = new RegExp(query, 'gi')
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        pattern = new RegExp(escaped, 'gi')
      }

      for (const tab of tabs) {
        const content = tab.content
        let match
        let matchIndex = 0
        while ((match = pattern.exec(content)) !== null) {
          results.push({
            tabId: tab.id,
            tabName: tab.name,
            index: matchIndex,
            text: content.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20)
          })
          matchIndex++
          if (results.length >= 200) break
        }
        if (results.length >= 200) break
      }
    } catch {
      return []
    }

    return results
  }, [query, isRegex, searchScope, tabs])

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, CrossTabMatch[]>()
    for (const m of allTabMatches) {
      if (!groups.has(m.tabId)) {
        groups.set(m.tabId, [])
      }
      groups.get(m.tabId)!.push(m)
    }
    return groups
  }, [allTabMatches])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (searchHistory.length > 0) {
        if (!showHistory) {
          setShowHistory(true)
        }
        setHighlightedIndex((prev) => {
          if (prev === -1) return 0
          return (prev + 1) % searchHistory.length
        })
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowUp') {
      if (searchHistory.length > 0) {
        if (!showHistory) {
          setShowHistory(true)
        }
        setHighlightedIndex((prev) => {
          if (prev === -1) return searchHistory.length - 1
          return (prev - 1 + searchHistory.length) % searchHistory.length
        })
        e.preventDefault()
      }
      return
    }

    if (e.key === 'Enter') {
      if (showHistory && highlightedIndex >= 0 && searchHistory.length > 0) {
        handleSelectHistory(searchHistory[highlightedIndex])
        e.preventDefault()
      } else {
        if (e.shiftKey) {
          onPrev()
        } else {
          onNext()
        }
        e.preventDefault()
      }
      return
    }

    if (e.key === 'Escape') {
      if (showHistory) {
        setShowHistory(false)
        setHighlightedIndex(-1)
      } else {
        onClose()
      }
      return
    }
  }

  const handleFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true)
      setHighlightedIndex(-1)
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // 延迟关闭，以便点击历史项
    setTimeout(() => {
      if (!e.relatedTarget?.closest(`.${styles.historyDropdown}`)) {
        setShowHistory(false)
        setHighlightedIndex(-1)
      }
    }, 150)
  }

  const handleSelectHistory = (h: string) => {
    onSelectHistory?.(h)
    setShowHistory(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleCrossTabMatchClick = (tabId: string, matchIndex: number) => {
    if (tabId !== activeTabId) {
      onTabSelect?.(tabId)
    }
    // 延迟跳转，等待标签切换和内容渲染
    setTimeout(() => {
      onNavigateToMatch?.(matchIndex)
    }, 100)
  }

  return (
    <div className={styles.container} role="search" aria-label="文档搜索">
      <div className={styles.inputWrapper}>
        <span className={styles.icon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="搜索..."
          aria-label="搜索关键词"
          aria-describedby="search-hint"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setHighlightedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span id="search-hint" className="sr-only">
          输入关键词搜索文档内容，支持正则表达式
        </span>
        {query && (
          <span className={styles.count} aria-live="polite" aria-atomic="true">
            {searchScope === 'current'
              ? (matches > 0 ? `第 ${currentMatch + 1} 个，共 ${matches} 个匹配` : '无匹配结果')
              : `${allTabMatches.length} 个结果`
            }
          </span>
        )}
        <button className={styles.closeButton} onClick={onClose} title="关闭">✕</button>
      </div>
      {showHistory && searchHistory.length > 0 && (
        <div className={styles.historyDropdown}>
          {searchHistory.map((h, index) => (
            <div
              key={index}
              className={`${styles.historyItem} ${highlightedIndex === index ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelectHistory(h)}
              tabIndex={0}
            >
              <span className={styles.historyIcon}>🕐</span>
              <span className={styles.historyText}>{h}</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.options}>
        <div className={styles.leftOptions}>
          <label className={styles.regexLabel}>
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => onRegexChange(e.target.checked)}
            />
            正则表达式
          </label>
          <div className={styles.scopeToggle}>
            <button
              className={`${styles.scopeBtn} ${searchScope === 'current' ? styles.scopeActive : ''}`}
              onClick={() => setSearchScope('current')}
            >
              仅当前文档
            </button>
            <button
              className={`${styles.scopeBtn} ${searchScope === 'all' ? styles.scopeActive : ''}`}
              onClick={() => setSearchScope('all')}
            >
              所有标签页
            </button>
          </div>
        </div>
        {searchScope === 'current' && matches > 0 && (
          <div className={styles.navButtons}>
            <button onClick={onPrev} className={styles.navBtn} title="上一个匹配">↑</button>
            <button onClick={onNext} className={styles.navBtn} title="下一个匹配">↓</button>
          </div>
        )}
      </div>
      {searchScope === 'all' && query.trim() && (
        <div className={styles.crossTabResults}>
          {allTabMatches.length === 0 ? (
            <div className={styles.noResults}>无结果</div>
          ) : (
            Array.from(groupedMatches.entries()).map(([tabId, matches]) => (
              <div key={tabId} className={styles.resultGroup}>
                <div className={styles.resultGroupTitle}>{matches[0].tabName}</div>
                {matches.map((m, idx) => (
                  <button
                    key={idx}
                    className={styles.resultItem}
                    onClick={() => handleCrossTabMatchClick(tabId, m.index)}
                    title={`第 ${m.index + 1} 个匹配`}
                  >
                    <span className={styles.resultBullet}>·</span>
                    <span className={styles.resultText}>{m.text}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
