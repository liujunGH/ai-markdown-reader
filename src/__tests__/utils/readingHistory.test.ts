import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReadingHistory, recordReadingHistory } from '../../utils/readingHistory'

describe('readingHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-03T00:00:00Z'))
  })

  it('records reading history with newest item first and clamps progress', () => {
    recordReadingHistory({ filePath: '/docs/a.md', name: 'a.md', progress: 2, line: 20, scrollTop: -20 })
    recordReadingHistory({ filePath: '/docs/b.md', name: 'b.md', progress: 0.5, line: 5, scrollTop: 320 })
    recordReadingHistory({ filePath: '/docs/a.md', name: 'a.md', progress: -1, line: 1 })

    expect(getReadingHistory()).toEqual([
      expect.objectContaining({ filePath: '/docs/a.md', progress: 0, line: 1, scrollTop: 0 }),
      expect.objectContaining({ filePath: '/docs/b.md', progress: 0.5, line: 5, scrollTop: 320 }),
    ])
  })
})
