import { describe, expect, it } from 'vitest'
import {
  addReaderMark,
  buildReadingLandmarks,
  buildResumePoint,
  createReadLaterItem,
  getDefaultReadingPresets,
  normalizeLayoutMode,
  updateReadLaterStatus,
} from '../../utils/readingExperience'

const content = [
  '# Intro',
  '',
  'Opening paragraph.',
  '',
  '![Cover](cover.png)',
  '',
  '```ts',
  'const value = 1',
  '```',
  '',
  '## Details',
  '',
  '| A | B |',
  '| - | - |',
  '| 1 | 2 |',
].join('\n')

describe('readingExperience', () => {
  it('creates highlights and excerpts without duplicating the same selection', () => {
    const first = addReaderMark([], {
      filePath: '/docs/a.md',
      fileName: 'a.md',
      text: 'Important paragraph',
      kind: 'highlight',
      color: 'yellow',
      line: 3,
    }, 100)
    const second = addReaderMark(first, {
      filePath: '/docs/a.md',
      fileName: 'a.md',
      text: 'Important paragraph',
      kind: 'highlight',
      color: 'yellow',
      line: 3,
    }, 200)

    expect(first[0]).toMatchObject({ kind: 'highlight', text: 'Important paragraph', fileName: 'a.md' })
    expect(second).toHaveLength(1)

    const excerpts = addReaderMark(first, {
      filePath: '/docs/a.md',
      fileName: 'a.md',
      text: 'Quote',
      kind: 'excerpt',
      note: 'Worth saving',
    }, 300)
    expect(excerpts).toHaveLength(2)
    expect(excerpts[0].note).toBe('Worth saving')
  })

  it('builds a read-later queue item and updates its status', () => {
    const item = createReadLaterItem({
      filePath: '/docs/a.md',
      fileName: 'a.md',
      heading: 'Intro',
      status: 'unread',
    }, 100)

    expect(item).toMatchObject({ status: 'unread', heading: 'Intro' })
    expect(updateReadLaterStatus([item], item.id, 'done')[0].status).toBe('done')
  })

  it('builds resume points from scroll progress and nearby headings', () => {
    const point = buildResumePoint({
      filePath: '/docs/a.md',
      fileName: 'a.md',
      content,
      progress: 0.75,
      scrollTop: 480,
    }, 100)

    expect(point.heading).toBe('Details')
    expect(point.progressPercent).toBe(75)
    expect(point.label).toContain('Details')
  })

  it('extracts paragraph, image, code, table, and heading landmarks', () => {
    const landmarks = buildReadingLandmarks(content)

    expect(landmarks.map(item => item.type)).toContain('heading')
    expect(landmarks.map(item => item.type)).toContain('paragraph')
    expect(landmarks.map(item => item.type)).toContain('image')
    expect(landmarks.map(item => item.type)).toContain('code')
    expect(landmarks.map(item => item.type)).toContain('table')
  })

  it('returns reading presets and normalizes layout modes', () => {
    const presets = getDefaultReadingPresets()

    expect(presets.map(preset => preset.id)).toEqual(['default', 'longform', 'code-doc', 'paper'])
    expect(normalizeLayoutMode('columns')).toBe('columns')
    expect(normalizeLayoutMode('bad')).toBe('single')
  })
})
