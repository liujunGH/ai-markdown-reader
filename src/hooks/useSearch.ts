import { useState, useCallback, useEffect, useRef } from 'react'

export interface SearchMatch {
  index: number
  text: string
}

export function useSearch(content: string) {
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const search = useCallback((searchQuery: string, useRegex: boolean) => {
    if (!searchQuery.trim()) {
      setMatches([])
      return
    }

    const foundMatches: SearchMatch[] = []
    
    try {
      let pattern: RegExp
      if (useRegex) {
        pattern = new RegExp(searchQuery, 'gi')
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        pattern = new RegExp(escaped, 'gi')
      }

      let match
      while ((match = pattern.exec(content)) !== null) {
        foundMatches.push({
          index: match.index,
          text: content.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20)
        })
        if (foundMatches.length >= 100) break
      }
    } catch {
      setMatches([])
      return
    }

    setMatches(foundMatches)
    setCurrentMatch(0)
  }, [content])

  useEffect(() => {
    search(query, isRegex)
  }, [query, isRegex, search])

  const highlightMatches = useCallback((container: HTMLDivElement | null) => {
    if (!container) return
    contentRef.current = container

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

      let html = textNode.textContent
      let hasMatch = false

      try {
        const pattern = isRegex 
          ? new RegExp(`(${query})`, 'gi')
          : new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        
        if (pattern.test(html)) {
          hasMatch = true
          html = html.replace(pattern, '<mark class="search-highlight">$1</mark>')
        }
      } catch {
        // Invalid regex, skip
      }

      if (hasMatch) {
        const span = document.createElement('span')
        span.innerHTML = html
        textNode.parentNode?.replaceChild(span, textNode)
      }
    })
  }, [query, isRegex])

  const scrollToMatch = useCallback((index: number) => {
    if (!contentRef.current || matches.length === 0) return

    const container = contentRef.current
    const marks = container.querySelectorAll('.search-highlight')
    if (marks.length === 0) return

    const targetIndex = index % marks.length
    const mark = marks[targetIndex]
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [matches.length])

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatch(prev => (prev + 1) % matches.length)
  }, [matches.length])

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatch(prev => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  useEffect(() => {
    if (matches.length > 0) {
      scrollToMatch(currentMatch)
    }
  }, [currentMatch, scrollToMatch, matches.length])

  const clearSearch = useCallback(() => {
    setQuery('')
    setMatches([])
    setCurrentMatch(0)
  }, [])

  return {
    query,
    setQuery,
    isRegex,
    setIsRegex,
    matches,
    currentMatch,
    nextMatch,
    prevMatch,
    clearSearch,
    highlightMatches,
    search
  }
}
