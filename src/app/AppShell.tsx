/**
 * AppShell —— v2 应用骨架
 *
 * 取代旧 App.tsx 的顶层协调职责（1830 行的 AppInner）。AppShell 只负责：
 *  1. 启动初始化：restoreSession + installTabSideEffects（一次）
 *  2. 全局 IPC 事件绑定（open-file/open-folder/file-changed，聚合到 useXxxEvent）
 *  3. Provider 装配（ErrorBoundary 最外层 → ThemeProvider → 内容）
 *
 * 不持有业务状态——状态都在 v2 stores（tab/ui/file/toast/reading）里。
 * 子组件直接从 stores 用 selector 订阅自己需要的状态。
 *
 * 阶段 3 提供 AppShell 骨架 + 初始化逻辑。实际的业务 UI 树（Toolbar/TabBar/
 * Sidebar/DocumentView 等）在阶段 4 通过 children/render prop 接入。
 */
import { useEffect, type ReactNode } from 'react'
import { ThemeProvider } from '../context/ThemeContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useTabStore, installTabSideEffects } from '../state'
import { useOpenFileEvent, useOpenFolderEvent, useFileChangedEvent } from '../ipc/events'

interface AppShellProps {
  /** 业务 UI 树（阶段 4 接入 Toolbar/TabBar/Sidebar/DocumentView 等） */
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  // 一次性初始化：安装副作用 + 恢复会话
  useEffect(() => {
    installTabSideEffects()
    void useTabStore.getState().restoreSession()
  }, [])

  // 全局 IPC 事件：这些是应用级事件，不属于任何单个 feature。
  // 阶段 3 仅订阅（保持事件链路通），实际处理在阶段 4 接入 handleFileOpen 后实现。
  // 注：阶段 3 运行时这些事件会被订阅但不处理（主进程发的 open-file 不会触发建标签），
  // 这是骨架阶段的预期行为——阶段 4 替换回调体。
  useOpenFileEvent((_filePath) => {
    // TODO(stage4): handleFileOpen(_filePath) — 建标签 + DocumentCache 回源
  })

  useOpenFolderEvent((_folderPath) => {
    // TODO(stage4): handleOpenFolder(_folderPath)
  })

  useFileChangedEvent((_filePath) => {
    // TODO(stage4): 触发文件变更提示横幅
  })

  return (
    <ErrorBoundary>
      <ThemeProvider>{children ?? <AppShellPlaceholder />}</ThemeProvider>
    </ErrorBoundary>
  )
}

/** 阶段 3 占位：确认 state 层与 AppShell 已就绪。阶段 4 替换为真实 UI。 */
function AppShellPlaceholder() {
  const tabs = useTabStore((s) => s.tabs)
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>v2 架构已就绪</h2>
      <p>状态层（tab/ui/file/toast/reading）+ IPC client/events + AppShell 已装配。</p>
      <p>已恢复标签数：{tabs.length}</p>
      <p style={{ color: '#888' }}>业务 UI 在阶段 4 接入。</p>
    </div>
  )
}
