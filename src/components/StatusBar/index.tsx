import { useMemo } from 'react'
import styles from './StatusBar.module.css'

interface Props {
  content: string
}

export function StatusBar({ content }: Props) {
  const stats = useMemo(() => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.ceil(wordCount / 300)

    const crlfCount = (content.match(/\r\n/g) || []).length
    const lfOnlyCount = (content.replace(/\r\n/g, '').match(/\n/g) || []).length
    const lineEnding = crlfCount > lfOnlyCount ? 'CRLF' : 'LF'

    return { wordCount, readingTime, lineEnding }
  }, [content])

  return (
    <footer className={styles.statusBar}>
      <span>{stats.wordCount} 字</span>
      <span className={styles.separator}>|</span>
      <span>约 {stats.readingTime} 分钟</span>
      <span className={styles.separator}>|</span>
      <span>{stats.lineEnding}</span>
      <span className={styles.separator}>|</span>
      <span>UTF-8</span>
    </footer>
  )
}
