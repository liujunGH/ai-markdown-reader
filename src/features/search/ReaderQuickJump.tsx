/**
 * ReaderQuickJump v2 —— 快速跳转容器（复用现有 QuickJump 展示组件）
 *
 * QuickJump 是纯展示（content + outlineItems + 回调）。
 * v2 从 DocumentCache 取 content，从 useDocument 的 document.outline 转 OutlineItem[]。
 */
import { useMemo } from 'react'
import { useTabStore, useUIStore } from '../../state'
import { useDocument } from '../../rendering/hooks/useDocument'
import { getContent } from '../../resources/DocumentCache'
import QuickJump from '../../components/QuickJump'
import type { OutlineItem } from '../../hooks/useOutline'

export function ReaderQuickJump() {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const showQuickJump = useUIStore((s) => s.panels.quickJump)
  const closePanel = useUIStore((s) => s.closePanel)
  const showSource = useUIStore((s) => s.panels.source)

  const { document } = useDocument(activeTabId, activeTab?.filePath)

  const content = useMemo(() => getContent(activeTabId) ?? '', [activeTabId])
  const outlineItems = useMemo<OutlineItem[]>(
    () =>
      (document?.outline ?? []).map((o) => ({
        level: o.level,
        text: o.text,
        id: o.id,
        position: o.line,
      })),
    [document]
  )

  // 跳转：阶段 4.10 先 console（需接 DocumentView 的 scrollTo）
  const handleJumpToLine = (line: number) => {
    console.log('[v2] jump to line', line)
    closePanel('quickJump')
  }
  const handleJumpToHeading = (id: string) => {
    console.log('[v2] jump to heading', id)
    closePanel('quickJump')
  }

  return (
    <QuickJump
      isOpen={showQuickJump}
      onClose={() => closePanel('quickJump')}
      content={content}
      outlineItems={outlineItems}
      onJumpToLine={handleJumpToLine}
      onJumpToHeading={handleJumpToHeading}
      totalLines={document?.totalLines ?? 0}
      showSource={showSource}
    />
  )
}
