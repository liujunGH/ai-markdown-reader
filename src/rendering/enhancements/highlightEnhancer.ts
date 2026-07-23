/**
 * 阅读高亮 + 搜索高亮增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 的两个 TreeWalker effect 一致（index.tsx:634-676 阅读高亮 +
 * 678-762 搜索高亮），但作用于单个块而非整篇：
 *  - 阅读高亮：readingHighlights 文本 → <mark class="reader-highlight">（≥2 字符）
 *  - 搜索高亮：searchQuery → <mark class="search-highlight">，当前匹配加 active 类
 *
 * 改进：TreeWalker 只遍历当前块（旧版遍历整篇），块级处理成本极低。
 * 排除 pre/code/mark/.katex/.mermaid-wrapper（阅读高亮）/SCRIPT/STYLE（搜索高亮）。
 */
import { escapeHtml } from '../pipeline/tokenizer'
import { buildSearchPattern } from '../../utils/search'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* ============================================================
 * 阅读高亮
 * ============================================================ */

export interface ReadingHighlightOptions {
  /** 要高亮的文本列表（≥2 字符才处理） */
  highlights: string[]
}

export function enhanceReadingHighlights(block: HTMLElement, options: ReadingHighlightOptions): void {
  // 先清除本块已有的阅读高亮（重新应用）
  const existingMarks = block.querySelectorAll('mark.reader-highlight')
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
      parent.normalize()
    }
  })

  const uniqueHighlights = Array.from(
    new Set(options.highlights.map((t) => t.trim()).filter((t) => t.length >= 2))
  )
  if (uniqueHighlights.length === 0) return

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement
    if (!textNode.textContent || !parent) return
    if (parent.closest('pre, code, mark, .katex, .mermaid-wrapper')) return

    let html = escapeHtml(textNode.textContent)
    let changed = false
    uniqueHighlights.forEach((highlight) => {
      const escaped = escapeRegExp(escapeHtml(highlight))
      const pattern = new RegExp(`(${escaped})`, 'gi')
      if (pattern.test(html)) {
        changed = true
        html = html.replace(pattern, '<mark class="reader-highlight">$1</mark>')
      }
    })
    if (changed) {
      const span = document.createElement('span')
      span.innerHTML = html
      textNode.parentNode?.replaceChild(span, textNode)
    }
  })
}

/* ============================================================
 * 搜索高亮
 * ============================================================ */

export interface SearchHighlightOptions {
  query: string
  isRegex: boolean
  /** 当前匹配序号（用于加 active 类 + scrollIntoView） */
  currentMatch?: number
  /** 总匹配数（currentMatch 有效时用） */
  matchCount?: number
}

/**
 * 搜索高亮：作用于单个块。
 * 注意：currentMatch 的 active 标记需要全局视角（所有块的 mark 按序号），
 * 这里只标记本块内的相对序号；全局 active 由调用方在所有块处理完后统一标。
 * 简化：本函数只做高亮，active 标记交给 DocumentView 的 post-enhance 步骤。
 */
export function enhanceSearchHighlights(block: HTMLElement, options: SearchHighlightOptions): void {
  // 先清除本块已有的搜索高亮
  const existingMarks = block.querySelectorAll('.search-highlight')
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
      parent.normalize()
    }
  })

  if (!options.query) return

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  const pattern = buildSearchPattern(options.query, options.isRegex)
  if (!pattern) return

  textNodes.forEach((textNode) => {
    if (!textNode.textContent) return
    const parent = textNode.parentElement
    if (!parent || parent.closest('.search-box')) return
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return
    if (parent.classList.contains('search-highlight')) return

    const nodeHtml = textNode.textContent
    let hasMatch = false

    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let match: RegExpExecArray | null
    pattern.lastIndex = 0

    while ((match = pattern.exec(nodeHtml)) !== null) {
      hasMatch = true
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(nodeHtml.slice(lastIndex, match.index)))
      }
      const mark = document.createElement('mark')
      mark.className = 'search-highlight'
      mark.textContent = match[0]
      fragment.appendChild(mark)
      lastIndex = match.index + match[0].length
      if (match[0].length === 0) {
        pattern.lastIndex += 1
      }
    }

    if (hasMatch) {
      if (lastIndex < nodeHtml.length) {
        fragment.appendChild(document.createTextNode(nodeHtml.slice(lastIndex)))
      }
      textNode.parentNode?.replaceChild(fragment, textNode)
    }
  })
}

/**
 * 标记当前活动搜索匹配并滚动到它（全局视角，在所有块高亮完成后调）。
 * 在 container 内找所有 .search-highlight，给第 currentMatch 个加 active 类。
 *
 * 类名用 `current`（与 global.css 的 `.search-highlight.current` 规则对齐）。
 */
export function markActiveSearchMatch(
  container: HTMLElement,
  currentMatch: number,
  matchCount: number
): void {
  if (matchCount <= 0) return
  const allMarks = container.querySelectorAll('.search-highlight')
  // 先清除所有 active
  allMarks.forEach((m) => m.classList.remove('current'))
  if (currentMatch >= 0 && allMarks[currentMatch]) {
    allMarks[currentMatch].classList.add('current')
    allMarks[currentMatch].scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
