import { useState, useEffect, useRef, useMemo, forwardRef } from 'react'
import { MarkdownRenderer, MarkdownRendererRef } from '../MarkdownRenderer'

interface Section {
  id: string
  content: string
}

function splitByHeadings(content: string): Section[] {
  const lines = content.split('\n')
  const sections: Section[] = []
  let current: string[] = []

  for (const line of lines) {
    if (/^#{1,2}\s/.test(line)) {
      if (current.length > 0) {
        sections.push({ id: `sec-${sections.length}`, content: current.join('\n') })
      }
      current = [line]
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) {
    sections.push({ id: `sec-${sections.length}`, content: current.join('\n') })
  }

  return sections.length > 0 ? sections : [{ id: 'sec-0', content }]
}

interface Props {
  content: string
  searchQuery?: string
  searchRegex?: boolean
  currentMatch?: number
  matchCount?: number
  onWikiLinkClick?: (target: string) => void
}

const BUFFER_SECTIONS = 2

export const VirtualMarkdown = forwardRef<MarkdownRendererRef, Props>(
  ({ content, ...rest }, ref) => {
    const sections = useMemo(() => splitByHeadings(content), [content])
    const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
    const observerRef = useRef<IntersectionObserver | null>(null)
    const sectionEls = useRef<Map<string, HTMLElement>>(new Map())

    useEffect(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          setVisibleIds((prev) => {
            const next = new Set(prev)
            for (const entry of entries) {
              const id = entry.target.getAttribute('data-section-id')
              if (!id) continue
              if (entry.isIntersecting) {
                next.add(id)
              }
            }
            return next
          })
        },
        { rootMargin: '400px 0px', threshold: 0 }
      )

      sectionEls.current.forEach((el) => observerRef.current?.observe(el))
      return () => observerRef.current?.disconnect()
    }, [sections])

    const setSectionRef = (id: string) => (el: HTMLElement | null) => {
      if (el) {
        sectionEls.current.set(id, el)
        observerRef.current?.observe(el)
      } else {
        sectionEls.current.delete(id)
      }
    }

    const shouldRender = (index: number): boolean => {
      const currentId = sections[index]?.id
      if (visibleIds.has(currentId)) return true
      // Buffer of 2 sections above and below any visible section
      for (let i = Math.max(0, index - BUFFER_SECTIONS); i <= Math.min(sections.length - 1, index + BUFFER_SECTIONS); i++) {
        if (visibleIds.has(sections[i].id)) return true
      }
      return false
    }

    // For small documents, just render everything normally
    if (sections.length <= 3) {
      return <MarkdownRenderer ref={ref} content={content} {...rest} />
    }

    return (
      <div>
        {sections.map((section, index) => {
          const render = shouldRender(index)
          return (
            <div
              key={section.id}
              data-section-id={section.id}
              ref={setSectionRef(section.id)}
            >
              {render ? (
                <MarkdownRenderer {...rest} content={section.content} />
              ) : (
                <div style={{ minHeight: '200px' }} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    )
  }
)

VirtualMarkdown.displayName = 'VirtualMarkdown'
