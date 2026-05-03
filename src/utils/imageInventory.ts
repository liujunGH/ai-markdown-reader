import { resolveLocalImagePath } from './imagePaths'

export type MarkdownImageType = 'local-relative' | 'local-absolute' | 'remote' | 'data' | 'blob' | 'unknown'
export type ImageSourceType = MarkdownImageType

export interface MarkdownImageItem {
  alt: string
  src: string
  line: number
  type: MarkdownImageType
  resolvedPath?: string
  warnings: string[]
}
export type MarkdownImageInventoryItem = MarkdownImageItem

function lineForIndex(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

function stripTitle(srcWithTitle: string): string {
  const trimmed = srcWithTitle.trim()
  const titleMatch = trimmed.match(/^(\S+)\s+["'][^"']*["']$/)
  return titleMatch ? titleMatch[1] : trimmed
}

function getAttr(tag: string, attr: string): string {
  const match = tag.match(new RegExp(`\\s${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? ''
}

function classifySrc(src: string): MarkdownImageType {
  if (!src) return 'unknown'
  if (/^https?:\/\//i.test(src) || src.startsWith('//')) return 'remote'
  if (/^data:image\//i.test(src)) return 'data'
  if (/^blob:/i.test(src)) return 'blob'
  if (src.startsWith('/')) return 'local-absolute'
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return 'unknown'
  return 'local-relative'
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

function buildImageItem(alt: string, rawSrc: string, line: number, filePath?: string): MarkdownImageItem {
  const src = stripTitle(rawSrc)
  const type = classifySrc(src)
  const warnings: string[] = []
  let resolvedPath: string | undefined

  if (!src) {
    warnings.push('图片 src 为空')
  }

  if (type === 'unknown' && src) {
    warnings.push('无法识别的图片地址协议')
  }

  if (type === 'local-absolute') {
    resolvedPath = src
  } else if (type === 'local-relative') {
    resolvedPath = resolveLocalImagePath(src, filePath) || undefined
    if (!filePath) warnings.push('相对图片需要先保存或打开本地 Markdown 文件才能定位')
  }

  return { alt, src, line, type, resolvedPath, warnings }
}

export function analyzeMarkdownImages(content: string, filePath?: string): MarkdownImageItem[] {
  const maskedContent = maskCodeRegions(content)
  const images: MarkdownImageItem[] = []

  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g
  for (const match of maskedContent.matchAll(markdownImageRegex)) {
    images.push(buildImageItem(match[1] || '', match[2] || '', lineForIndex(content, match.index || 0), filePath))
  }

  const htmlImageRegex = /<img\b[^>]*>/gi
  for (const match of maskedContent.matchAll(htmlImageRegex)) {
    const tag = match[0]
    images.push(buildImageItem(getAttr(tag, 'alt'), getAttr(tag, 'src'), lineForIndex(content, match.index || 0), filePath))
  }

  return images
}

export function getImageRepairSuggestion(image: MarkdownImageItem): string {
  if (!image.src) {
    return '补全图片地址，或删除这个空图片引用。'
  }
  if (image.type === 'local-relative' && !image.resolvedPath) {
    return '本地相对图片没有解析到文件；检查路径拼写，或把图片放到 Markdown 同级/子目录。'
  }
  if (image.type === 'local-absolute') {
    return '绝对路径只在当前电脑稳定；建议改成相对路径，方便迁移整个知识库。'
  }
  if (image.type === 'remote') {
    return '网络图片依赖外部访问；离线使用时建议下载到本地并改成相对路径。'
  }
  if (image.type === 'unknown') {
    return '图片协议无法识别；建议改成 http(s)、data 或本地相对路径。'
  }
  if (image.warnings.length > 0) {
    return image.warnings[0]
  }
  return '图片引用看起来正常。'
}
