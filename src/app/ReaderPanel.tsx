/**
 * ReaderPanel —— 文档阅读面板（v2 端到端显示链路）
 *
 * 取激活标签 → useDocument 从 DocumentCache 取 content + worker 解析 →
 * DocumentView 虚拟列表渲染 + 块级增强。
 *
 * 这是新渲染层的实际消费者。阶段 4.7 的最小可用里程碑：
 * 能用新架构端到端显示一个打开的文档（含 Mermaid/代码/表格/图片等增强）。
 *
 * 后续阶段接入：Outline/Minimap/搜索/阅读工具等围绕此面板。
 */
import { useMemo, useRef, useEffect } from 'react'
import { useTabStore, useUIStore } from '../state'
import { useDocument } from '../rendering/hooks/useDocument'
import { DocumentView, type DocumentViewHandle } from '../rendering/DocumentView'
import { getDocHash } from '../rendering/enhancements'
import { getContent } from '../resources/DocumentCache'
import { useDocumentActions } from './useDocumentActions'
import { ReaderOutline } from '../features/reader/ReaderOutline'
import { registerReaderScroll } from './readerScrollRegistry'

export function ReaderPanel() {
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const fontSize = useUIStore((s) => s.fontSize)
  const { syncWindowTitle } = useDocumentActions()
  const docViewRef = useRef<DocumentViewHandle>(null)

  // 注册 scroll handle 供阅读工具等兄弟组件触发
  useEffect(() => {
    registerReaderScroll(
      docViewRef.current
        ? {
            scrollToHeading: (id) => docViewRef.current?.scrollToHeading(id),
            scrollToLine: (line) => docViewRef.current?.scrollToLine(line),
          }
        : null
    )
    return () => registerReaderScroll(null)
  })

  const tabId = activeTab?.id ?? ''
  const filePath = activeTab?.filePath

  // 窗口标题随激活标签更新
  useMemo(() => {
    if (activeTab) syncWindowTitle(activeTab.name)
  }, [activeTab, syncWindowTitle])

  // 取文档块模型（useDocument 内部从 DocumentCache 取 content + worker 解析）
  const { document, loading, error } = useDocument(tabId, filePath)

  // 文档内容指纹（code-fold/task-checks 持久化 key）——从 DocumentCache 取原始 content
  const docHash = useMemo(() => {
    const content = getContent(tabId) ?? ''
    return getDocHash(content)
  }, [tabId, document])

  // contentVersion：文档变化时重建净化缓存（数字，用块数+hash 长度组合）
  const contentVersion = useMemo(() => {
    return document ? document.blocks.length + docHash.length : 0
  }, [document, docHash])

  if (!activeTab) {
    return <EmptyState message="没有打开的文档" />
  }

  if (loading) {
    return <EmptyState message="加载中…" />
  }

  if (error) {
    return <EmptyState message={`加载失败：${error}`} />
  }

  if (!document || document.blocks.length === 0) {
    return <EmptyState message="（空文档）" />
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div
        style={{
          flex: 1,
          fontSize: `${fontSize}px`,
          height: '100%',
          maxWidth: '820px',
          margin: '0 auto',
          padding: '24px 32px',
        }}
      >
        <DocumentView
          ref={docViewRef}
          document={document}
          contentVersion={contentVersion}
          enhance={{
            filePath,
            docHash,
            onWikiLinkClick: (target) => {
              // 阶段 4.10 接入 wiki link 解析打开
              console.log('[v2] wikilink click:', target)
            },
            onPreviewImage: (info) => {
              // 阶段 4.10 接入图片大图预览 overlay
              console.log('[v2] image preview:', info.originalSrc)
            },
          }}
        />
      </div>
      <aside style={{ width: 260, borderLeft: '1px solid var(--border, #e0e0e0)', overflowY: 'auto' }}>
        <ReaderOutline document={document} filePath={filePath} />
      </aside>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#888',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {message}
    </div>
  )
}
