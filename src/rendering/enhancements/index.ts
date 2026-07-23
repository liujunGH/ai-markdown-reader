/**
 * 块增强统一入口
 *
 * 一个块挂载后，调 enhanceBlock(dom, options) 跑所有适用的增强。
 * 取代旧 MarkdownRenderer 整篇 8 轮 querySelectorAll——块级处理成本极低，
 * 且事件监听随块 DOM 卸载自动回收（无需手动 removeEventListener）。
 *
 * 增强顺序：结构类（链接/表格/代码/task/katex/wiki/image）先于内容类
 *（高亮），mermaid 异步最后。
 */
import type { DocumentBlock } from '../types'
import { enhanceLinks } from './linkEnhancer'
import { enhanceTables } from './tableEnhancer'
import { enhanceCodeBlocks } from './codeEnhancer'
import { enhanceTaskLists } from './taskListEnhancer'
import { enhanceKatex } from './katexEnhancer'
import { enhanceWikiLinks } from './wikiLinkEnhancer'
import { enhanceImages } from './imageEnhancer'
import { enhanceMermaid } from './mermaidEnhancer'
import {
  enhanceReadingHighlights,
  enhanceSearchHighlights,
} from './highlightEnhancer'

export interface EnhanceBlockOptions {
  /** 当前块（决定跑哪些增强） */
  block: DocumentBlock
  /** 文档内容指纹（code-fold / task-checks 持久化 key） */
  docHash: string
  /** 当前文档文件路径（图片路径解析用） */
  filePath?: string
  /** 阅读高亮文本列表 */
  readingHighlights?: string[]
  /** 搜索高亮 */
  searchHighlight?: { query: string; isRegex: boolean }
  /** wiki link 点击 */
  onWikiLinkClick?: (target: string, altTarget?: string) => void
  /** 图片大图预览 */
  onPreviewImage?: (info: { src: string; alt: string; originalSrc: string }) => void
  /** mermaid 渲染后块高度变化（通知虚拟列表重测） */
  onHeightChange?: () => void
  /** mermaid 主题 */
  mermaidTheme?: 'dark' | 'default'
}

/**
 * 对单个块 DOM 跑全部适用增强。
 * 幂等：每个子增强内部检查已处理标记，重复调用安全。
 */
export function enhanceBlock(dom: HTMLElement, options: EnhanceBlockOptions): void {
  const { block } = options

  // 结构类增强（所有块都跑，querySelectorAll 在小块上成本可忽略）
  enhanceLinks(dom)
  enhanceTables(dom)
  enhanceCodeBlocks(dom, { docHash: options.docHash })
  enhanceTaskLists(dom, { docHash: options.docHash })
  enhanceKatex(dom)
  enhanceWikiLinks(dom, { onWikiLinkClick: options.onWikiLinkClick })

  // 图片增强（仅含图片的块）
  if (block.meta?.hasLocalImage) {
    enhanceImages(dom, {
      filePath: options.filePath,
      onPreviewImage: options.onPreviewImage,
    })
  }

  // 内容类增强：阅读高亮
  if (options.readingHighlights && options.readingHighlights.length > 0) {
    enhanceReadingHighlights(dom, { highlights: options.readingHighlights })
  }

  // 内容类增强：搜索高亮
  if (options.searchHighlight && options.searchHighlight.query) {
    enhanceSearchHighlights(dom, options.searchHighlight)
  }

  // Mermaid 异步增强（最后，渲染后触发 onHeightChange）
  if (block.meta?.hasMermaid) {
    enhanceMermaid(dom, {
      onHeightChange: options.onHeightChange,
      theme: options.mermaidTheme,
    })
  }
}

// 重导出各增强 + markActiveSearchMatch（DocumentView post-enhance 用）
export { markActiveSearchMatch } from './highlightEnhancer'
export { getDocHash } from './codeEnhancer'
