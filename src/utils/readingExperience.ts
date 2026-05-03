export type ReaderMarkKind = 'highlight' | 'excerpt'
export type ReaderMarkColor = 'yellow' | 'green' | 'blue' | 'pink'
export type ReadLaterStatus = 'unread' | 'reading' | 'done'
export type ReadingLandmarkType = 'heading' | 'paragraph' | 'image' | 'code' | 'table'
export type ReadingLayoutMode = 'single' | 'columns' | 'split'

export interface ReaderMark {
  id: string
  filePath: string
  fileName: string
  text: string
  kind: ReaderMarkKind
  color: ReaderMarkColor
  note?: string
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
    line: input.line,
    createdAt,
  }, ...items].slice(0, 300)
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

function hashText(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}
