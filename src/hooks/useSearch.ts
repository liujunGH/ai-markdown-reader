import { useState, useCallback, useEffect } from 'react'
import { findSearchMatches, type SearchMatch } from '../utils/search'

const LARGE_DOCUMENT_SEARCH_THRESHOLD = 1_000_000
const LARGE_DOCUMENT_SEARCH_DELAY_MS = 100

export type { SearchMatch }

export function useSearch(content: string) {
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback((searchQuery: string, useRegex: boolean) => {
    if (!searchQuery.trim()) {
      setMatches([])
      setCurrentMatch(0)
      setIsSearching(false)
      return
    }

    setMatches(findSearchMatches(content, searchQuery, useRegex))
    setCurrentMatch(0)
    setIsSearching(false)
  }, [content])

  useEffect(() => {
    if (!query.trim()) {
      setMatches([])
      setCurrentMatch(0)
      setIsSearching(false)
      return
    }

    if (content.length < LARGE_DOCUMENT_SEARCH_THRESHOLD) {
      search(query, isRegex)
      return
    }

    setIsSearching(true)
    const timer = window.setTimeout(() => {
      search(query, isRegex)
    }, LARGE_DOCUMENT_SEARCH_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [content.length, isRegex, query, search])

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatch(prev => (prev + 1) % matches.length)
  }, [matches.length])

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatch(prev => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  const goToMatch = useCallback((index: number) => {
    if (matches.length === 0) return
    setCurrentMatch(index % matches.length)
  }, [matches.length])

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
    isSearching,
    nextMatch,
    prevMatch,
    goToMatch,
    clearSearch,
    search
  }
}
