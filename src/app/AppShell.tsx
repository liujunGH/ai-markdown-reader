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
import { useTabStore, installTabSideEffects, useUIStore, useToastStore, useFileStore } from '../state'
import { useOpenFileEvent, useOpenFolderEvent, useFileChangedEvent } from '../ipc/events'
import { useDocumentActions } from './useDocumentActions'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import { ReaderPanel } from './ReaderPanel'
import { TabBar } from '../features/tabs/TabBar'
import { StatusBar } from '../features/reader/StatusBar'
import { ReaderSearch } from '../features/search/ReaderSearch'
import { ReaderQuickJump } from '../features/search/ReaderQuickJump'
import { ReaderCommandPalette } from '../features/search/ReaderCommandPalette'
import { ReaderWorkspace } from '../features/workspace/ReaderWorkspace'
import { ReaderToolbar } from '../features/shell/ReaderToolbar'
import { ReaderExportPanel } from '../features/export/ReaderExportPanel'
import { ReaderGlobalSearch } from '../features/search/ReaderGlobalSearch'
import { ReaderReadingTools } from '../features/reading-tools/ReaderReadingTools'
import { ImagePreviewOverlay } from '../features/reader/ImagePreviewOverlay'
import { ReaderPanels } from '../features/shell/ReaderPanels'
import { UpdateNotification } from '../components/UpdateNotification'
import { basename } from '../utils/path'

interface AppShellProps {
  /** 业务 UI 树（阶段 4.8+ 接入 TabBar/Sidebar 等；默认用内置最小 UI） */
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false)
  const { handleOpenFileEvent, openDocumentWithContent } = useDocumentActions()
  const showToast = useToastStore((s) => s.showToast)
  const setFolder = useFileStore((s) => s.setFolder)

  // 一次性初始化：安装副作用 + 恢复会话
  useEffect(() => {
    installTabSideEffects()
    void useTabStore.getState().restoreSession().finally(() => setReady(true))
  }, [])

  // 全局 IPC 事件：open-file 完成端到端链路
  useOpenFileEvent((filePath) => {
    handleOpenFileEvent(filePath)
  })

  useOpenFolderEvent((folderPath) => {
    if (folderPath) {
      const name = basename(folderPath)
      setFolder(folderPath, name)
      useUIStore.getState().openPanel('fileSidebar')
    }
  })

  useFileChangedEvent((filePath) => {
    if (filePath) {
      const name = basename(filePath)
      showToast(`文件已变更：${name}，重新加载以更新`, 'success')
    }
  })

  // 拖拽打开文件
  useDragAndDrop(
    (content, name, filePath) => {
      openDocumentWithContent(content, name, filePath)
    },
    showToast
  )

  if (!ready) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#888' }}>
        正在恢复会话…
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>{children ?? <MinimalAppShell />}</ThemeProvider>
    </ErrorBoundary>
  )
}

/** 最小可用 UI：工具栏 + ReaderPanel + 侧栏 + 搜索/命令面板 */
function MinimalAppShell() {
  const togglePanel = useUIStore((s) => s.togglePanel)
  const showSearch = useUIStore((s) => s.panels.search)
  const showFileSidebar = useUIStore((s) => s.panels.fileSidebar)

  // 全局快捷键（搜索/命令面板/快速跳转）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'f' && !e.shiftKey) {
        e.preventDefault()
        togglePanel('search')
      } else if (mod && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        togglePanel('commandPalette')
      } else if (mod && e.key === 'g') {
        e.preventDefault()
        togglePanel('quickJump')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])

  return (
    <div className="_appShell" >
      <header className="_appHeader">
        <strong style={{ marginRight: 8 }}>Markdown Reader (v2)</strong>
        <ReaderToolbar />
      </header>
      <TabBar />
      <div className="_appBody">
        {showFileSidebar && (
          <aside style={{ width: 280, borderRight: '1px solid var(--border, #e0e0e0)', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
            <ReaderWorkspace />
          </aside>
        )}
        <main className="_appMain">
          <ReaderPanel />
          {showSearch && (
            <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 100 }}>
              <ReaderSearch />
            </div>
          )}
        </main>
      </div>
      <StatusBar />
      <ReaderCommandPalette />
      <ReaderQuickJump />
      <ReaderExportPanel />
      <ReaderGlobalSearch />
      <ReaderReadingTools />
      <ImagePreviewOverlay />
      <ReaderPanels />
      <UpdateNotification />
    </div>
  )
}
