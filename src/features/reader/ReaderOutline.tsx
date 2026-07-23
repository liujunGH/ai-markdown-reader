/**
 * ReaderOutline v2 —— 目录大纲（复用现有 Outline 展示组件）
 *
 * 现有 src/components/Outline 是纯展示组件（不依赖 store/content），直接复用。
 * v2 包装层负责数据适配：从 ParsedDocument.outline（块模型产出）转成 OutlineItem[]，
 * activeId 由 scrollSpy 提供（阶段 4.9+ 接入，暂用 null）。
 *
 * 这体现了迁移策略：纯展示组件原样复用，只在 v2 数据层做适配。
 */
import { useMemo } from 'react'
import { Outline } from '../../components/Outline'
import type { OutlineItem } from '../../hooks/useOutline'
import type { ParsedDocument } from '../../rendering/types'

interface ReaderOutlineProps {
  document: ParsedDocument
  filePath?: string
  activeId?: string | null
  onItemClick?: (id: string) => void
}

export function ReaderOutline({ document, filePath, activeId, onItemClick }: ReaderOutlineProps) {
  const items = useMemo<OutlineItem[]>(
    () =>
      document.outline.map((o) => ({
        level: o.level,
        text: o.text,
        id: o.id,
        position: o.line,
      })),
    [document]
  )

  return (
    <Outline
      items={items}
      activeId={activeId ?? null}
      onItemClick={(id) => onItemClick?.(id)}
      filePath={filePath}
    />
  )
}
