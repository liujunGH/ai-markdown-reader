import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { parseMarkdown } from '../../utils/markdownParser'
import { getStorageItem, setStorageItem } from '../../utils/storage'
import styles from './MarkdownRenderer.module.css'
import previewStyles from './ImagePreview.module.css'

export interface MarkdownRendererRef {
  getContainer: () => HTMLDivElement | null
}

interface Props {
  content: string
  searchQuery?: string
  searchRegex?: boolean
  currentMatch?: number
  matchCount?: number
  onWikiLinkClick?: (target: string) => void
}

function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function decodeBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)))
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function downloadFile(data: string, filename: string, mimeType: string) {
  const blob = mimeType === 'image/png'
    ? dataToBlob(data, mimeType)
    : new Blob([data], { type: mimeType })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function dataToBlob(data: string, mimeType: string): Blob {
  const byteString = atob(data.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

function buildMermaidContainer(svg: string): HTMLDivElement {
  const containerDiv = document.createElement('div')
  containerDiv.className = 'mermaid-container'

  const svgWrapper = document.createElement('div')
  svgWrapper.className = 'mermaid-svg-wrapper'
  svgWrapper.innerHTML = svg

  const btnContainer = document.createElement('div')
  btnContainer.className = 'mermaid-btn-container'

  const svgBtn = document.createElement('button')
  svgBtn.className = 'mermaid-export-btn'
  svgBtn.innerHTML = '📥 SVG'
  svgBtn.onclick = async () => {
    downloadFile(svg, 'diagram.svg', 'image/svg+xml')
  }

  const pngBtn = document.createElement('button')
  pngBtn.className = 'mermaid-export-btn'
  pngBtn.innerHTML = '📥 PNG'
  pngBtn.onclick = async () => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width * 2
          canvas.height = img.height * 2
          ctx.scale(2, 2)
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          downloadFile(canvas.toDataURL('image/png'), 'diagram.png', 'image/png')
        }
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
      }
    } catch (err) {
      console.error('Failed to export PNG:', err)
    }
  }

  btnContainer.appendChild(svgBtn)
  btnContainer.appendChild(pngBtn)

  containerDiv.appendChild(svgWrapper)
  containerDiv.appendChild(btnContainer)

  return containerDiv
}

let mermaidCache: typeof import('mermaid').default | null = null

export const MarkdownRenderer = forwardRef<MarkdownRendererRef, Props>(({ content, searchQuery = '', searchRegex = false, currentMatch = 0, matchCount = 0, onWikiLinkClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })
  const [ttsButton, setTtsButton] = useState<{ x: number; y: number; text: string } | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useImperativeHandle(ref, () => ({
    getContainer: () => containerRef.current
  }))

  const html = parseMarkdown(content)

  const renderMermaidDiagrams = useCallback(async () => {
    if (!containerRef.current) return
    const container = containerRef.current

    const mermaidEls = container.querySelectorAll('.mermaid[data-code]')
    if (mermaidEls.length === 0) return

    if (!mermaidCache) {
      mermaidCache = (await import('mermaid')).default
    }
    const mermaid = mermaidCache

    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
    })

    mermaidEls.forEach(async (el) => {
      const code = decodeURIComponent(el.getAttribute('data-code') || '')
      const wrapper = el.parentElement
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        if (wrapper) {
          wrapper.setAttribute('data-mermaid-code', encodeURIComponent(code))
          const containerDiv = buildMermaidContainer(svg)
          wrapper.innerHTML = ''
          wrapper.appendChild(containerDiv)
        }
      } catch (err) {
        if (wrapper) {
          wrapper.innerHTML = `<div class="mermaid-error">Mermaid 渲染错误: ${err instanceof Error ? err.message : '未知错误'}</div>`
        }
      }
    })
  }, [])

  const rerenderMermaidForTheme = useCallback(async () => {
    if (!containerRef.current || !mermaidCache) return
    const container = containerRef.current
    const mermaid = mermaidCache

    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
    })

    const wrappers = container.querySelectorAll('.mermaid-wrapper')
    wrappers.forEach(async (wrapper) => {
      const codeAttr = wrapper.getAttribute('data-mermaid-code')
      if (!codeAttr) return
      const code = decodeURIComponent(codeAttr)
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        const containerDiv = buildMermaidContainer(svg)
        wrapper.innerHTML = ''
        wrapper.appendChild(containerDiv)
      } catch (err) {
        wrapper.innerHTML = `<div class="mermaid-error">Mermaid 渲染错误: ${err instanceof Error ? err.message : '未知错误'}</div>`
      }
    })
  }, [])

  const handleSpeak = useCallback((text: string) => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }, [speaking])

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setTtsButton(null)
        return
      }
      const text = selection.toString().trim()
      if (!text) {
        setTtsButton(null)
        return
      }
      const container = containerRef.current
      if (!container) return
      const range = selection.getRangeAt(0)
      if (container.contains(range.commonAncestorContainer)) {
        setTtsButton({ x: e.clientX, y: e.clientY - 44, text })
      }
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && speaking) {
        window.speechSynthesis.cancel()
        setSpeaking(false)
        setTtsButton(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [speaking])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const contentHash = simpleHash(content)

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach((heading) => {
      const text = heading.textContent || ''
      const id = slugify(text)
      heading.id = id
    })

    const links = container.querySelectorAll('a')
    links.forEach((link) => {
      const href = link.getAttribute('href')
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener noreferrer')
      }
    })

    const mermaidElements = container.querySelectorAll('.mermaid-code')
    mermaidElements.forEach((el, index) => {
      const code = decodeBase64(el.getAttribute('data-content') || '')
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-wrapper'
      wrapper.id = `mermaid-${index}`
      wrapper.setAttribute('data-mermaid-code', encodeURIComponent(code))
      wrapper.innerHTML = `<div class="mermaid" data-code="${encodeURIComponent(code)}"></div>`
      el.parentNode?.replaceChild(wrapper, el)
    })

    renderMermaidDiagrams()

    const images = container.querySelectorAll('img')
    images.forEach((img) => {
      img.loading = 'lazy'
      img.classList.add('clickable-image')
      img.addEventListener('click', () => {
        setPreviewImage({ src: img.src, alt: img.alt })
      })
    })

    const preElements = container.querySelectorAll('pre')
    preElements.forEach((pre) => {
      const codeEl = pre.querySelector('code')
      if (!codeEl) return

      const code = codeEl.textContent || ''
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-button'
      copyBtn.innerHTML = '📋'
      copyBtn.title = '复制代码'
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code)
          copyBtn.innerHTML = '✓'
          setTimeout(() => {
            copyBtn.innerHTML = '📋'
          }, 2000)
        } catch {
          copyBtn.innerHTML = '✕'
        }
      })

      pre.style.position = 'relative'
      pre.appendChild(copyBtn)

      // Code folding
      const lineCountAttr = pre.getAttribute('data-lines')
      if (lineCountAttr) {
        const lineCount = parseInt(lineCountAttr, 10)
        if (lineCount > 15) {
          const codeHash = pre.getAttribute('data-code-hash') || ''
          const storageKey = `code-fold-${contentHash}-${codeHash}`
          const isFolded = getStorageItem(storageKey as `code-fold-${string}`) !== 'false'

          const foldBtn = document.createElement('button')
          foldBtn.className = 'code-fold-btn'
          foldBtn.innerHTML = isFolded ? '▸' : '▾'
          foldBtn.title = isFolded ? '展开代码' : '折叠代码'

          if (isFolded) {
            pre.classList.add('code-folded')
          }

          const fade = document.createElement('div')
          fade.className = 'code-fold-fade'
          pre.appendChild(fade)

          foldBtn.addEventListener('click', () => {
            const folded = pre.classList.contains('code-folded')
            if (folded) {
              pre.classList.remove('code-folded')
              foldBtn.innerHTML = '▾'
              foldBtn.title = '折叠代码'
              setStorageItem(storageKey as `code-fold-${string}`, 'false')
            } else {
              pre.classList.add('code-folded')
              foldBtn.innerHTML = '▸'
              foldBtn.title = '展开代码'
              setStorageItem(storageKey as `code-fold-${string}`, 'true')
            }
          })

          pre.appendChild(foldBtn)
        }
      }
    })

    // Task list
    const taskItems = container.querySelectorAll('li')
    taskItems.forEach((li) => {
      const text = li.textContent || ''
      if (text.startsWith('[ ] ') || text.startsWith('[x] ')) {
        const checked = text.startsWith('[x]')
        const taskContent = text.slice(4)
        const storageKey = `task-checks-${contentHash}`
        let checkedLines: number[] = []
        try {
          const stored = getStorageItem(storageKey as `task-checks-${string}`)
          if (stored) checkedLines = JSON.parse(stored)
        } catch {}

        const parent = li.parentElement
        let lineIndex = 0
        if (parent) {
          const siblings = Array.from(parent.children)
          lineIndex = siblings.indexOf(li)
        }
        const isChecked = checkedLines.includes(lineIndex) ? true : checked

        li.innerHTML = `<input type="checkbox" class="task-checkbox" data-line="${lineIndex}" ${isChecked ? 'checked' : ''} /> <span>${escapeHtml(taskContent)}</span>`
        li.classList.add('task-list-item')

        const checkbox = li.querySelector('input.task-checkbox') as HTMLInputElement | null
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const line = parseInt(checkbox.getAttribute('data-line') || '0', 10)
            let lines: number[] = []
            try {
              const stored = getStorageItem(storageKey as `task-checks-${string}`)
              if (stored) lines = JSON.parse(stored)
            } catch {}
            if (checkbox.checked) {
              if (!lines.includes(line)) lines.push(line)
            } else {
              lines = lines.filter(l => l !== line)
            }
            setStorageItem(storageKey as `task-checks-${string}`, JSON.stringify(lines))
          })
        }
      }
    })

    // KaTeX tooltip
    const mathElements = container.querySelectorAll('.katex')
    mathElements.forEach(el => {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]')
      if (annotation) {
        el.setAttribute('data-latex', annotation.textContent || '')
        el.classList.add('katex-tooltip')
      }
    })

    // WikiLink
    const wikiLinks = container.querySelectorAll('a.wikilink')
    wikiLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = link.getAttribute('href')
        if (!href) return
        const target = decodeURIComponent(href.replace('wikilink://', ''))
        if (onWikiLinkClick) {
          onWikiLinkClick(target)
        } else {
          window.dispatchEvent(new CustomEvent('wikilink-click', { detail: { target } }))
        }
      })
    })
  }, [content, renderMermaidDiagrams, onWikiLinkClick])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Clear existing highlights first
    const existingMarks = container.querySelectorAll('.search-highlight')
    existingMarks.forEach(mark => {
      const parent = mark.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
        parent.normalize()
      }
    })

    if (!searchQuery) return

    // Also clear search-active class
    const activeMarks = container.querySelectorAll('.current')
    activeMarks.forEach(mark => {
      mark.classList.remove('search-highlight-active')
    })

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    )

    const textNodes: Text[] = []
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text)
    }

    textNodes.forEach(textNode => {
      if (!textNode.textContent) return
      const parent = textNode.parentElement
      if (!parent || parent.closest('.search-box')) return
      if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return
      if (parent.classList.contains('search-highlight')) return

      let nodeHtml = textNode.textContent
      let hasMatch = false

      try {
        const pattern = searchRegex
          ? new RegExp(`(${searchQuery})`, 'gi')
          : new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')

        if (pattern.test(nodeHtml)) {
          hasMatch = true
          nodeHtml = nodeHtml.replace(pattern, '<mark class="search-highlight">$1</mark>')
        }
      } catch {
        // Invalid regex, skip
      }

      if (hasMatch) {
        const span = document.createElement('span')
        span.innerHTML = nodeHtml
        textNode.parentNode?.replaceChild(span, textNode)
      }
    })

    // Mark the current active match
    if (matchCount > 0 && containerRef.current) {
      const allMarks = containerRef.current.querySelectorAll('.search-highlight')
      if (allMarks[currentMatch]) {
        allMarks[currentMatch].classList.add('search-highlight-active')
        allMarks[currentMatch].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [searchQuery, searchRegex, currentMatch, matchCount])

  const handleClosePreview = () => {
    setPreviewImage(null)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        handleClosePreview()
      }
    }
    if (previewImage) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewImage])

  // Theme change observer
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          rerenderMermaidForTheme()
          break
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => {
      observer.disconnect()
    }
  }, [rerenderMermaidForTheme])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(5, Math.max(0.25, parseFloat((prev + delta).toFixed(2)))))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPosition({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, parseFloat((prev + 0.25).toFixed(2))))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))))
  }

  const handleZoomReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleZoomFit = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <>
      <div
        ref={containerRef}
        className={styles.renderer}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {ttsButton && (
        <button
          className="tts-float-btn"
          style={{ left: ttsButton.x, top: ttsButton.y }}
          onClick={() => handleSpeak(ttsButton.text)}
          title={speaking ? '停止朗读' : '朗读选中文字'}
        >
          {speaking ? '⏹' : '🔊'}
        </button>
      )}
      {previewImage && (
        <div
          className={previewStyles.overlay}
          onClick={handleClosePreview}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <button className={previewStyles.closeButton} onClick={handleClosePreview}>✕</button>
          <div className={previewStyles.controls}>
            <button onClick={handleZoomOut} title="缩小">−</button>
            <span className={previewStyles.scaleText}>{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} title="放大">+</button>
            <button onClick={handleZoomReset} title="1:1">1:1</button>
            <button onClick={handleZoomFit} title="适应屏幕">适应</button>
          </div>
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className={previewStyles.fullImage}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </>
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'
