import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './SourceView.module.css'

interface SourceViewProps {
  content: string
  highlightedLine?: number
}

export function SourceView({ content, highlightedLine: propHighlightedLine }: SourceViewProps) {
  const [clickedLine, setClickedLine] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const lines = content.split('\n')
  const totalDigits = String(lines.length).length
  const lineNumberWidth = Math.max(40, totalDigits * 12 + 16)

  const highlightedLine = propHighlightedLine ?? clickedLine

  const handleLineClick = useCallback((lineIndex: number) => {
    setClickedLine(prev => (prev === lineIndex + 1 ? null : lineIndex + 1))
  }, [])

  useEffect(() => {
    if (highlightedLine && contentRef.current) {
      const lineEl = contentRef.current.children[highlightedLine - 1] as HTMLElement | undefined
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedLine])

  return (
    <div className={styles.container}>
      <div className={styles.lineNumbers} style={{ width: `${lineNumberWidth}px` }}>
        {lines.map((_, i) => (
          <div
            key={i}
            className={`${styles.lineNumber} ${highlightedLine === i + 1 ? styles.highlighted : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className={styles.content} ref={contentRef}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${styles.line} ${highlightedLine === i + 1 ? styles.highlighted : ''}`}
            onClick={() => handleLineClick(i)}
          >
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  )
}
