export type HealthSeverity = 'error' | 'warning' | 'info'
export type DocumentHealthSeverity = HealthSeverity

export interface DocumentHealthIssue {
  id?: string
  type:
    | 'duplicate-heading-slug'
    | 'dangerous-link-protocol'
    | 'empty-link'
    | 'empty-image-src'
    | 'suspicious-image-src'
    | 'oversized-image-dimension'
    | 'empty-mermaid-block'
    | 'mismatched-katex-block-delimiter'
  severity: HealthSeverity
  line: number
  message: string
  target?: string
}

export interface DocumentHealthSummary {
  totalIssues: number
  errors: number
  warnings: number
  info: number
  errorCount: number
  warningCount: number
  infoCount: number
  filePath?: string
}

export interface DocumentHealthResult {
  summary: DocumentHealthSummary
  issues: DocumentHealthIssue[]
}

function lineForIndex(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getAttr(tag: string, attr: string): string {
  const match = tag.match(new RegExp(`\\s${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? ''
}

function stripTitle(srcWithTitle: string): string {
  const trimmed = srcWithTitle.trim()
  const titleMatch = trimmed.match(/^(\S+)\s+["'][^"']*["']$/)
  return titleMatch ? titleMatch[1] : trimmed
}

function maskCodeRegions(content: string): string {
  const lines = content.split('\n')
  let inFenced = false
  let fenceChar = ''
  let fenceLength = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.trimStart().match(/^(`{3,}|~{3,})/)

    if (fence && (!inFenced || (fence[1][0] === fenceChar && fence[1].length >= fenceLength))) {
      if (!inFenced) {
        fenceChar = fence[1][0]
        fenceLength = fence[1].length
      } else {
        fenceChar = ''
        fenceLength = 0
      }
      inFenced = !inFenced
      lines[i] = ' '.repeat(line.length)
    } else if (inFenced) {
      lines[i] = ' '.repeat(line.length)
    } else {
      lines[i] = maskInlineCode(line)
    }
  }
  return lines.join('\n')
}

function maskInlineCode(line: string): string {
  const chars = line.split('')
  let index = 0

  while (index < chars.length) {
    if (chars[index] !== '`') {
      index += 1
      continue
    }

    const start = index
    while (index < chars.length && chars[index] === '`') index += 1
    const marker = '`'.repeat(index - start)
    const close = line.indexOf(marker, index)

    if (close < 0) continue

    for (let maskIndex = start; maskIndex < close + marker.length; maskIndex += 1) {
      chars[maskIndex] = ' '
    }
    index = close + marker.length
  }

  return chars.join('')
}

function addIssue(issues: DocumentHealthIssue[], issue: DocumentHealthIssue): void {
  issues.push({
    id: `${issue.type}-${issue.line}-${issues.length + 1}`,
    ...issue
  })
}

function isDangerousUrl(url: string): boolean {
  return /^(javascript|data|file|vbscript):/i.test(url.trim())
}

function isAllowedImageSrc(src: string): boolean {
  return (
    /^https?:\/\//i.test(src) ||
    src.startsWith('//') ||
    /^data:/i.test(src) ||
    /^blob:/i.test(src) ||
    src.startsWith('/') ||
    !/^[a-z][a-z0-9+.-]*:/i.test(src)
  )
}

function scanLinks(content: string, issues: DocumentHealthIssue[]): void {
  for (const match of extractMarkdownTargets(content, 'link')) {
    const target = stripTitle(match.target)
    const line = lineForIndex(content, match.index)
    if (!target) {
      addIssue(issues, { type: 'empty-link', severity: 'warning', line, message: '链接目标为空' })
    } else if (isDangerousUrl(target)) {
      addIssue(issues, { type: 'dangerous-link-protocol', severity: 'error', line, target, message: '链接使用了危险协议' })
    }
  }

  const htmlLinkRegex = /<a\b[^>]*>/gi
  for (const match of content.matchAll(htmlLinkRegex)) {
    const target = getAttr(match[0], 'href')
    const line = lineForIndex(content, match.index || 0)
    if (!target) {
      addIssue(issues, { type: 'empty-link', severity: 'warning', line, message: 'HTML 链接 href 为空' })
    } else if (isDangerousUrl(target)) {
      addIssue(issues, { type: 'dangerous-link-protocol', severity: 'error', line, target, message: 'HTML 链接使用了危险协议' })
    }
  }
}

function scanImages(content: string, issues: DocumentHealthIssue[]): void {
  const checkImage = (src: string, line: number, width?: string, height?: string) => {
    if (!src) {
      addIssue(issues, { type: 'empty-image-src', severity: 'error', line, message: '图片地址为空' })
      return
    }
    if (!isAllowedImageSrc(src)) {
      addIssue(issues, { type: 'suspicious-image-src', severity: 'warning', line, target: src, message: '图片地址协议不可识别或不受支持' })
    }

    const widthValue = Number(width || 0)
    const heightValue = Number(height || 0)
    if (widthValue > 4000 || heightValue > 4000) {
      addIssue(issues, { type: 'oversized-image-dimension', severity: 'info', line, target: src, message: '图片尺寸属性过大，可能影响阅读或导出' })
    }
  }

  for (const match of extractMarkdownTargets(content, 'image')) {
    checkImage(stripTitle(match.target), lineForIndex(content, match.index))
  }

  const htmlImageRegex = /<img\b[^>]*>/gi
  for (const match of content.matchAll(htmlImageRegex)) {
    const tag = match[0]
    checkImage(getAttr(tag, 'src'), lineForIndex(content, match.index || 0), getAttr(tag, 'width'), getAttr(tag, 'height'))
  }
}

export function analyzeDocumentHealth(content: string, filePath?: string): DocumentHealthResult {
  const issues: DocumentHealthIssue[] = []
  const seenHeadings = new Map<string, number>()

  content.split('\n').forEach((lineText, index) => {
    const heading = lineText.match(/^(#{1,6})\s+(.+?)\s*#*$/)
    if (!heading) return
    const slug = slugify(heading[2])
    if (!slug) return
    const count = seenHeadings.get(slug) || 0
    if (count > 0) {
      addIssue(issues, {
        type: 'duplicate-heading-slug',
        severity: 'warning',
        line: index + 1,
        target: slug,
        message: '重复标题会生成相同锚点，目录跳转可能不稳定',
      })
    }
    seenHeadings.set(slug, count + 1)
  })

  const maskedContent = maskCodeRegions(content)
  scanLinks(maskedContent, issues)
  scanImages(maskedContent, issues)

  const katexDelimiters = [...content.matchAll(/^\s*\$\$\s*$/gm)]
  if (katexDelimiters.length % 2 !== 0) {
    const last = katexDelimiters[katexDelimiters.length - 1]
    addIssue(issues, {
      type: 'mismatched-katex-block-delimiter',
      severity: 'error',
      line: lineForIndex(content, last?.index || 0),
      target: '$$',
      message: '块级公式 $$ 定界符数量不匹配',
    })
  }

  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/gi
  for (const match of content.matchAll(mermaidRegex)) {
    if (!(match[1] || '').trim()) {
      addIssue(issues, {
        type: 'empty-mermaid-block',
        severity: 'warning',
        line: lineForIndex(content, match.index || 0),
        message: 'Mermaid 代码块为空',
      })
    }
  }

  const summary = issues.reduce<DocumentHealthSummary>((acc, issue) => {
    acc.totalIssues += 1
    if (issue.severity === 'error') acc.errors += 1
    if (issue.severity === 'warning') acc.warnings += 1
    if (issue.severity === 'info') acc.info += 1
    return acc
  }, { totalIssues: 0, errors: 0, warnings: 0, info: 0, errorCount: 0, warningCount: 0, infoCount: 0, filePath })

  summary.errorCount = summary.errors
  summary.warningCount = summary.warnings
  summary.infoCount = summary.info

  return { summary, issues }
}

function extractMarkdownTargets(content: string, kind: 'image' | 'link'): Array<{ target: string; index: number }> {
  const targets: Array<{ target: string; index: number }> = []
  let cursor = 0

  while (cursor < content.length) {
    const marker = kind === 'image' ? '![' : '['
    const start = content.indexOf(marker, cursor)
    if (start < 0) break
    if (kind === 'link' && content[start - 1] === '!') {
      cursor = start + 1
      continue
    }

    const labelStart = kind === 'image' ? start + 1 : start
    const labelEnd = content.indexOf(']', labelStart + 1)
    if (labelEnd < 0 || content[labelEnd + 1] !== '(') {
      cursor = start + 1
      continue
    }

    const target = readMarkdownTarget(content, labelEnd + 1)
    if (!target) {
      cursor = labelEnd + 1
      continue
    }

    targets.push({ target: target.value, index: start })
    cursor = target.end + 1
  }

  return targets
}

function readMarkdownTarget(content: string, openIndex: number): { value: string; end: number } | null {
  let depth = 0
  let value = ''

  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index]
    if (char === '\n' || char === '\r') return null
    if (char === '\\') {
      value += char
      if (index + 1 < content.length) {
        index += 1
        value += content[index]
      }
      continue
    }
    if (char === '(') {
      if (depth > 0) value += char
      depth += 1
      continue
    }
    if (char === ')') {
      depth -= 1
      if (depth === 0) return { value, end: index }
      value += char
      continue
    }
    value += char
  }

  return null
}
