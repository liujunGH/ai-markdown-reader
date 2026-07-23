/**
 * DocumentView —— 虚拟化文档视图（v2 渲染层核心）
 *
 * 用 TanStack Virtual 把 ParsedDocument.blocks 按可见区间映射到 DOM。
 * 滚出视口的块自动卸载（React 不渲染），根治旧 VirtualMarkdown 的 visibleIds
 * 只增不减导致内存随阅读深度单调增长的问题。
 *
 * 每个块：
 *  - 用 getSanitizedBlockHtml 取已净化 HTML（块级净化，per-document 缓存）
 *  - dangerouslySetInnerHTML 注入（块已是净化后的可信 HTML）
 *  - measureElement 动态测量真实高度，校正 estimateHeight 的估算
 *
 * 阶段 2 聚焦"虚拟化渲染骨架"。Mermaid/图片/代码复制/task list 等 DOM 增强
 * 在阶段 4 通过 renderBlock prop 注入（块挂载/卸载时由本组件触发增强 hook）。
 * 注意：heading id 尚未注入 DOM（阶段 4 做），阶段 2 内大纲/锚点/scrollspy 不可用。
 */
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ParsedDocument } from './types'
import { getSanitizedBlockHtml, createBlockSanitizeCache } from './pipeline/renderer'

export interface DocumentViewProps {
  /** 已解析的文档块模型 */
  document: ParsedDocument
  /** 内容变更时递增的 key（触发净化缓存重建） */
  contentVersion: number
  /** 自定义块渲染（DOM 增强阶段用于注入 mermaid/图片/代码增强） */
  renderBlock?: (blockIndex: number, html: string) => React.ReactNode
  /** 滚动容器 className */
  className?: string
}

export interface DocumentViewHandle {
  /** 取滚动容器 DOM（供外部 scrollTo / scrollSpy 用） */
  getScrollElement: () => HTMLElement | null
}

export const DocumentView = forwardRef<DocumentViewHandle, DocumentViewProps>(
  function DocumentView({ document, contentVersion, renderBlock, className }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const { blocks } = document

    // per-document 净化缓存：依赖 document + contentVersion，切换/变更时重建
    const sanitizeCache = useMemo(
      () => createBlockSanitizeCache(),
      [document, contentVersion]
    )

    const virtualizer = useVirtualizer({
      count: blocks.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index) => blocks[index]?.estimatedHeight ?? 48,
      overscan: 4,
    })

    // 暴露 getScrollElement（用 useImperativeHandle，避免每次 render 创建新对象）
    useImperativeHandle(
      ref,
      () => ({
        getScrollElement: () => scrollRef.current,
      }),
      []
    )

    const virtualItems = virtualizer.getVirtualItems()

    // 预计算可见块的净化 HTML（用 per-document 缓存）
    const blockHtmlCache = useMemo(() => {
      const map = new Map<number, string>()
      for (const vi of virtualItems) {
        const block = blocks[vi.index]
        if (block) map.set(vi.index, getSanitizedBlockHtml(block, sanitizeCache))
      }
      return map
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [virtualItems, blocks, sanitizeCache])

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
                {renderBlock ? (
                  renderBlock(vi.index, html)
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
