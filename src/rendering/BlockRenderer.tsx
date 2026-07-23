/**
 * BlockRenderer —— 单个文档块的渲染器
 *
 * 每个虚拟块用 BlockRenderer 渲染：
 *  1. dangerouslySetInnerHTML 注入已净化 HTML
 *  2. 挂载后（useEffect）跑 enhanceBlock（链接/表格/代码/task/katex/wiki/image/mermaid/高亮）
 *
 * 增强只在「块的 HTML 变化」或「关键增强参数变化」时重跑，避免 enhanceOptions
 * 对象引用变化导致反复重跑（重复绑定事件监听）。
 */
import { useEffect, useRef } from 'react'
import type { DocumentBlock } from './types'
import { enhanceBlock, type EnhanceBlockOptions } from './enhancements'

export interface BlockRendererProps {
  /** 要渲染的块 */
  block: DocumentBlock
  /** 已净化的 HTML（块级净化，来自 sanitizer） */
  html: string
  /** 增强选项（透传给 enhanceBlock） */
  enhanceOptions: Omit<EnhanceBlockOptions, 'block'>
}

export function BlockRenderer({ block, html, enhanceOptions }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const optionsRef = useRef(enhanceOptions)
  optionsRef.current = enhanceOptions

  // 增强只在块 HTML 或关键标量变化时重跑（非每次 render）
  // 关键标量：docHash / filePath / readingHighlights(序列化) / searchHighlight.query
  const readingHighlightsKey = (enhanceOptions.readingHighlights ?? []).join('\u0001')
  const searchKey = enhanceOptions.searchHighlight
    ? `${enhanceOptions.searchHighlight.query}|${enhanceOptions.searchHighlight.isRegex ? 1 : 0}`
    : ''

  useEffect(() => {
    if (!ref.current) return
    enhanceBlock(ref.current, { ...optionsRef.current, block })
    // 依赖：块本身 + html + 关键标量。回调（onWikiLinkClick 等）从 ref 取最新，
    // 不进依赖数组，避免回调重建触发重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, html, enhanceOptions.docHash, enhanceOptions.filePath, readingHighlightsKey, searchKey])

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
