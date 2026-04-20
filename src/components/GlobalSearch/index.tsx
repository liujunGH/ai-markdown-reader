import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import styles from './GlobalSearch.module.css'
import { searchInFolder, getIndexedFileCount } from '../../utils/searchIndex'
import { basename } from '../../utils/path'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
  folderPath: string | null
  onOpenFile: (filePath: string) => void
}

interface SearchResult {
  path: string
  name: string
  matches: Array<{ line: number; text: string }>
}

export function GlobalSearch({ isOpen, onClose, folderPath, onOpenFile }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [indexedCount, setIndexedCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const folderName = useMemo(() => {
    if (!folderPath) return ''
    return basename(folderPath) || folderPath
  }, [folderPath])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      if (folderPath) {
        getIndexedFileCount(folderPath).then(setIndexedCount)
      }
    }
  }, [isOpen, folderPath])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setHasSearched(false)
      setIsRegex(false)
    }
  }, [isOpen])

  const performSearch = useCallback(async (searchQuery: string, regex: boolean) => {
    if (!folderPath || !searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const searchResults = await searchInFolder(folderPath, searchQuery, regex)
      setResults(searchResults)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [folderPath])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, isRegex)
    }, 200)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, isRegex, performSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Enter') {
      const firstResult = results[0]
      if (firstResult) {
        onOpenFile(firstResult.path)
        onClose()
      }
      return
    }
  }

  const handleOpenResult = (filePath: string) => {
    onOpenFile(filePath)
    onClose()
  }

  const highlightMatch = (text: string, searchQuery: string, regex: boolean) => {
    if (!searchQuery.trim()) return <span>{text}</span>

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    if (regex) {
      try {
        const pattern = new RegExp(`(${searchQuery})`, 'gi')
        const matches = text.matchAll(pattern)
        for (const match of matches) {
          const index = match.index ?? 0
          if (index > lastIndex) {
            parts.push(text.slice(lastIndex, index))
          }
          parts.push(
            <span key={index} className={styles.highlight}>
              {match[0]}
            </span>
          )
          lastIndex = index + match[0].length
        }
      } catch {
        // Invalid regex, fallback
      }
    } else {
      const lowerQuery = searchQuery.toLowerCase()
      const lowerText = text.toLowerCase()
      let index = lowerText.indexOf(lowerQuery, lastIndex)
      while (index !== -1) {
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index))
        }
        parts.push(
          <span key={index} className={styles.highlight}>
            {text.slice(index, index + searchQuery.length)}
          </span>
        )
        lastIndex = index + searchQuery.length
        index = lowerText.indexOf(lowerQuery, lastIndex)
      }
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return <span>{parts}</span>
  }

  const totalMatches = useMemo(() => results.reduce((sum, r) => sum + r.matches.length, 0), [results])

  if (!isOpen) return null

  return (
    <div className={`${styles.overlay} global-search`} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder={`在 ${folderName || '文件夹'} 中搜索...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                className={styles.clearBtn}
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                title="清除"
              >
                ✕
              </button>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="关闭">✕</button>
        </div>

        <div className={styles.options}>
          <label className={styles.regexLabel}>
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
            />
            正则表达式
          </label>
          <span className={styles.indexStatus}>
            {loading ? '正在搜索...' : `已索引 ${indexedCount} 个文件`}
          </span>
        </div>

        <div className={styles.results}>
          {hasSearched && !loading && results.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔍</div>
              <div className={styles.emptyText}>未找到匹配结果</div>
            </div>
          )}

          {results.map((result) => (
            <div key={result.path} className={styles.resultGroup}>
              <div className={styles.resultGroupTitle}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileName}>{result.name}</span>
              </div>
              {result.matches.map((match, idx) => (
                <button
                  key={idx}
                  className={styles.resultItem}
                  onClick={() => handleOpenResult(result.path)}
                  title={`${result.name} - 第 ${match.line} 行`}
                >
                  <span className={styles.lineNumber}>行 {match.line}:</span>
                  <span className={styles.matchText}>
                    {highlightMatch(match.text, query, isRegex)}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className={styles.footer}>
            <span>共 {results.length} 个文件，{totalMatches} 处匹配</span>
            <span>Enter 打开首个结果 · Esc 关闭</span>
          </div>
        )}
      </div>
    </div>
  )
}
