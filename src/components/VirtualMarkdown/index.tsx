import { useState, useEffect, useRef, useMemo, forwardRef } from 'react'
import { MarkdownRenderer, MarkdownRendererRef } from '../MarkdownRenderer'
import { findSearchMatches, type SearchMatch } from '../../utils/search'

interface Section {
  id: string
  content: string
  startLine: number
  lineCount: number
  startIndex: number
  endIndex: number
}

export function splitMarkdownSections(content: string, maxLinesPerSection = 160): Section[] {
  const lines = content.split('\n')
  const lineStarts: number[] = []
  let cursor = 0
  for (const line of lines) {
    lineStarts.push(cursor)
    cursor += line.length + 1
  }

  const sections: Section[] = []
  let current: string[] = []
  let currentStartLine = 1
  let inCodeFence = false
  const preferredHeadingBreakLines = Math.max(20, Math.floor(maxLinesPerSection * 0.75))

  const pushSection = () => {
    if (current.length === 0) return
    const startLine = currentStartLine
    const endLine = startLine + current.length - 1
    const nextLineStart = lineStarts[endLine]
    sections.push({
      id: `sec-${sections.length}`,
      content: current.join('\n'),
      startLine,
      lineCount: current.length,
      startIndex: lineStarts[startLine - 1] ?? 0,
      endIndex: typeof nextLineStart === 'number' ? nextLineStart - 1 : content.length,
    })
    current = []
  }

  for (const [index, line] of lines.entries()) {
    const isHeading = /^#{1,2}\s/.test(line)
    if (isHeading && current.length >= preferredHeadingBreakLines && !inCodeFence) {
      pushSection()
      currentStartLine = index + 1
    }

    current.push(line)

    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence
    }

    if (current.length >= maxLinesPerSection && !inCodeFence && index < lines.length - 1) {
      pushSection()
      currentStartLine = index + 2
    }
  }

  pushSection()

  return sections.length > 0
    ? sections
    : [{ id: 'sec-0', content, startLine: 1, lineCount: lines.length, startIndex: 0, endIndex: content.length }]
}

export function getSectionSearchState(section: Section, matches: SearchMatch[], currentMatch: number) {
  return mapSearchMatchesToSections([section], matches, currentMatch)[0]
}

export function mapSearchMatchesToSections(sections: Section[], matches: SearchMatch[], currentMatch: number) {
  const states = sections.map(() => ({
    containsActiveMatch: false,
    localCurrentMatch: -1,
    localMatchCount: 0,
  }))
  let sectionIndex = 0

  matches.forEach((match, globalIndex) => {
    const matchEnd = match.index + Math.max(1, match.length)
    while (sectionIndex < sections.length && sections[sectionIndex].endIndex < match.index) {
      sectionIndex += 1
    }

    for (let index = sectionIndex; index < sections.length; index += 1) {
      const section = sections[index]
      if (section.startIndex >= matchEnd) break
      if (match.index <= section.endIndex && matchEnd > section.startIndex) {
        if (globalIndex === currentMatch) {
          states[index].localCurrentMatch = states[index].localMatchCount
          states[index].containsActiveMatch = true
        }
        states[index].localMatchCount += 1
      }
    }
  })

  return states
}

interface Props {
  content: string
  filePath?: string
  searchQuery?: string
  searchRegex?: boolean
  currentMatch?: number
  matchCount?: number
  onWikiLinkClick?: (target: string) => void
}

const BUFFER_SECTIONS = 1
const INITIAL_RENDER_SECTIONS = 1

export const VirtualMarkdown = forwardRef<MarkdownRendererRef, Props>(
  ({ content, searchQuery = '', searchRegex = false, currentMatch = 0, ...rest }, ref) => {
    const sections = useMemo(() => splitMarkdownSections(content), [content])
    const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
    const observerRef = useRef<IntersectionObserver | null>(null)
    const sectionEls = useRef<Map<string, HTMLElement>>(new Map())
    const searchMatches = useMemo(() => (
      searchQuery ? findSearchMatches(content, searchQuery, searchRegex) : []
    ), [content, searchQuery, searchRegex])
    const sectionSearchStates = useMemo(() => (
      mapSearchMatchesToSections(sections, searchMatches, currentMatch)
    ), [currentMatch, searchMatches, sections])

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
      if (index < INITIAL_RENDER_SECTIONS) return true
      if (sectionSearchStates[index]?.containsActiveMatch) return true
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
      return (
        <MarkdownRenderer
          ref={ref}
          content={content}
          searchQuery={searchQuery}
          searchRegex={searchRegex}
          currentMatch={currentMatch}
          matchCount={searchMatches.length}
          {...rest}
        />
      )
    }

    return (
      <div>
        {sections.map((section, index) => {
          const render = shouldRender(index)
          const sectionSearchState = sectionSearchStates[index]
          return (
            <div
              key={section.id}
              data-section-id={section.id}
              ref={setSectionRef(section.id)}
            >
              {render ? (
                <MarkdownRenderer
                  {...rest}
                  content={section.content}
                  searchQuery={searchQuery}
                  searchRegex={searchRegex}
                  currentMatch={sectionSearchState.containsActiveMatch ? sectionSearchState.localCurrentMatch : -1}
                  matchCount={sectionSearchState.localMatchCount}
                />
              ) : (
                <div style={{ minHeight: `${Math.max(80, section.lineCount * 26)}px` }} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    )
  }
)

VirtualMarkdown.displayName = 'VirtualMarkdown'
