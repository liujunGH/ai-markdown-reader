/**
 * useDocumentActions —— 文档打开/回源动作（v2 端到端链路）
 *
 * 桥接 IPC（open-file 事件 / 对话框返回的 content 或 filePath）与新架构：
 *  - 新 tabStore.openFile(name, filePath) 只建元数据（无 content）
 *  - content 存入 DocumentCache（资源层 LRU）
 *  - useDocument 从 DocumentCache 取 content → worker 解析 → DocumentView 渲染
 *
 * 三种 content 来源：
 *  1. 已读好的 content（open-file 事件/dialog/drag-drop 直接给字符串）：
 *     setContent 进 DocumentCache，再 openFile 建标签（标 ready）
 *  2. 只有 filePath（最近文件/会话恢复）：openFile 建标签（标 pending），
 *     useDocument 切换到该标签时从 DocumentCache 回源（未命中则 readFile）
 *  3. 示例文档：内联 EXAMPLE_MARKDOWN，无 filePath
 */
import { useCallback } from 'react'
import { useTabStore } from '../state'
import { setContent } from '../resources/DocumentCache'
import { readFile, addRecentFile, setTitle } from '../ipc/client'
import { EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME } from '../data/exampleMarkdown'

/** 用 basename 作显示名（preload 的 pathBasename 在 Electron 可用） */
function basename(p: string): string {
  if (window.electronAPI?.pathBasename) return window.electronAPI.pathBasename(p) || p
  const norm = p.replace(/\\/g, '/').replace(/\/$/, '')
  const i = norm.lastIndexOf('/')
  return i === -1 ? norm : norm.slice(i + 1) || norm
}

export function useDocumentActions() {
  /**
   * 打开已读好的文档（content 已在手）。
   * content 进 DocumentCache，建标签标 ready。
   */
  const openDocumentWithContent = useCallback(
    (content: string, name: string, filePath?: string, size?: number, lastModified?: number) => {
      // 先建标签拿 tabId，再把 content 存进 DocumentCache（key=tabId）
      const tabId = useTabStore.getState().openFile(name, filePath || '', size, lastModified)
      if (tabId) {
        setContent(tabId, content, filePath)
        useTabStore.getState().setContentStatus(tabId, 'ready')
      }
      if (filePath) {
        void addRecentFile({ name, filePath })
      }
      return tabId
    },
    []
  )

  /**
   * 按 filePath 打开文档（content 未读，按需回源）。
   * 建标签标 pending，useDocument 切换时回源。
   */
  const openDocumentByPath = useCallback(async (filePath: string): Promise<string | null> => {
    const name = basename(filePath)
    // 先尝试读 content（与旧 handleFileOpen 一致：立即读，失败则建 pending 标签）
    const result = await readFile(filePath)
    if (!result.success || result.content === undefined) {
      // 读失败：仍建标签但标 error，让 UI 提示
      const tabId = useTabStore.getState().openFile(name, filePath)
      if (tabId) useTabStore.getState().setContentStatus(tabId, 'error', result.error)
      return tabId
    }
    return openDocumentWithContent(result.content, name, filePath)
  }, [openDocumentWithContent])

  /** 打开示例文档（内联 content，无 filePath） */
  const openExample = useCallback(() => {
    openDocumentWithContent(EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME)
  }, [openDocumentWithContent])

  /** 打开文件对话框 */
  const openFileDialog = useCallback(async (): Promise<string | null> => {
    if (!window.electronAPI?.openFileDialog) return null
    const result = await window.electronAPI.openFileDialog()
    if (!result || !result.filePath) return null
    // dialog 已读好 content
    return openDocumentWithContent(
      result.content,
      basename(result.filePath),
      result.filePath
    )
  }, [openDocumentWithContent])

  /** 处理主进程 open-file 事件（filePath，需回源读） */
  const handleOpenFileEvent = useCallback((filePath: string) => {
    void openDocumentByPath(filePath)
  }, [openDocumentByPath])

  /** 更新窗口标题（激活标签变化时调） */
  const syncWindowTitle = useCallback((name: string) => {
    void setTitle(name)
  }, [])

  return {
    openDocumentWithContent,
    openDocumentByPath,
    openExample,
    openFileDialog,
    handleOpenFileEvent,
    syncWindowTitle,
  }
}
