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
import { useTabStore, useUIStore, useActiveDocStore, useReadingStore } from '../state'
import { useDocument } from '../rendering/hooks/useDocument'
import { DocumentView, type DocumentViewHandle } from '../rendering/DocumentView'
import { getDocHash } from '../rendering/enhancements'
import { getContent } from '../resources/DocumentCache'
import { useDocumentActions } from './useDocumentActions'
import { ReaderOutline } from '../features/reader/ReaderOutline'
import { registerReaderScroll } from './readerScrollRegistry'
import { readFile } from '../ipc/client'

/** 解析 wiki link [[target]] 并打开对应文件 */
async function handleWikiLink(target: string, altTarget?: string): Promise<void> {
  const activeTab = useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId)
  const api = window.electronAPI
  if (!api) return
  const dir = activeTab?.filePath ? api.pathDirname(activeTab.filePath) : ''
  const candidates = [target, altTarget, `${target}.md`, `${target}.markdown`].filter(Boolean) as string[]
  if (altTarget) candidates.push(`${altTarget}.md`, `${altTarget}.markdown`)
  for (const c of candidates) {
    const fullPath = dir ? api.pathJoin(dir, c) : c
    const r = await readFile(fullPath)
    if (r.success && r.content !== undefined) {
      const name = api.pathBasename(fullPath)
      useTabStore.getState().openFile(name, fullPath)
      const { setContent } = await import('../resources/DocumentCache')
      const tabId = useTabStore.getState().activeTabId
      if (tabId) {
        setContent(tabId, r.content, fullPath)
        useTabStore.getState().setContentStatus(tabId, 'ready')
      }
      return
    }
  }
}

export function ReaderPanel() {
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const fontSize = useUIStore((s) => s.fontSize)
  const { syncWindowTitle } = useDocumentActions()
  const docViewRef = useRef<DocumentViewHandle>(null)

  const tabId = activeTab?.id ?? ''
  const filePath = activeTab?.filePath

  // 搜索/阅读高亮 + 图片预览（从 activeDocStore / readingStore 取，兄弟组件写入）
  const searchHighlight = useActiveDocStore((s) => s.searchHighlight)
  const currentMatch = useActiveDocStore((s) => s.currentMatch)
  const matchCount = useActiveDocStore((s) => s.matchCount)
  const setPreviewImage = useActiveDocStore((s) => s.setPreviewImage)
  const allMarks = useReadingStore((s) => s.readerMarks)
  // 当前文件的高亮文本（≥2 字符）
  const readingHighlights = useMemo(() => {
    return allMarks
      .filter((m) => m.kind === 'highlight' && m.filePath === filePath && m.text.length >= 2)
      .map((m) => m.text)
  }, [allMarks, filePath])

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
            searchHighlight: searchHighlight ?? undefined,
            currentMatch,
            matchCount,
            readingHighlights,
            onWikiLinkClick: (target, altTarget) => {
              // wiki link 解析打开（复用 useDocumentActions 的路径解析）
              void handleWikiLink(target, altTarget)
            },
            onPreviewImage: (info) => {
              setPreviewImage(info)
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
