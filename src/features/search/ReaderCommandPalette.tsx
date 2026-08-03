/**
 * ReaderCommandPalette v2 —— 命令面板容器（复用现有 CommandPalette）
 *
 * CommandPalette 是纯展示（内置 DEFAULT_COMMANDS + onExecute 分发）。
 * v2 提供 onExecute：把命令 id 映射到 store action / useDocumentActions。
 */
import { useCallback } from 'react'
import { useUIStore, useTabStore, useFileStore } from '../../state'
import { useDocumentActions } from '../../app/useDocumentActions'
import { createReadingDataBackup, applyReadingDataBackup } from '../../utils/readingDataBackup'
import CommandPalette from '../../components/CommandPalette'

/** 导出阅读数据备份 */
async function exportReadingDataBackup(): Promise<void> {
  const api = window.electronAPI
  if (!api) return
  const backup = createReadingDataBackup()
  const json = JSON.stringify(backup, null, 2)
  await api.saveTextFile({
    defaultPath: `reading-data-backup-${new Date().toISOString().slice(0, 10)}.json`,
    content: json,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
}

/** 导入阅读数据备份 */
async function importReadingDataBackup(): Promise<void> {
  const api = window.electronAPI
  if (!api) return
  const result = await api.openTextFile({
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (result.success && result.content) {
    applyReadingDataBackup(result.content)
  }
}

export function ReaderCommandPalette() {
  const isOpen = useUIStore((s) => s.panels.commandPalette)
  const closePanel = useUIStore((s) => s.closePanel)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const openPanel = useUIStore((s) => s.openPanel)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const fontSize = useUIStore((s) => s.fontSize)
  const newTab = useTabStore((s) => s.newTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const { openFileDialog, openExample } = useDocumentActions()

  const handleExecute = useCallback(
    (commandId: string) => {
      closePanel('commandPalette')
      switch (commandId) {
        case 'open-file':
          void openFileDialog()
          break
        case 'open-folder':
          void (async () => {
            const api = window.electronAPI
            if (api) {
              const folder = await api.openFolderDialog()
              if (folder) {
                const name = api.pathBasename(folder)
                useFileStore.getState().setFolder(folder, name)
                useUIStore.getState().openPanel('fileSidebar')
              }
            }
          })()
          break
        case 'open-example':
          openExample()
          break
        case 'new-tab':
          newTab()
          break
        case 'close-tab':
          if (activeTabId) closeTab(activeTabId)
          break
        case 'toggle-source':
        case 'toggle-outline':
        case 'toggle-search':
        case 'toggle-focus':
        case 'global-search':
        case 'quick-jump':
        case 'reading-tools':
        case 'show-shortcuts':
        case 'export-html':
          togglePanel(mapCommandToPanel(commandId))
          break
        case 'toggle-theme':
          // 主题循环切换：通过 ThemeContext 的全局事件
          window.dispatchEvent(new CustomEvent('toggle-theme'))
          break
        case 'toggle-split':
          // 分屏切换（简化：开关 splitView）
          useUIStore.setState((s) => ({ isSplitView: !s.isSplitView }))
          break
        case 'zoom-in':
          setFontSize(Math.min(32, fontSize + 1))
          break
        case 'zoom-out':
          setFontSize(Math.max(12, fontSize - 1))
          break
        case 'print':
          window.print()
          break
        case 'export-reading-backup':
          void exportReadingDataBackup()
          break
        case 'import-reading-backup':
          void importReadingDataBackup()
          break
        case 'check-update':
          void window.electronAPI?.checkForUpdates(true)
          break
        default:
          console.log('[v2] command not yet wired:', commandId)
      }
    },
    [closePanel, openFileDialog, openExample, newTab, closeTab, activeTabId, togglePanel, openPanel, setFontSize, fontSize]
  )

  return <CommandPalette isOpen={isOpen} onClose={() => closePanel('commandPalette')} onExecute={handleExecute} />
}

/** 命令 id → 面板名映射 */
function mapCommandToPanel(commandId: string): Parameters<ReturnType<typeof useUIStore.getState>['togglePanel']>[0] {
  const map: Record<string, string> = {
    'toggle-source': 'source',
    'toggle-outline': 'outline',
    'toggle-search': 'search',
    'toggle-focus': 'focusMode',
    'global-search': 'globalSearch',
    'quick-jump': 'quickJump',
    'reading-tools': 'readingTools',
    'show-shortcuts': 'keyboardShortcuts',
    'export-html': 'exportPanel',
  }
  return (map[commandId] || commandId) as any
}
