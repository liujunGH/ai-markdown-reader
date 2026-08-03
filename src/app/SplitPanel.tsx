/**
 * SplitPanel —— 分屏副面板（渲染 secondaryTabId 的文档）
 *
 * 独立于 ReaderPanel，自己用 useDocument 取副标签文档。
 * 由 isSplitView + secondaryTabId 控制显示。
 */
import { useMemo } from 'react'
import { useTabStore, useUIStore } from '../state'
import { useDocument } from '../rendering/hooks/useDocument'
import { DocumentView } from '../rendering/DocumentView'
import { getDocHash } from '../rendering/enhancements'
import { getContent } from '../resources/DocumentCache'

export function SplitPanel() {
  const secondaryTabId = useUIStore((s) => s.secondaryTabId)
  const fontSize = useUIStore((s) => s.fontSize)
  const secondaryTab = useTabStore((s) => s.tabs.find((t) => t.id === secondaryTabId))
  const tabId = secondaryTab?.id ?? ''
  const filePath = secondaryTab?.filePath

  const { document, loading, indexing, error } = useDocument(tabId, filePath)

  const docHash = useMemo(() => {
    const content = getContent(tabId) ?? ''
    return getDocHash(content)
  }, [tabId, document])

  const contentVersion = docHash

  if (!secondaryTab) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>选择一个标签分屏</div>
  }
  if (loading) return <div style={{ color: '#888', padding: 24 }}>加载中…</div>
  if (error) return <div style={{ color: 'red', padding: 24 }}>加载失败：{error}</div>
  if (!document || document.blocks.length === 0) return <div style={{ color: '#888', padding: 24 }}>（空文档）</div>

  return (
    <div style={{ fontSize: `${fontSize}px`, height: '100%', padding: '24px 32px', overflow: 'auto' }}>
      <DocumentView
        document={document}
        contentVersion={contentVersion}
        indexing={indexing}
        enhance={{
          filePath,
          docHash,
          onWikiLinkClick: (target) => console.log('[split] wikilink', target),
          onPreviewImage: () => {},
        }}
      />
    </div>
  )
}
