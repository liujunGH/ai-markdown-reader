/**
 * ReaderCommandPalette v2 —— 命令面板容器（复用现有 CommandPalette）
 *
 * CommandPalette 是纯展示（内置 DEFAULT_COMMANDS + onExecute 分发）。
 * v2 提供 onExecute：把命令 id 映射到 store action / useDocumentActions。
 */
import { useCallback } from 'react'
import { useUIStore, useTabStore } from '../../state'
import { useDocumentActions } from '../../app/useDocumentActions'
import CommandPalette from '../../components/CommandPalette'

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
        case 'toggle-recent':
        case 'global-search':
        case 'quick-jump':
        case 'reading-tools':
        case 'reading-timeline':
        case 'show-shortcuts':
        case 'file-info':
        case 'export-html':
          // 这些命令映射到对应面板开关
          togglePanel(mapCommandToPanel(commandId))
          break
        case 'zoom-in':
          setFontSize(Math.min(32, fontSize + 1))
          break
        case 'zoom-out':
          setFontSize(Math.max(12, fontSize - 1))
          break
        case 'toggle-split':
          togglePanel('fileSidebar') // 占位：split 待接
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
    'toggle-recent': 'recent',
    'global-search': 'globalSearch',
    'quick-jump': 'quickJump',
    'reading-tools': 'readingTools',
    'reading-timeline': 'readingTimeline',
    'show-shortcuts': 'keyboardShortcuts',
    'file-info': 'fileInfo',
    'export-html': 'exportPanel',
  }
  return (map[commandId] || commandId) as any
}
