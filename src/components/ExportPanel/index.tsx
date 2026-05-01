import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { parseMarkdown } from '../../utils/markdownParser'
import { resolveLocalImagePath } from '../../utils/imagePaths'
import styles from './ExportPanel.module.css'

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  fileContent: string
  filePath?: string
  theme: string
  accentColor: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function getThemeColors(theme: string) {
  switch (theme) {
    case 'dark':
      return {
        bgPrimary: '#1a1a1a',
        bgSecondary: '#252526',
        textPrimary: '#e0e0e0',
        textSecondary: '#a0a0a0',
        border: '#3d3d3d',
        codeBg: '#2d2d2d',
        linkColor: '#4da6ff',
        quoteBorder: '#555',
        quoteBg: '#2a2a2a',
        tableHeaderBg: '#2d2d2d',
        tableBorder: '#444',
      }
    case 'sepia':
      return {
        bgPrimary: '#f4ecd8',
        bgSecondary: '#ebe1c8',
        textPrimary: '#5c4b37',
        textSecondary: '#8b7355',
        border: '#d4c4a8',
        codeBg: '#e8dec4',
        linkColor: '#b8860b',
        quoteBorder: '#c4b49a',
        quoteBg: '#ece2c8',
        tableHeaderBg: '#e8dec4',
        tableBorder: '#d4c4a8',
      }
    default:
      return {
        bgPrimary: '#ffffff',
        bgSecondary: '#fafafa',
        textPrimary: '#333333',
        textSecondary: '#666666',
        border: '#e5e5e5',
        codeBg: '#f5f5f5',
        linkColor: '#0066cc',
        quoteBorder: '#ddd',
        quoteBg: '#f9f9f9',
        tableHeaderBg: '#f5f5f5',
        tableBorder: '#ddd',
      }
  }
}

function buildExportStyles(theme: string, accentColor: string): string {
  const c = getThemeColors(theme)

  return `
    :root {
      --accent: ${accentColor};
      --bg-primary: ${c.bgPrimary};
      --bg-secondary: ${c.bgSecondary};
      --text-primary: ${c.textPrimary};
      --text-secondary: ${c.textSecondary};
      --border: ${c.border};
      --code-bg: ${c.codeBg};
      --link-color: ${c.linkColor};
      --quote-border: ${c.quoteBorder};
      --quote-bg: ${c.quoteBg};
      --table-header-bg: ${c.tableHeaderBg};
      --table-border: ${c.tableBorder};
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.8;
      font-size: 16px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      line-height: 1.3;
      color: var(--text-primary);
    }
    h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    p { margin: 0 0 1em 0; }
    a { color: var(--link-color); text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; display: block; }
    pre {
      background: var(--code-bg);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 14px;
      line-height: 1.6;
      border: 1px solid var(--border);
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 0.875em;
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 3px;
      color: var(--text-primary);
    }
    pre code { padding: 0; background: none; font-size: inherit; }
    blockquote {
      margin: 0 0 1em 0;
      padding: 0 1em;
      border-left: 4px solid var(--quote-border);
      background: var(--quote-bg);
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
    }
    blockquote p:last-child { margin-bottom: 0; }
    ul, ol { margin: 0 0 1em 0; padding-left: 2em; }
    li { margin-bottom: 0.25em; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1em;
    }
    th, td {
      border: 1px solid var(--table-border);
      padding: 8px 12px;
      text-align: left;
    }
    th { background: var(--table-header-bg); font-weight: 600; }
    tr:nth-child(even) { background: var(--bg-secondary); }
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    .mermaid-wrapper, .mermaid-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 1em;
    }
    @media print {
      body { background: white !important; color: black !important; }
      a { color: black !important; text-decoration: underline !important; }
    }
  `
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function inlineLocalImages(html: string, filePath?: string): Promise<string> {
  if (!window.electronAPI?.readImageAsDataUrl) return html

  const template = document.createElement('template')
  template.innerHTML = html
  const images = Array.from(template.content.querySelectorAll('img'))

  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src') || ''
    const localPath = resolveLocalImagePath(src, filePath)
    if (!localPath) return

    try {
      const result = await window.electronAPI?.readImageAsDataUrl(localPath)
      if (result?.success && result.dataUrl) {
        img.setAttribute('src', result.dataUrl)
      }
    } catch {
      // Keep the original src so the exported HTML remains debuggable.
    }
  }))

  return template.innerHTML
}

export function ExportPanel({ isOpen, onClose, fileName, fileContent, filePath, theme, accentColor }: ExportPanelProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const exportToHTML = useCallback(async () => {
    try {
      const html = await inlineLocalImages(parseMarkdown(fileContent), filePath)
      const title = fileName || 'untitled'
      const css = buildExportStyles(theme, accentColor)
      const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlAttr(title)}</title>
  <style>${css}</style>
</head>
<body>
${html}
</body>
</html>`
      const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = title.replace(/\.md$/, '') + '.html'
      a.click()
      URL.revokeObjectURL(url)
      showToast(t('exportPanel.htmlSuccess'))
    } catch {
      showToast(t('exportPanel.htmlError'), 'error')
    }
  }, [fileContent, fileName, filePath, theme, accentColor, showToast, t])

  const exportToPDF = useCallback(() => {
    const originalTitle = document.title
    document.title = (fileName || 'untitled').replace(/\.md$/, '')
    window.print()
    document.title = originalTitle
  }, [fileName])

  const copyPlainText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fileContent)
      showToast(t('exportPanel.plainTextSuccess'))
    } catch {
      showToast(t('exportPanel.copyError'), 'error')
    }
  }, [fileContent, showToast, t])

  const copyRichText = useCallback(() => {
    try {
      const html = parseMarkdown(fileContent)
      const div = document.createElement('div')
      div.contentEditable = 'true'
      div.style.position = 'fixed'
      div.style.left = '-9999px'
      div.style.top = '-9999px'
      div.innerHTML = html
      document.body.appendChild(div)

      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(div)
      selection?.removeAllRanges()
      selection?.addRange(range)

      const success = document.execCommand('copy')
      selection?.removeAllRanges()
      document.body.removeChild(div)

      if (success) {
        showToast(t('exportPanel.richTextSuccess'))
      } else {
        showToast(t('exportPanel.copyError'), 'error')
      }
    } catch {
      showToast(t('exportPanel.copyError'), 'error')
    }
  }, [fileContent, showToast, t])

  if (!isOpen) return null

  const actions = [
    { icon: '📄', label: t('exportPanel.exportHTML'), onClick: exportToHTML },
    { icon: '🖨️', label: t('exportPanel.printPDF'), onClick: exportToPDF },
    { icon: '📋', label: t('exportPanel.copyPlainText'), onClick: copyPlainText },
    { icon: '📑', label: t('exportPanel.copyRichText'), onClick: copyRichText },
  ]

  return (
    <div className={styles.overlay}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-label={t('exportPanel.title')}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('exportPanel.title')}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.content}>
          <div className={styles.grid}>
            {actions.map(action => (
              <button
                key={action.label}
                className={styles.actionBtn}
                onClick={action.onClick}
              >
                <span className={styles.actionIcon}>{action.icon}</span>
                <span className={styles.actionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
