import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { parseMarkdown } from '../../utils/markdownParser'
import styles from './MarkdownRenderer.module.css'
import previewStyles from './ImagePreview.module.css'

export interface MarkdownRendererRef {
  getContainer: () => HTMLDivElement | null
}

interface Props {
  content: string
  searchQuery?: string
  searchRegex?: boolean
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

export const MarkdownRenderer = forwardRef<MarkdownRendererRef, Props>(({ content, searchQuery = '', searchRegex = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  useImperativeHandle(ref, () => ({
    getContainer: () => containerRef.current
  }))

  const html = parseMarkdown(content)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

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
      wrapper.innerHTML = `<div class="mermaid" data-code="${encodeURIComponent(code)}"></div>`
      el.parentNode?.replaceChild(wrapper, el)
    })

    const mermaidEls = container.querySelectorAll('.mermaid[data-code]')
    if (mermaidEls.length > 0) {
      import('mermaid').then((mermaidModule) => {
        const mermaid = mermaidModule.default
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
        })

        mermaidEls.forEach(async (el) => {
          const code = decodeURIComponent(el.getAttribute('data-code') || '')
          const wrapper = el.parentElement
          try {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
            const { svg } = await mermaid.render(id, code)
            if (wrapper) {
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
              wrapper.innerHTML = ''
              wrapper.appendChild(containerDiv)
            }
          } catch (err) {
            if (wrapper) {
              wrapper.innerHTML = `<div class="mermaid-error">Mermaid 渲染错误: ${err instanceof Error ? err.message : '未知错误'}</div>`
            }
          }
        })
      })
    }

    const images = container.querySelectorAll('img')
    images.forEach((img) => {
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
    })
  }, [content])

  useEffect(() => {
    if (!containerRef.current || !searchQuery) return

    const container = containerRef.current

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
  }, [searchQuery, searchRegex])

  const handleClosePreview = () => {
    setPreviewImage(null)
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

  return (
    <>
      <div 
        ref={containerRef}
        className={styles.renderer}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {previewImage && (
        <div className={previewStyles.overlay} onClick={handleClosePreview}>
          <button className={previewStyles.closeButton} onClick={handleClosePreview}>✕</button>
          <img 
            src={previewImage.src} 
            alt={previewImage.alt} 
            className={previewStyles.fullImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'
