import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../../hooks/useSearch'

describe('useSearch', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSearch('some content'))

    expect(result.current.query).toBe('')
    expect(result.current.matches).toEqual([])
    expect(result.current.currentMatch).toBe(0)
    expect(result.current.isRegex).toBe(false)
  })

  it('performs basic search and finds matches', () => {
    const { result } = renderHook(() => useSearch('hello world hello'))

    act(() => {
      result.current.setQuery('hello')
    })

    expect(result.current.matches).toHaveLength(2)
    expect(result.current.currentMatch).toBe(0)
    expect(result.current.matches[0].text).toContain('hello')
  })

  it('clears matches when query is empty', () => {
    const { result } = renderHook(() => useSearch('hello world'))

    act(() => {
      result.current.setQuery('hello')
    })
    expect(result.current.matches).toHaveLength(1)

    act(() => {
      result.current.setQuery('')
    })
    expect(result.current.matches).toEqual([])
  })

  it('performs regex search when isRegex is true', () => {
    const { result } = renderHook(() => useSearch('abc 123 def 456'))

    act(() => {
      result.current.setIsRegex(true)
      result.current.setQuery('\\d+')
    })

    expect(result.current.matches).toHaveLength(2)
    expect(result.current.matches[0].text).toContain('123')
    expect(result.current.matches[1].text).toContain('456')
  })

  it('escapes special regex chars in literal search', () => {
    const { result } = renderHook(() => useSearch('price: $5.00'))

    act(() => {
      result.current.setQuery('$5.00')
    })

    expect(result.current.matches).toHaveLength(1)
  })

  it('handles invalid regex gracefully', () => {
    const { result } = renderHook(() => useSearch('some content'))

    act(() => {
      result.current.setIsRegex(true)
      result.current.setQuery('[invalid')
    })

    expect(result.current.matches).toEqual([])
  })

  it('limits matches to 100', () => {
    const content = 'a '.repeat(200)
    const { result } = renderHook(() => useSearch(content))

    act(() => {
      result.current.setQuery('a')
    })

    expect(result.current.matches.length).toBe(100)
  })

  it('navigates to next match', () => {
    const { result } = renderHook(() => useSearch('one two three'))

    act(() => {
      result.current.setQuery('e')
    })
    expect(result.current.currentMatch).toBe(0)

    act(() => {
      result.current.nextMatch()
    })
    expect(result.current.currentMatch).toBe(1)

    act(() => {
      result.current.nextMatch()
    })
    expect(result.current.currentMatch).toBe(2)
  })

  it('wraps around when navigating past last match', () => {
    const { result } = renderHook(() => useSearch('aa bb'))

    act(() => {
      result.current.setQuery('a')
    })
    expect(result.current.matches).toHaveLength(2)

    act(() => {
      result.current.nextMatch()
    })
    expect(result.current.currentMatch).toBe(1)

    act(() => {
      result.current.nextMatch()
    })
    expect(result.current.currentMatch).toBe(0)
  })

  it('navigates to previous match', () => {
    const { result } = renderHook(() => useSearch('one two three'))

    act(() => {
      result.current.setQuery('e')
    })

    act(() => {
      result.current.prevMatch()
    })
    expect(result.current.currentMatch).toBe(2)

    act(() => {
      result.current.prevMatch()
    })
    expect(result.current.currentMatch).toBe(1)
  })

  it('goes to specific match index', () => {
    const { result } = renderHook(() => useSearch('a x a y a z'))

    act(() => {
      result.current.setQuery('a')
    })
    expect(result.current.matches.length).toBe(3)

    act(() => {
      result.current.goToMatch(2)
    })
    expect(result.current.currentMatch).toBe(2)
  })

  it('clears search state', () => {
    const { result } = renderHook(() => useSearch('hello world'))

    act(() => {
      result.current.setQuery('hello')
    })
    expect(result.current.matches).toHaveLength(1)

    act(() => {
      result.current.clearSearch()
    })
    expect(result.current.query).toBe('')
    expect(result.current.matches).toEqual([])
    expect(result.current.currentMatch).toBe(0)
  })

  it('re-searches when content changes (via new hook instance)', () => {
    const { result } = renderHook(({ content }) => useSearch(content), {
      initialProps: { content: 'hello world' },
    })

    act(() => {
      result.current.setQuery('hello')
    })
    expect(result.current.matches).toHaveLength(1)
  })
})
