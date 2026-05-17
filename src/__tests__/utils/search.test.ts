import { describe, expect, it } from 'vitest'
import { findSearchMatches } from '../../utils/search'

describe('findSearchMatches', () => {
  it('finds literal matches with context snippets', () => {
    const matches = findSearchMatches('alpha beta alpha', 'alpha', false)

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({ index: 0, length: 5 })
    expect(matches[1]).toMatchObject({ index: 11, length: 5 })
    expect(matches[0].text).toContain('alpha')
  })

  it('finds regex matches and caps the result count', () => {
    const matches = findSearchMatches('a1 b22 c333 d4444', '\\d+', true, { limit: 2 })

    expect(matches.map(match => match.text.trim())).toEqual(['a1 b22 c333 d4444', 'a1 b22 c333 d4444'])
    expect(matches.map(match => match.length)).toEqual([1, 2])
  })

  it('does not loop forever on zero-width regex matches', () => {
    const matches = findSearchMatches('one\ntwo\nthree', '^', true, { limit: 10 })

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.length).toBeLessThanOrEqual(10)
  })

  it('returns an empty list for invalid regex', () => {
    expect(findSearchMatches('content', '[invalid', true)).toEqual([])
  })
})
