import { useMemo } from 'react'
import { parseMarkdown } from '../../utils/markdownParser'
import styles from './MarkdownRenderer.module.css'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  const html = useMemo(() => parseMarkdown(content), [content])
  
  return (
    <div 
      className={styles.renderer}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
