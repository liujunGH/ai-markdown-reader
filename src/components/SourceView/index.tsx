import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './SourceView.module.css'

interface SourceViewProps {
  content: string
  highlightedLine?: number
  editable?: boolean
  onSave?: (content: string) => Promise<void> | void
}

export function SourceView({ content, highlightedLine: propHighlightedLine, editable = false, onSave }: SourceViewProps) {
  const [clickedLine, setClickedLine] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const lines = content.split('\n')
  const totalDigits = String(lines.length).length
  const lineNumberWidth = Math.max(40, totalDigits * 12 + 16)

  const highlightedLine = propHighlightedLine ?? clickedLine

  const handleLineClick = useCallback((lineIndex: number) => {
    setClickedLine(prev => (prev === lineIndex + 1 ? null : lineIndex + 1))
  }, [])

  const startEditing = useCallback(() => {
    setDraft(content)
    setIsEditing(true)
  }, [content])

  const cancelEditing = useCallback(() => {
    setDraft(content)
    setIsEditing(false)
  }, [content])

  const saveDraft = useCallback(async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(draft)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [draft, onSave])

  useEffect(() => {
    if (highlightedLine && contentRef.current) {
      const lineEl = contentRef.current.children[highlightedLine - 1] as HTMLElement | undefined
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedLine])

  if (isEditing) {
    return (
      <div className={styles.editorShell}>
        <div className={styles.editorToolbar}>
          <span>源码编辑</span>
          <div className={styles.editorActions}>
            <button onClick={cancelEditing} disabled={isSaving}>取消</button>
            <button onClick={saveDraft} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</button>
          </div>
        </div>
        <textarea
          className={styles.editor}
          value={draft}
          spellCheck={false}
          onChange={event => setDraft(event.target.value)}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {editable && onSave && (
        <button className={styles.editButton} onClick={startEditing}>编辑</button>
      )}
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
