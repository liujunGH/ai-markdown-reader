import { useMemo } from 'react'
import styles from './StatusBar.module.css'

interface Props {
  content: string
}

export function StatusBar({ content }: Props) {
  const stats = useMemo(() => {
    const chars = content.length
    const words = content.trim().split(/\s+/).filter(Boolean).length
    const lines = content.split('\n').length
    const readingTime = Math.ceil(words / 200)
    return { chars, words, lines, readingTime }
  }, [content])

  return (
    <footer className={styles.statusBar}>
      <span>{stats.chars} 字符</span>
      <span>{stats.words} 字</span>
      <span>{stats.lines} 行</span>
      <span>约 {stats.readingTime} 分钟阅读</span>
    </footer>
  )
}
