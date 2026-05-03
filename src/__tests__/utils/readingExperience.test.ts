import { describe, expect, it } from 'vitest'
import {
  addReaderMark,
  buildAnnotationOverview,
  buildChapterReadingPlan,
  buildComparisonSyncTarget,
  buildReadingLandmarks,
  buildReadingStats,
  buildReadingStatusCard,
  buildResumePoint,
  buildChapterProgress,
  createFocusTimer,
  createReadingSnapshot,
  createReadingSession,
  createReadLaterItem,
  exportReaderAnnotationsMarkdown,
  extractReadingMediaItems,
  filterReadingTimelineItems,
  getDefaultReadingPresets,
  normalizeAccessibilitySettings,
  normalizeLayoutMode,
  normalizeReadingKeyboardAction,
  toggleChapterCompletion,
  updateReaderMarkMetadata,
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

  it('builds reading sessions and aggregate reading stats', () => {
    const session = createReadingSession({
      filePath: '/docs/a.md',
      fileName: 'a.md',
      startedAt: 1000,
      endedAt: 61000,
      progressStart: 0.2,
      progressEnd: 0.7,
      wordsRead: 500,
    })
    const stats = buildReadingStats([session], 120000)

    expect(session.durationMs).toBe(60000)
    expect(stats.totalMinutes).toBe(1)
    expect(stats.totalWords).toBe(500)
    expect(stats.documentsRead).toBe(1)
    expect(stats.todayMinutes).toBe(1)
  })

  it('builds chapter progress from headings and current line', () => {
    const progress = buildChapterProgress(content, 12)

    expect(progress.currentHeading).toBe('Details')
    expect(progress.currentIndex).toBe(2)
    expect(progress.totalChapters).toBe(2)
    expect(progress.percent).toBeGreaterThan(0)
  })

  it('normalizes keyboard reading actions', () => {
    expect(normalizeReadingKeyboardAction('j')).toBe('scroll-down')
    expect(normalizeReadingKeyboardAction('K')).toBe('scroll-up')
    expect(normalizeReadingKeyboardAction('l')).toBe('next-heading')
    expect(normalizeReadingKeyboardAction('h')).toBe('previous-heading')
    expect(normalizeReadingKeyboardAction('m')).toBe('mark-read-later')
    expect(normalizeReadingKeyboardAction('b')).toBe('bookmark')
    expect(normalizeReadingKeyboardAction('x')).toBe(null)
  })

  it('exports annotations, updates highlight metadata, and toggles chapter completion', () => {
    const marks = addReaderMark([], {
      filePath: '/docs/a.md',
      fileName: 'a.md',
      text: 'Important paragraph',
      kind: 'highlight',
      color: 'yellow',
      line: 3,
    }, 100)
    const updated = updateReaderMarkMetadata(marks, marks[0].id, { color: 'green', tag: '重点' })
    const completions = toggleChapterCompletion([], { filePath: '/docs/a.md', heading: 'Intro', line: 1 }, 200)
    const cleared = toggleChapterCompletion(completions, { filePath: '/docs/a.md', heading: 'Intro', line: 1 }, 300)
    const markdown = exportReaderAnnotationsMarkdown({
      fileName: 'a.md',
      marks: updated,
      chapterCompletions: completions,
      progressLabel: 'Intro · 40%',
    })

    expect(updated[0]).toMatchObject({ color: 'green', tag: '重点' })
    expect(completions).toHaveLength(1)
    expect(cleared).toHaveLength(0)
    expect(markdown).toContain('# a.md 阅读批注')
    expect(markdown).toContain('Important paragraph')
    expect(markdown).toContain('Intro')
  })

  it('builds focus timers, comparison sync targets, and accessibility settings', () => {
    const timer = createFocusTimer({ minutes: 25, startedAt: 1000 })
    const target = buildComparisonSyncTarget(0.5, '# A\n\nText\n\n## B')
    const accessibility = normalizeAccessibilitySettings({
      lineHeight: 2.2,
      letterSpacing: 0.04,
      paragraphSpacing: 1.6,
      reduceMotion: true,
      ttsRate: 1.4,
      highContrastHighlights: true,
    })

    expect(timer.endsAt).toBe(1501000)
    expect(target.line).toBe(3)
    expect(accessibility).toMatchObject({ reduceMotion: true, ttsRate: 1.4, highContrastHighlights: true })
  })

  it('builds annotation overview and current document status cards', () => {
    const marks = addReaderMark([], {
      filePath: '/docs/a.md',
      fileName: 'a.md',
      text: 'Important text',
      kind: 'highlight',
      tag: '重点',
      line: 3,
    }, 100)
    const completions = [{ id: 'c1', filePath: '/docs/a.md', heading: 'Intro', line: 1, completedAt: 120 }]
    const overview = buildAnnotationOverview(marks, completions)
    const card = buildReadingStatusCard({
      filePath: '/docs/a.md',
      fileName: 'a.md',
      progress: 0.42,
      marks,
      chapterCompletions: completions,
      historyUpdatedAt: 1000,
    })

    expect(overview.summary).toEqual({ highlights: 1, excerpts: 0, completedChapters: 1 })
    expect(overview.items[0]).toEqual(expect.objectContaining({ label: 'Important text', badge: '高亮 · #重点' }))
    expect(card).toEqual(expect.objectContaining({
      fileName: 'a.md',
      progressPercent: 42,
      highlightCount: 1,
      completedChapterCount: 1,
    }))
  })

  it('extracts reading media and builds chapter reading actions', () => {
    const media = extractReadingMediaItems(content)
    const plan = buildChapterReadingPlan(content, [
      { id: 'c1', filePath: '/docs/a.md', heading: 'Intro', line: 1, completedAt: 10 },
    ], '/docs/a.md')

    expect(media.map(item => item.type)).toEqual(['image', 'table'])
    expect(media[0]).toEqual(expect.objectContaining({ label: 'Cover', src: 'cover.png', line: 5 }))
    expect(media[1]).toEqual(expect.objectContaining({ markdown: expect.stringContaining('| A | B |'), csv: expect.stringContaining('A,B') }))
    expect(plan[0]).toEqual(expect.objectContaining({ heading: 'Intro', completed: true, line: 1 }))
    expect(plan[1]).toEqual(expect.objectContaining({ heading: 'Details', completed: false, line: 11 }))
  })

  it('filters reading history and creates restorable reading snapshots', () => {
    const history = [
      { filePath: '/docs/a.md', name: 'Annotated.md', progress: 0.4, updatedAt: 1 },
      { filePath: '/docs/b.md', name: 'Done.md', progress: 1, updatedAt: 2 },
    ]
    const snapshot = createReadingSnapshot({
      filePath: '/docs/a.md',
      fileName: 'a.md',
      progress: 0.5,
      scrollTop: 480,
      fontSize: 18,
      theme: 'sepia',
      layoutMode: 'columns',
      heading: 'Intro',
    }, 100)

    expect(filterReadingTimelineItems(history, { query: 'annotated', status: 'all' })).toHaveLength(1)
    expect(filterReadingTimelineItems(history, { query: '', status: 'unfinished' })).toHaveLength(1)
    expect(filterReadingTimelineItems(history, { query: '', status: 'completed' })).toHaveLength(1)
    expect(snapshot).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^snapshot-100-/),
      progressPercent: 50,
      theme: 'sepia',
      layoutMode: 'columns',
    }))
  })
})
