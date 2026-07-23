/**
 * AppShell —— v2 应用骨架（端到端可用）
 *
 * 装配 providers + 全局 IPC 事件 + ReaderPanel（文档显示）。
 * open-file 事件 → useDocumentActions.handleOpenFileEvent → 建 tab + 回源 →
 * ReaderPanel 的 useDocument → DocumentView 渲染。
 *
 * 阶段 4.7：最小可用里程碑——能用新架构端到端显示打开的文档。
 * 后续阶段在此骨架上接入 TabBar/Outline/搜索/阅读工具等。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { ThemeProvider } from '../context/ThemeContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useTabStore, installTabSideEffects } from '../state'
import { useOpenFileEvent, useOpenFolderEvent, useFileChangedEvent } from '../ipc/events'
import { useDocumentActions } from './useDocumentActions'
import { ReaderPanel } from './ReaderPanel'

interface AppShellProps {
  /** 业务 UI 树（阶段 4.8+ 接入 TabBar/Sidebar 等；默认用内置最小 UI） */
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false)
  const {
    handleOpenFileEvent,
    openFileDialog,
    openExample,
  } = useDocumentActions()

  // 一次性初始化：安装副作用 + 恢复会话
  useEffect(() => {
    installTabSideEffects()
    void useTabStore.getState().restoreSession().finally(() => setReady(true))
  }, [])

  // 全局 IPC 事件：open-file 完成端到端链路
  useOpenFileEvent((filePath) => {
    handleOpenFileEvent(filePath)
  })

  useOpenFolderEvent((_folderPath) => {
    // 阶段 4.10 接入文件夹浏览器
  })

  useFileChangedEvent((_filePath) => {
    // 阶段 4.10 接入文件变更提示
  })

  if (!ready) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#888' }}>
        正在恢复会话…
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>{children ?? <MinimalAppShell onOpenFile={openFileDialog} onOpenExample={openExample} />}</ThemeProvider>
    </ErrorBoundary>
  )
}

/** 最小可用 UI：工具栏（打开文件/示例）+ ReaderPanel */
function MinimalAppShell({
  onOpenFile,
  onOpenExample,
}: {
  onOpenFile: () => Promise<string | null>
  onOpenExample: () => void
}) {
  const tabsCount = useTabStore((s) => s.tabs.length)
  const activeTabName = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border, #e0e0e0)',
          background: 'var(--bg-secondary, #f5f5f5)',
        }}
      >
        <strong style={{ marginRight: 8 }}>Markdown Reader (v2)</strong>
        <button type="button" onClick={() => void onOpenFile()}>
          📂 打开文件
        </button>
        <button type="button" onClick={onOpenExample}>
          📄 示例文档
        </button>
        <span style={{ marginLeft: 'auto', color: '#888', fontSize: 13 }}>
          标签 {tabsCount}
          {activeTabName ? ` · ${activeTabName}` : ''}
        </span>
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <ReaderPanel />
      </main>
    </div>
  )
}
