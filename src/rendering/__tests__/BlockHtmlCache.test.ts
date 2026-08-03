import { describe, expect, it } from 'vitest'
import { BlockHtmlCache } from '../BlockHtmlCache'

describe('BlockHtmlCache', () => {
  it('deduplicates pending ids and exposes resolved html', () => {
    const cache = new BlockHtmlCache(2)
    expect(cache.reserve([1, 2])).toEqual([1, 2])
    expect(cache.reserve([1, 2, 3])).toEqual([3])
    cache.resolve([{ id: 1, html: '<p>one</p>' }])
    expect(cache.get(1)).toBe('<p>one</p>')
  })

  it('evicts least recently used html at capacity', () => {
    const cache = new BlockHtmlCache(2)
    cache.resolve([
      { id: 1, html: 'one' },
      { id: 2, html: 'two' },
    ])
    expect(cache.get(1)).toBe('one')
    cache.resolve([{ id: 3, html: 'three' }])

    expect(cache.get(2)).toBeUndefined()
    expect(cache.get(1)).toBe('one')
    expect(cache.get(3)).toBe('three')
  })

  it('allows failed reservations to retry', () => {
    const cache = new BlockHtmlCache(2)
    expect(cache.reserve([4])).toEqual([4])
    cache.reject([4])
    expect(cache.reserve([4])).toEqual([4])
  })
})
