import { useState, useEffect, useRef } from 'react'
import styles from './SearchBox.module.css'

interface Props {
  onSearch: (query: string, isRegex: boolean) => void
  onClose: () => void
}

export function SearchBox({ onSearch, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    onSearch(query, isRegex)
  }, [query, isRegex, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>
      <label className={styles.regexLabel}>
        <input
          type="checkbox"
          checked={isRegex}
          onChange={(e) => setIsRegex(e.target.checked)}
        />
        正则表达式
      </label>
    </div>
  )
}
