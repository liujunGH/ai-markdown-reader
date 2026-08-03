/**
 * DocumentView —— 虚拟化文档视图（v2 渲染层核心）
 *
 * 用 TanStack Virtual 把 ParsedDocument.blocks 按可见区间映射到 DOM。
 * 滚出视口的块自动卸载（React 不渲染），根治旧 VirtualMarkdown 的 visibleIds
 * 只增不减导致内存随阅读深度单调增长的问题。
 *
 * 可见区及其预取窗口内的块按批次交给 Worker 渲染：
 *  - 只在需要时生成 HTML，主线程块级净化并写入 per-document 有界 LRU
 *  - 每个可见块再由 BlockRenderer 注入 HTML
 *  - 挂载后跑 enhanceBlock（链接/表格/代码/task/katex/wiki/image/mermaid/高亮）
 *  - measureElement 动态测量真实高度
 *
 * 增强选项通过 props 传入（filePath/readingHighlights/searchHighlight/wiki/image 回调）。
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ParsedDocument } from './types'
import { BlockRenderer } from './BlockRenderer'
import { BlockHtmlCache } from './BlockHtmlCache'
import { renderBlocksAsync } from './blockRenderClient'
import { sanitizeBlock } from './sanitizer/config'
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
  contentVersion: string | number
  /** 分段索引是否仍在后台扩展，用于可访问状态和性能验证。 */
  indexing?: boolean
  /** 增强选项（不传则只净化注入，不跑增强——用于测试/纯展示） */
  enhance?: DocumentViewEnhanceProps
  /** 滚动容器 className */
  className?: string
}

export interface DocumentViewHandle {
  /** 取滚动容器 DOM（供外部 scrollTo / scrollSpy 用） */
  getScrollElement: () => HTMLElement | null
  /** 滚动到指定 heading id（锚点跳转） */
  scrollToHeading: (headingId: string) => void
  /** 滚动到指定行号（快速跳转/搜索定位） */
  scrollToLine: (line: number) => void
}

export const DocumentView = forwardRef<DocumentViewHandle, DocumentViewProps>(
  function DocumentView({ document: parsedDoc, contentVersion, indexing = false, enhance, className }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const { blocks } = parsedDoc
    const previousBlockCountRef = useRef(blocks.length)
    const stickToEndRef = useRef(false)

    // per-document 有界 HTML LRU；文档切换时整组释放。
    const blockHtmlCache = useMemo(
      () => new BlockHtmlCache(),
      [contentVersion]
    )
    const [htmlVersion, setHtmlVersion] = useState(0)

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
        scrollToHeading: (headingId: string) => {
          // 虚拟列表场景：heading 可能在未渲染块中，用 scrollToIndex 滚动到对应块
          const blockIdx = blocks.findIndex((b) => b.meta?.headingId === headingId)
          if (blockIdx >= 0) {
            virtualizer.scrollToIndex(blockIdx, { align: 'start' })
            // 等虚拟列表渲染后再微调（可选）
            requestAnimationFrame(() => {
              const el = scrollRef.current?.querySelector(`#${CSS.escape(headingId)}`)
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            })
          }
        },
        scrollToLine: (line: number) => {
          // 找到覆盖该行的块（块的 startLine <= line <= endLine）
          const blockIdx = blocks.findIndex(
            (b) => b.startLine <= line && line <= b.endLine
          )
          if (blockIdx >= 0) {
            virtualizer.scrollToIndex(blockIdx, { align: 'center' })
          }
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [blocks]
    )

    const virtualItems = virtualizer.getVirtualItems()

    // 用户在增量索引完成前已经拖到底部时，完整块索引到达后保持尾部锚定。
    useEffect(() => {
      const previousCount = previousBlockCountRef.current
      previousBlockCountRef.current = blocks.length
      if (blocks.length <= previousCount || !stickToEndRef.current) return
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(blocks.length - 1, { align: 'end' })
      })
    }, [blocks.length, virtualizer])

    // 异步增强（尤其 Mermaid）改变块高后，必须重新测量现有 DOM。
    // virtualizer.measure() 只会清空尺寸缓存；已挂载元素的 ref 不会因此重新触发，
    // 会让后续块继续使用预估坐标并与图表重叠。
    const measureVisibleBlocks = useCallback(() => {
      requestAnimationFrame(() => {
        const blockElements = scrollRef.current?.firstElementChild?.children
        if (!blockElements) return
        Array.from(blockElements).forEach((element) => {
          if (element instanceof HTMLElement && element.hasAttribute('data-index')) {
            const index = Number(element.getAttribute('data-index'))
            if (Number.isInteger(index)) {
              const measuredHeight = Math.ceil(element.getBoundingClientRect().height)
              virtualizer.resizeItem(index, measuredHeight)
            }
          }
        })
      })
    }, [virtualizer])

    const firstVisibleIndex = virtualItems[0]?.index ?? -1
    const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1

    const renderBlockRange = useCallback((requestedStart: number, requestedEnd: number) => {
      const start = Math.max(0, requestedStart)
      const end = Math.min(blocks.length - 1, requestedEnd)
      if (start > end) return
      const ids: number[] = []
      for (let index = start; index <= end; index += 1) ids.push(blocks[index].id)
      const reservedIds = blockHtmlCache.reserve(ids)
      if (reservedIds.length === 0) return

      const reservedSet = new Set(reservedIds)
      const requestedBlocks = blocks
        .slice(start, end + 1)
        .filter((block) => reservedSet.has(block.id))
      void renderBlocksAsync(requestedBlocks, parsedDoc.referenceDefinitions).then(
        (renderedBlocks) => {
          blockHtmlCache.resolve(renderedBlocks.map(({ id, html }) => ({
            id,
            html: sanitizeBlock(html),
          })))
          setHtmlVersion((version) => version + 1)
        },
        () => {
          blockHtmlCache.reject(reservedIds)
          setHtmlVersion((version) => version + 1)
        },
      )
    }, [blockHtmlCache, blocks, parsedDoc.referenceDefinitions])

    // 可见区前后再预取 12 个语义块；只把这些块发给 HTML Worker。
    useEffect(() => {
      if (firstVisibleIndex < 0 || lastVisibleIndex < 0) return
      renderBlockRange(firstVisibleIndex - 12, lastVisibleIndex + 12)
    }, [firstVisibleIndex, lastVisibleIndex, renderBlockRange])

    // 完整索引到达后低成本预热最后 20 个块。LRU 仍限制在 160 块，新增常驻
    // HTML 很小，却能覆盖拖动滚动条到底、阅读进度恢复和“跳到尾部”等常见路径。
    useEffect(() => {
      if (indexing || blocks.length === 0) return
      renderBlockRange(blocks.length - 20, blocks.length - 1)
    }, [blocks.length, indexing, renderBlockRange])

    const handleScroll = useCallback(() => {
      const element = scrollRef.current
      if (!element) return
      const distanceFromEnd = element.scrollHeight - element.scrollTop - element.clientHeight
      stickToEndRef.current = distanceFromEnd < 48

      // 滚动条被直接拖到末尾时，在下一次 React effect 前就发出尾部渲染请求。
      // reserve() 会与索引完成预热和可见区预取自动去重。
      if (distanceFromEnd < Math.max(element.clientHeight, 512)) {
        renderBlockRange(blocks.length - 20, blocks.length - 1)
      }
    }, [blocks.length, renderBlockRange])

    // 占位块替换成真实 HTML 后重新测量，避免累计高度误差。
    useEffect(() => {
      if (htmlVersion > 0) measureVisibleBlocks()
    }, [htmlVersion, measureVisibleBlocks])

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
            enhanceMermaid(dom, { onHeightChange: measureVisibleBlocks })
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
        onHeightChange: measureVisibleBlocks,
        mermaidTheme: undefined,
      }
    }, [enhance, measureVisibleBlocks])

    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-busy={indexing}
        data-indexing={indexing ? 'true' : 'false'}
        className={`document-view-scroll ${className ?? ''}`.trim()}
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
            const html = blockHtmlCache.get(block.id)
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
                {html === undefined ? (
                  <div
                    aria-busy="true"
                    style={{ minHeight: `${block.estimatedHeight}px` }}
                  />
                ) : enhanceOptions ? (
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
