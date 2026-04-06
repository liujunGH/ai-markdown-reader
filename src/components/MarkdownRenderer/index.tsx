import { useEffect, useRef } from 'react'
import { parseMarkdown } from '../../utils/markdownParser'
import styles from './MarkdownRenderer.module.css'

interface Props {
  content: string
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

export function MarkdownRenderer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

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
              wrapper.innerHTML = svg
            }
          } catch (err) {
            if (wrapper) {
              wrapper.innerHTML = `<div class="mermaid-error">Mermaid 渲染错误: ${err instanceof Error ? err.message : '未知错误'}</div>`
            }
          }
        })
      })
    }
  }, [content])

  return (
    <div 
      ref={containerRef}
      className={styles.renderer}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
