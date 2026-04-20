import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './CustomStylePanel.module.css'

interface CustomStylePanelProps {
  isOpen: boolean
  onClose: () => void
  customCSS: string
  onChange: (css: string) => void
}

const PRESET_CSS = `/* 调整正文字号 */
.markdown-body p {
  font-size: 1.1em;
  line-height: 1.9;
}

/* 调整标题颜色 */
.markdown-body h1 {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}

/* 调整代码块样式 */
.markdown-body pre {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 调整引用块 */
.markdown-body blockquote {
  border-left-width: 4px;
  font-style: italic;
}`

export function CustomStylePanel({ isOpen, onClose, customCSS, onChange }: CustomStylePanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localCSS, setLocalCSS] = useState(customCSS)

  useEffect(() => {
    if (isOpen) {
      setLocalCSS(customCSS)
    }
  }, [isOpen, customCSS])

  const handleChange = useCallback((value: string) => {
    setLocalCSS(value)
    onChange(value)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const newValue = localCSS.substring(0, start) + '  ' + localCSS.substring(end)
      handleChange(newValue)
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2
      })
    }
  }

  const handleApply = () => {
    onChange(localCSS)
    onClose()
  }

  const handleReset = () => {
    handleChange('')
  }

  const handlePreset = () => {
    handleChange(PRESET_CSS)
  }

  const lines = localCSS.split('\n')
  const lineCount = Math.max(lines.length, 1)

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>自定义样式</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className={styles.editor}>
          <div className={styles.lineNumbers} aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className={styles.lineNumber}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={localCSS}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        <div className={styles.footer}>
          <div className={styles.leftActions}>
            <button className={styles.presetBtn} onClick={handlePreset}>
              填入示例
            </button>
            <button className={styles.resetBtn} onClick={handleReset}>
              重置
            </button>
          </div>
          <div className={styles.rightActions}>
            <button className={styles.applyBtn} onClick={handleApply}>
              应用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
