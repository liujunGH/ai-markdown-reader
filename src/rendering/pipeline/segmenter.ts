const DEFAULT_TARGET_SEGMENT_CHARS = 64 * 1024

export interface MarkdownSegment {
  content: string
  /** 相对去除 frontmatter 后正文的 0-based 起始行偏移。 */
  startLineOffset: number
}

interface FenceState {
  char: '`' | '~'
  length: number
}

function fenceMarker(line: string): { char: '`' | '~'; length: number } | null {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/)
  if (!match) return null
  return { char: match[1][0] as '`' | '~', length: match[1].length }
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith(fence.char.repeat(fence.length))) return false
  let markerLength = 0
  while (trimmed[markerLength] === fence.char) markerLength += 1
  return markerLength >= fence.length && trimmed.slice(markerLength).trim() === ''
}

function nextNonBlankLine(content: string, offset: number): string {
  let cursor = offset
  while (cursor < content.length) {
    const end = content.indexOf('\n', cursor)
    const lineEnd = end === -1 ? content.length : end
    const line = content.slice(cursor, lineEnd).replace(/\r$/, '')
    if (line.trim()) return line
    cursor = end === -1 ? content.length : end + 1
  }
  return ''
}

function isStructuralContinuation(previous: string, next: string): boolean {
  if (!previous || !next) return false
  const list = /^\s*(?:[-+*]|\d+[.)])\s+/
  if (list.test(previous) && (list.test(next) || /^\s{2,}\S/.test(next))) return true
  if (/^\s*>/.test(previous) && /^\s*>/.test(next)) return true
  if (/^(?: {4}|\t)/.test(previous) && /^(?: {4}|\t)/.test(next)) return true
  if (previous.includes('|') && next.includes('|')) return true
  return false
}

export function countMarkdownLines(content: string): number {
  let lines = 1
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) === 10) lines += 1
  }
  return lines
}

/** 收集引用式链接定义，供跨分段解析和可见块渲染共享。 */
export function extractReferenceDefinitions(content: string): string {
  const matches = content.match(
    /^ {0,3}\[[^\]\n]+\]:[^\n]*(?:\n(?: {2,}|\t)[^\n]*)*/gm,
  )
  return matches?.join('\n') ?? ''
}

/**
 * 在围栏代码/块公式之外按安全边界切段。优先使用标题和空行；若没有安全边界，
 * 保持原段不拆，避免为了内存破坏列表、代码或引用语义。
 */
export function segmentMarkdown(
  content: string,
  targetChars = DEFAULT_TARGET_SEGMENT_CHARS,
): MarkdownSegment[] {
  if (!content) return [{ content: '', startLineOffset: 0 }]

  const segments: MarkdownSegment[] = []
  let segmentStart = 0
  let segmentStartLine = 0
  let lineStart = 0
  let lineNumber = 0
  let previousNonBlank = ''
  let fence: FenceState | null = null
  let mathFence = false

  const pushSegment = (end: number, nextLine: number) => {
    if (end <= segmentStart) return
    segments.push({
      content: content.slice(segmentStart, end),
      startLineOffset: segmentStartLine,
    })
    segmentStart = end
    segmentStartLine = nextLine
    previousNonBlank = ''
  }

  while (lineStart < content.length) {
    const newline = content.indexOf('\n', lineStart)
    const lineEnd = newline === -1 ? content.length : newline
    const nextOffset = newline === -1 ? content.length : newline + 1
    const line = content.slice(lineStart, lineEnd).replace(/\r$/, '')
    const trimmed = line.trim()

    if (!fence && !mathFence && /^ {0,3}#{1,6}\s+/.test(line) && lineStart > segmentStart) {
      if (lineStart - segmentStart >= targetChars) pushSegment(lineStart, lineNumber)
    }

    const marker = fenceMarker(line)
    if (fence) {
      if (isFenceClose(line, fence)) fence = null
    } else if (!mathFence && marker) {
      fence = marker
    } else if (!fence && trimmed === '$$') {
      mathFence = !mathFence
    }

    if (!fence && !mathFence && !trimmed) {
      const next = nextNonBlankLine(content, nextOffset)
      if (!isStructuralContinuation(previousNonBlank, next) && nextOffset - segmentStart >= targetChars) {
        pushSegment(nextOffset, lineNumber + 1)
      }
    } else if (trimmed) {
      previousNonBlank = line
    }

    lineStart = nextOffset
    lineNumber += 1
  }

  pushSegment(content.length, lineNumber)
  return segments.length > 0 ? segments : [{ content, startLineOffset: 0 }]
}
