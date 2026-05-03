export type ReaderMarkKind = 'highlight' | 'excerpt'
export type ReaderMarkColor = 'yellow' | 'green' | 'blue' | 'pink'
export type ReadLaterStatus = 'unread' | 'reading' | 'done'
export type ReadingLandmarkType = 'heading' | 'paragraph' | 'image' | 'code' | 'table'
export type ReadingLayoutMode = 'single' | 'columns' | 'split'
export type ReadingKeyboardAction = 'scroll-down' | 'scroll-up' | 'next-heading' | 'previous-heading' | 'mark-read-later' | 'bookmark'
export type ReadingMediaType = 'image' | 'table'
export type ReadingTimelineStatusFilter = 'all' | 'unfinished' | 'completed'

export interface ReaderMark {
  id: string
  filePath: string
  fileName: string
  text: string
  kind: ReaderMarkKind
  color: ReaderMarkColor
  note?: string
  tag?: string
  line?: number
  createdAt: number
}

export interface ReaderMarkInput {
  filePath: string
  fileName: string
  text: string
  kind: ReaderMarkKind
  color?: ReaderMarkColor
  note?: string
  tag?: string
  line?: number
}

export interface ReadLaterItem {
  id: string
  filePath: string
  fileName: string
  heading?: string
  status: ReadLaterStatus
  createdAt: number
  updatedAt: number
}

export interface ReadingResumePoint {
  filePath: string
  fileName: string
  heading: string
  line: number
  scrollTop: number
  progress: number
  progressPercent: number
  label: string
  updatedAt: number
}

export interface ReadingPreset {
  id: 'default' | 'longform' | 'code-doc' | 'paper'
  name: string
  fontSize: number
  lineHeight: number
  lineWidth: number
  showOutline: boolean
  columns: boolean
}

export interface ReadingLandmark {
  id: string
  type: ReadingLandmarkType
  label: string
  line: number
}

export interface ReadingSession {
  id: string
  filePath: string
  fileName: string
  startedAt: number
  endedAt: number
  durationMs: number
  progressStart: number
  progressEnd: number
  wordsRead: number
}

export interface ReadingStats {
  totalMinutes: number
  todayMinutes: number
  totalWords: number
  documentsRead: number
  sessionCount: number
}

export interface ChapterProgress {
  currentHeading: string
  currentIndex: number
  totalChapters: number
  percent: number
  lineStart: number
  lineEnd: number
}

export interface ChapterCompletion {
  id: string
  filePath: string
  heading: string
  line: number
  completedAt: number
}

export interface FocusTimer {
  minutes: number
  startedAt: number
  endsAt: number
}

export interface ReadingAccessibilitySettings {
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  reduceMotion: boolean
  ttsRate: number
  highContrastHighlights: boolean
}

export interface ComparisonSyncTarget {
  progress: number
  line: number
}

export interface AnnotationOverviewItem {
  id: string
  kind: ReaderMarkKind | 'chapter'
  label: string
  badge: string
  filePath: string
  line?: number
  createdAt: number
}

export interface AnnotationOverview {
  summary: {
    highlights: number
    excerpts: number
    completedChapters: number
  }
  items: AnnotationOverviewItem[]
}

export interface ReadingStatusCard {
  filePath: string
  fileName: string
  progressPercent: number
  highlightCount: number
  excerptCount: number
  completedChapterCount: number
  lastReadLabel: string
}

export interface ReadingMediaItem {
  id: string
  type: ReadingMediaType
  label: string
  line: number
  src?: string
  alt?: string
  markdown?: string
  csv?: string
}

export interface ChapterReadingAction {
  id: string
  heading: string
  line: number
  completed: boolean
  index: number
  total: number
}

export interface ReadingTimelineFilter {
  query: string
  status: ReadingTimelineStatusFilter
}

export interface ReadingTimelineLikeItem {
  filePath: string
  name: string
  progress: number
  updatedAt: number
}

export interface ReadingSnapshot {
  id: string
  filePath: string
  fileName: string
  heading?: string
  progress: number
  progressPercent: number
  scrollTop: number
  fontSize: number
  theme: string
  layoutMode: ReadingLayoutMode
  createdAt: number
}

export function addReaderMark(items: ReaderMark[], input: ReaderMarkInput, createdAt = Date.now()): ReaderMark[] {
  const text = input.text.trim().replace(/\s+/g, ' ')
  if (!text) return items
  const duplicate = items.some(item => (
    item.filePath === input.filePath &&
    item.kind === input.kind &&
    item.text === text
  ))
  if (duplicate) return items

  return [{
    id: `${input.kind}-${createdAt}-${hashText(`${input.filePath}:${text}`)}`,
    filePath: input.filePath,
    fileName: input.fileName,
    text,
    kind: input.kind,
    color: input.color || 'yellow',
    note: input.note,
    tag: input.tag,
    line: input.line,
    createdAt,
  }, ...items].slice(0, 300)
}

export function updateReaderMarkMetadata(items: ReaderMark[], id: string, metadata: { color?: ReaderMarkColor; tag?: string; note?: string }): ReaderMark[] {
  return items.map(item => item.id === id ? {
    ...item,
    color: metadata.color || item.color,
    tag: metadata.tag !== undefined ? metadata.tag.trim() : item.tag,
    note: metadata.note !== undefined ? metadata.note : item.note,
  } : item)
}

export function createReadLaterItem(input: {
  filePath: string
  fileName: string
  heading?: string
  status?: ReadLaterStatus
}, createdAt = Date.now()): ReadLaterItem {
  return {
    id: `read-later-${hashText(input.filePath)}`,
    filePath: input.filePath,
    fileName: input.fileName,
    heading: input.heading,
    status: input.status || 'unread',
    createdAt,
    updatedAt: createdAt,
  }
}

export function upsertReadLaterItem(items: ReadLaterItem[], input: {
  filePath: string
  fileName: string
  heading?: string
  status?: ReadLaterStatus
}, updatedAt = Date.now()): ReadLaterItem[] {
  const next = createReadLaterItem(input, updatedAt)
  const existing = items.find(item => item.id === next.id)
  if (!existing) return [next, ...items].slice(0, 200)
  return items.map(item => item.id === next.id ? { ...item, ...next, createdAt: item.createdAt, updatedAt } : item)
}

export function updateReadLaterStatus(items: ReadLaterItem[], id: string, status: ReadLaterStatus, updatedAt = Date.now()): ReadLaterItem[] {
  return items.map(item => item.id === id ? { ...item, status, updatedAt } : item)
}

export function buildResumePoint(input: {
  filePath: string
  fileName: string
  content: string
  progress: number
  scrollTop: number
}, updatedAt = Date.now()): ReadingResumePoint {
  const lines = input.content.split('\n')
  const progress = Math.max(0, Math.min(1, input.progress))
  const line = Math.max(1, Math.min(lines.length || 1, Math.round((lines.length || 1) * progress)))
  const heading = findNearestHeading(lines, line) || '文档开头'
  const progressPercent = Math.round(progress * 100)
  return {
    filePath: input.filePath,
    fileName: input.fileName,
    heading,
    line,
    scrollTop: Math.max(0, Math.round(input.scrollTop)),
    progress,
    progressPercent,
    label: `${heading} · ${progressPercent}%`,
    updatedAt,
  }
}

export function buildReadingLandmarks(content: string): ReadingLandmark[] {
  const lines = content.split('\n')
  const landmarks: ReadingLandmark[] = []
  let inCode = false
  let codeStart = 0

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmed = line.trim()
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      if (!inCode) {
        inCode = true
        codeStart = lineNumber
      } else {
        inCode = false
        landmarks.push({ id: `code-${codeStart}`, type: 'code', label: `代码块 · 行 ${codeStart}`, line: codeStart })
      }
      return
    }
    if (inCode || !trimmed) return

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      landmarks.push({ id: `heading-${lineNumber}`, type: 'heading', label: heading[2].trim(), line: lineNumber })
      return
    }
    const image = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (image) {
      landmarks.push({ id: `image-${lineNumber}`, type: 'image', label: image[1] || image[2], line: lineNumber })
      return
    }
    if (/^\|.+\|$/.test(trimmed)) {
      const previousIsTable = index > 0 && /^\|.+\|$/.test(lines[index - 1].trim())
      if (!previousIsTable) landmarks.push({ id: `table-${lineNumber}`, type: 'table', label: `表格 · 行 ${lineNumber}`, line: lineNumber })
      return
    }
    if (!/^[#>*\-+\d.]/.test(trimmed) && trimmed.length > 8) {
      landmarks.push({ id: `paragraph-${lineNumber}`, type: 'paragraph', label: trimLabel(trimmed), line: lineNumber })
    }
  })

  return landmarks.slice(0, 120)
}

export function getDefaultReadingPresets(): ReadingPreset[] {
  return [
    { id: 'default', name: '普通', fontSize: 16, lineHeight: 1.65, lineWidth: 720, showOutline: true, columns: false },
    { id: 'longform', name: '长文', fontSize: 18, lineHeight: 1.85, lineWidth: 760, showOutline: true, columns: false },
    { id: 'code-doc', name: '代码文档', fontSize: 15, lineHeight: 1.6, lineWidth: 920, showOutline: true, columns: false },
    { id: 'paper', name: '论文/说明书', fontSize: 16, lineHeight: 1.7, lineWidth: 980, showOutline: false, columns: true },
  ]
}

export function normalizeLayoutMode(value: unknown): ReadingLayoutMode {
  return value === 'columns' || value === 'split' || value === 'single' ? value : 'single'
}

export function createReadingSession(input: {
  filePath: string
  fileName: string
  startedAt: number
  endedAt: number
  progressStart: number
  progressEnd: number
  wordsRead: number
}): ReadingSession {
  const durationMs = Math.max(0, input.endedAt - input.startedAt)
  return {
    id: `session-${input.startedAt}-${hashText(input.filePath)}`,
    filePath: input.filePath,
    fileName: input.fileName,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMs,
    progressStart: clamp01(input.progressStart),
    progressEnd: clamp01(input.progressEnd),
    wordsRead: Math.max(0, Math.round(input.wordsRead)),
  }
}

export function buildReadingStats(sessions: ReadingSession[], now = Date.now()): ReadingStats {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayTime = todayStart.getTime()
  const totalMs = sessions.reduce((sum, session) => sum + session.durationMs, 0)
  const todayMs = sessions
    .filter(session => session.endedAt >= todayTime)
    .reduce((sum, session) => sum + session.durationMs, 0)
  return {
    totalMinutes: Math.round(totalMs / 60000),
    todayMinutes: Math.round(todayMs / 60000),
    totalWords: sessions.reduce((sum, session) => sum + session.wordsRead, 0),
    documentsRead: new Set(sessions.map(session => session.filePath)).size,
    sessionCount: sessions.length,
  }
}

export function buildChapterProgress(content: string, currentLine: number): ChapterProgress {
  const lines = content.split('\n')
  const headings = lines
    .map((line, index) => ({ line: index + 1, match: line.trim().match(/^#{1,6}\s+(.+)$/) }))
    .filter((item): item is { line: number; match: RegExpMatchArray } => Boolean(item.match))

  if (headings.length === 0) {
    return {
      currentHeading: '文档',
      currentIndex: 1,
      totalChapters: 1,
      percent: Math.round((Math.max(1, currentLine) / Math.max(1, lines.length)) * 100),
      lineStart: 1,
      lineEnd: Math.max(1, lines.length),
    }
  }

  const current = [...headings].reverse().find(heading => heading.line <= currentLine) || headings[0]
  const currentIndex = headings.findIndex(heading => heading.line === current.line)
  const next = headings[currentIndex + 1]
  const lineStart = current.line
  const lineEnd = next ? next.line - 1 : Math.max(lineStart, lines.length)
  const span = Math.max(1, lineEnd - lineStart + 1)
  const percent = Math.max(0, Math.min(100, Math.round(((currentLine - lineStart + 1) / span) * 100)))
  return {
    currentHeading: current.match[1].trim(),
    currentIndex: currentIndex + 1,
    totalChapters: headings.length,
    percent,
    lineStart,
    lineEnd,
  }
}

export function normalizeReadingKeyboardAction(key: string): ReadingKeyboardAction | null {
  switch (key.toLowerCase()) {
    case 'j': return 'scroll-down'
    case 'k': return 'scroll-up'
    case 'l': return 'next-heading'
    case 'h': return 'previous-heading'
    case 'm': return 'mark-read-later'
    case 'b': return 'bookmark'
    default: return null
  }
}

export function toggleChapterCompletion(items: ChapterCompletion[], input: { filePath: string; heading: string; line: number }, completedAt = Date.now()): ChapterCompletion[] {
  const id = `chapter-${hashText(`${input.filePath}:${input.heading}:${input.line}`)}`
  if (items.some(item => item.id === id)) return items.filter(item => item.id !== id)
  return [{ id, filePath: input.filePath, heading: input.heading, line: input.line, completedAt }, ...items].slice(0, 300)
}

export function exportReaderAnnotationsMarkdown(input: {
  fileName: string
  marks: ReaderMark[]
  chapterCompletions: ChapterCompletion[]
  progressLabel?: string
}): string {
  const highlights = input.marks.filter(mark => mark.kind === 'highlight')
  const excerpts = input.marks.filter(mark => mark.kind === 'excerpt')
  return [
    `# ${input.fileName} 阅读批注`,
    '',
    input.progressLabel ? `- 阅读位置：${input.progressLabel}` : '',
    `- 高亮：${highlights.length}`,
    `- 摘录：${excerpts.length}`,
    `- 完成章节：${input.chapterCompletions.length}`,
    '',
    '## 高亮',
    ...formatMarks(highlights),
    '',
    '## 摘录',
    ...formatMarks(excerpts),
    '',
    '## 已完成章节',
    ...input.chapterCompletions.map(item => `- ${item.heading}（行 ${item.line}）`),
    '',
  ].filter((line, index, array) => line !== '' || array[index - 1] !== '').join('\n')
}

export function createFocusTimer(input: { minutes: number; startedAt?: number }): FocusTimer {
  const minutes = Math.max(5, Math.min(120, Math.round(input.minutes)))
  const startedAt = input.startedAt ?? Date.now()
  return { minutes, startedAt, endsAt: startedAt + minutes * 60000 }
}

export function buildComparisonSyncTarget(progress: number, content: string): ComparisonSyncTarget {
  const lines = content.split('\n')
  const normalized = clamp01(progress)
  return {
    progress: normalized,
    line: Math.max(1, Math.round(Math.max(1, lines.length) * normalized)),
  }
}

export function buildAnnotationOverview(marks: ReaderMark[], chapterCompletions: ChapterCompletion[]): AnnotationOverview {
  const markItems: AnnotationOverviewItem[] = marks.map(mark => ({
    id: mark.id,
    kind: mark.kind,
    label: mark.text,
    badge: `${mark.kind === 'highlight' ? '高亮' : '摘录'}${mark.tag ? ` · #${mark.tag}` : ''}`,
    filePath: mark.filePath,
    line: mark.line,
    createdAt: mark.createdAt,
  }))
  const chapterItems: AnnotationOverviewItem[] = chapterCompletions.map(item => ({
    id: item.id,
    kind: 'chapter',
    label: item.heading,
    badge: '章节完成',
    filePath: item.filePath,
    line: item.line,
    createdAt: item.completedAt,
  }))

  return {
    summary: {
      highlights: marks.filter(mark => mark.kind === 'highlight').length,
      excerpts: marks.filter(mark => mark.kind === 'excerpt').length,
      completedChapters: chapterCompletions.length,
    },
    items: [...markItems, ...chapterItems].sort((a, b) => {
      if (a.kind === 'chapter' && b.kind !== 'chapter') return 1
      if (a.kind !== 'chapter' && b.kind === 'chapter') return -1
      return b.createdAt - a.createdAt
    }),
  }
}

export function buildReadingStatusCard(input: {
  filePath: string
  fileName: string
  progress: number
  marks: ReaderMark[]
  chapterCompletions: ChapterCompletion[]
  historyUpdatedAt?: number
}): ReadingStatusCard {
  return {
    filePath: input.filePath,
    fileName: input.fileName,
    progressPercent: Math.round(clamp01(input.progress) * 100),
    highlightCount: input.marks.filter(mark => mark.kind === 'highlight').length,
    excerptCount: input.marks.filter(mark => mark.kind === 'excerpt').length,
    completedChapterCount: input.chapterCompletions.length,
    lastReadLabel: input.historyUpdatedAt ? formatRelativeDate(input.historyUpdatedAt) : '暂无阅读记录',
  }
}

export function extractReadingMediaItems(content: string): ReadingMediaItem[] {
  const lines = content.split('\n')
  const items: ReadingMediaItem[] = []
  let inCode = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue

    const image = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (image) {
      const lineNumber = index + 1
      const alt = image[1] || ''
      const src = image[2] || ''
      items.push({
        id: `media-image-${lineNumber}`,
        type: 'image',
        label: alt || src || `图片 · 行 ${lineNumber}`,
        line: lineNumber,
        alt,
        src,
      })
      continue
    }

    if (/^\|.+\|$/.test(trimmed)) {
      const start = index
      const tableLines: string[] = []
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index].trim())
        index += 1
      }
      index -= 1
      const lineNumber = start + 1
      const markdown = tableLines.join('\n')
      items.push({
        id: `media-table-${lineNumber}`,
        type: 'table',
        label: `表格 · 行 ${lineNumber}`,
        line: lineNumber,
        markdown,
        csv: markdownTableToCsv(tableLines),
      })
    }
  }

  return items
}

export function buildChapterReadingPlan(content: string, chapterCompletions: ChapterCompletion[], filePath: string): ChapterReadingAction[] {
  const headings = content.split('\n')
    .map((line, index) => ({ line: index + 1, match: line.trim().match(/^#{1,6}\s+(.+)$/) }))
    .filter((item): item is { line: number; match: RegExpMatchArray } => Boolean(item.match))
  const chapterHeadings = headings.length > 0 ? headings : [{ line: 1, match: ['# 文档', '文档'] as unknown as RegExpMatchArray }]

  return chapterHeadings.map((heading, index) => {
    const title = heading.match[1].trim()
    return {
      id: `chapter-action-${hashText(`${filePath}:${title}:${heading.line}`)}`,
      heading: title,
      line: heading.line,
      completed: chapterCompletions.some(item => item.filePath === filePath && item.heading === title && item.line === heading.line),
      index: index + 1,
      total: chapterHeadings.length,
    }
  })
}

export function filterReadingTimelineItems<T extends ReadingTimelineLikeItem>(items: T[], filter: ReadingTimelineFilter): T[] {
  const query = filter.query.trim().toLowerCase()
  return items.filter(item => {
    const matchesQuery = !query || `${item.name} ${item.filePath}`.toLowerCase().includes(query)
    const progress = clamp01(item.progress)
    const matchesStatus = filter.status === 'all'
      || (filter.status === 'unfinished' && progress < 0.98)
      || (filter.status === 'completed' && progress >= 0.98)
    return matchesQuery && matchesStatus
  })
}

export function createReadingSnapshot(input: {
  filePath: string
  fileName: string
  progress: number
  scrollTop: number
  fontSize: number
  theme: string
  layoutMode: ReadingLayoutMode
  heading?: string
}, createdAt = Date.now()): ReadingSnapshot {
  const progress = clamp01(input.progress)
  return {
    id: `snapshot-${createdAt}-${hashText(input.filePath)}`,
    filePath: input.filePath,
    fileName: input.fileName,
    heading: input.heading,
    progress,
    progressPercent: Math.round(progress * 100),
    scrollTop: Math.max(0, Math.round(input.scrollTop)),
    fontSize: Math.max(10, Math.min(36, Math.round(input.fontSize))),
    theme: input.theme,
    layoutMode: normalizeLayoutMode(input.layoutMode),
    createdAt,
  }
}

export function normalizeAccessibilitySettings(input: Partial<ReadingAccessibilitySettings> = {}): ReadingAccessibilitySettings {
  return {
    lineHeight: clampRange(input.lineHeight, 1.3, 2.4, 1.65),
    letterSpacing: clampRange(input.letterSpacing, 0, 0.12, 0),
    paragraphSpacing: clampRange(input.paragraphSpacing, 0.8, 2.2, 1),
    reduceMotion: Boolean(input.reduceMotion),
    ttsRate: clampRange(input.ttsRate, 0.6, 1.8, 1),
    highContrastHighlights: Boolean(input.highContrastHighlights),
  }
}

function findNearestHeading(lines: string[], targetLine: number): string {
  for (let index = Math.min(targetLine - 1, lines.length - 1); index >= 0; index -= 1) {
    const match = lines[index].trim().match(/^#{1,6}\s+(.+)$/)
    if (match) return match[1].trim()
  }
  return ''
}

function trimLabel(value: string): string {
  return value.length > 42 ? `${value.slice(0, 42)}...` : value
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampRange(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

function markdownTableToCsv(lines: string[]): string {
  return lines
    .filter((line, index) => index !== 1 || !/^\|\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line))
    .map(line => splitMarkdownTableRow(line).map(csvEscape).join(','))
    .join('\n')
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚阅读'
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前`
  if (diff < 86400000) return `${Math.max(1, Math.round(diff / 3600000))} 小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function formatMarks(marks: ReaderMark[]): string[] {
  if (marks.length === 0) return ['- 暂无']
  return marks.map(mark => {
    const meta = [
      mark.tag ? `#${mark.tag}` : '',
      mark.line ? `行 ${mark.line}` : '',
      mark.color,
    ].filter(Boolean).join(' · ')
    return `- ${meta ? `${meta}：` : ''}${mark.text}`
  })
}

function hashText(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}
