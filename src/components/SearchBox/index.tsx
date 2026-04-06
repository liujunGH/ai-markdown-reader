import { useEffect, useRef } from 'react'
import styles from './SearchBox.module.css'

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
  onClose
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
      e.preventDefault()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <span className={styles.icon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="搜索..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <span className={styles.count}>
            {matches > 0 ? `${currentMatch + 1}/${matches}` : '无结果'}
          </span>
        )}
        <button className={styles.closeButton} onClick={onClose} title="关闭">✕</button>
      </div>
      <div className={styles.options}>
        <label className={styles.regexLabel}>
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => onRegexChange(e.target.checked)}
          />
          正则表达式
        </label>
        {matches > 0 && (
          <div className={styles.navButtons}>
            <button onClick={onPrev} className={styles.navBtn} title="上一个匹配">↑</button>
            <button onClick={onNext} className={styles.navBtn} title="下一个匹配">↓</button>
          </div>
        )}
      </div>
    </div>
  )
}
