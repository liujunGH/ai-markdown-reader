/**
 * DocumentView —— 虚拟化文档视图（v2 渲染层核心）
 *
 * 用 TanStack Virtual 把 ParsedDocument.blocks 按可见区间映射到 DOM。
 * 滚出视口的块自动卸载（React 不渲染），根治旧 VirtualMarkdown 的 visibleIds
 * 只增不减导致内存随阅读深度单调增长的问题。
 *
 * 每个可见块用 BlockRenderer 渲染：
 *  - 块级净化 HTML（per-document 缓存）
 *  - 挂载后跑 enhanceBlock（链接/表格/代码/task/katex/wiki/image/mermaid/高亮）
 *  - measureElement 动态测量真实高度
 *
 * 增强选项通过 props 传入（filePath/readingHighlights/searchHighlight/wiki/image 回调）。
 */
import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ParsedDocument } from './types'
import { getSanitizedBlockHtml, createBlockSanitizeCache } from './pipeline/renderer'
import { BlockRenderer } from './BlockRenderer'
import type { EnhanceBlockOptions } from './enhancements'
import { markActiveSearchMatch } from './enhancements'
import { enhanceMermaid } from './enhancements/mermaidEnhancer'

export interface DocumentViewEnhanceProps {
  /** 当前文档文件路径（图片路径解析用） */
  filePath?: string
  /** 阅读高亮文本列表 */
  readingHighlights?: string[]
  /** 搜索高亮 */
  searchHighlight?: { query: string; isRegex: boolean }
  /** 当前活动搜索匹配序号 */
  currentMatch?: number
  /** 搜索总匹配数 */
  matchCount?: number
  /** wiki link 点击 */
  onWikiLinkClick?: (target: string, altTarget?: string) => void
  /** 图片大图预览 */
  onPreviewImage?: (info: { src: string; alt: string; originalSrc: string }) => void
  /** 文档内容指纹（code-fold/task-checks 持久化 key） */
  docHash: string
}

export interface DocumentViewProps {
  /** 已解析的文档块模型 */
  document: ParsedDocument
  /** 内容变更时递增的 key（触发净化缓存重建） */
  contentVersion: number
  /** 增强选项（不传则只净化注入，不跑增强——用于测试/纯展示） */
  enhance?: DocumentViewEnhanceProps
  /** 滚动容器 className */
  className?: string
}

export interface DocumentViewHandle {
  /** 取滚动容器 DOM（供外部 scrollTo / scrollSpy 用） */
  getScrollElement: () => HTMLElement | null
}

export const DocumentView = forwardRef<DocumentViewHandle, DocumentViewProps>(
  function DocumentView({ document: parsedDoc, contentVersion, enhance, className }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const { blocks } = parsedDoc

    // per-document 净化缓存
    const sanitizeCache = useMemo(
      () => createBlockSanitizeCache(),
      [parsedDoc, contentVersion]
    )

    const virtualizer = useVirtualizer({
      count: blocks.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index) => blocks[index]?.estimatedHeight ?? 48,
      overscan: 4,
    })

    useImperativeHandle(
      ref,
      () => ({
        getScrollElement: () => scrollRef.current,
      }),
      []
    )

    const virtualItems = virtualizer.getVirtualItems()

    // 预计算可见块的净化 HTML
    const blockHtmlCache = useMemo(() => {
      const map = new Map<number, string>()
      for (const vi of virtualItems) {
        const block = blocks[vi.index]
        if (block) map.set(vi.index, getSanitizedBlockHtml(block, sanitizeCache))
      }
      return map
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [virtualItems, blocks, sanitizeCache])

    // 搜索 active 标记：仅在 currentMatch/matchCount 变化时标 active 并滚动
    //（不在每次 render 跑，避免滚动时反复 scrollIntoView 与用户滚动打架）
    const currentMatch = enhance?.currentMatch
    const matchCount = enhance?.matchCount
    useEffect(() => {
      if (!scrollRef.current) return
      if (matchCount && matchCount > 0 && currentMatch !== undefined) {
        markActiveSearchMatch(scrollRef.current, currentMatch, matchCount)
      }
    }, [currentMatch, matchCount])

    // 主题切换时重渲染可见块的 Mermaid（旧版 MutationObserver 的等价实现，但只重渲可见块）
    useEffect(() => {
      if (!enhance) return
      const observer = new MutationObserver(() => {
        // data-theme 变化时，对所有可见的已渲染 mermaid 触发重渲
        const wrappers = scrollRef.current?.querySelectorAll(
          '.mermaid-wrapper[data-mermaid-rendered]'
        )
        if (!wrappers || wrappers.length === 0) return
        // 重置为 pending，让 enhanceMermaid 重新渲染（主题已变）
        wrappers.forEach((w) => {
          const wrapper = w as HTMLElement
          const code = wrapper.getAttribute('data-mermaid-code')
          if (code) {
            wrapper.setAttribute('data-mermaid-rendered', 'pending')
            wrapper.innerHTML = `<div class="mermaid" data-code="${code}"></div>`
          }
        })
        // 重新跑可见块的 mermaid 增强
        for (const vi of virtualItems) {
          const block = blocks[vi.index]
          const dom = scrollRef.current?.querySelector(`[data-index="${vi.index}"]`)
          if (block?.meta?.hasMermaid && dom instanceof HTMLElement) {
            enhanceMermaid(dom, { onHeightChange: () => virtualizer.measure() })
          }
        }
      })
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
      return () => observer.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enhance])

    // 构造增强选项（透传给 BlockRenderer）
    const enhanceOptions: Omit<EnhanceBlockOptions, 'block'> | undefined = useMemo(() => {
      if (!enhance) return undefined
      return {
        docHash: enhance.docHash,
        filePath: enhance.filePath,
        readingHighlights: enhance.readingHighlights,
        searchHighlight: enhance.searchHighlight,
        onWikiLinkClick: enhance.onWikiLinkClick,
        onPreviewImage: enhance.onPreviewImage,
        onHeightChange: () => virtualizer.measure(),
        mermaidTheme: undefined,
      }
    }, [enhance, virtualizer])

    return (
      <div
        ref={scrollRef}
        className={className}
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((vi) => {
            const block = blocks[vi.index]
            if (!block) return null
            const html = blockHtmlCache.get(vi.index) ?? ''
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {enhanceOptions ? (
                  <BlockRenderer block={block} html={html} enhanceOptions={enhanceOptions} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
