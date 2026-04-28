import { useTabStore } from '../stores'
import { Tab, TabColor } from '../types/Tab'
import { RecentFile } from '../types/electron'

export interface UseTabsReturn {
  tabs: Tab[]
  activeTabId: string
  isRestoringSession: boolean
  activeTab: Tab | undefined
  failedRestores: string[]
  closedTabsCount: number
  handleNewTab: () => void
  handleTabSelect: (tabId: string) => void
  handleTabClose: (tabId: string) => void
  handleTabCloseOthers: (tabId: string) => void
  handleTabCloseAll: () => void
  handleTabReorder: (fromIndex: number, toIndex: number) => void
  handleTabPin: (tabId: string) => void
  handleTabUnpin: (tabId: string) => void
  handleTabColor: (tabId: string, color: TabColor) => void
  handleFileOpen: (fileContent: string, name: string, filePath?: string, size?: number, lastModified?: number) => void
  handleRecentSelect: (file: RecentFile) => Promise<void>
  handleRestoreTab: () => void
  updateTabContent: (filePath: string, content: string, name?: string) => void
}

export function useTabs(): UseTabsReturn {
  const store = useTabStore()

  return {
    tabs: store.tabs,
    activeTabId: store.activeTabId,
    isRestoringSession: store.isRestoringSession,
    activeTab: store.activeTab(),
    failedRestores: store.failedRestores,
    closedTabsCount: store.closedTabs.length,
    handleNewTab: store.newTab,
    handleTabSelect: store.selectTab,
    handleTabClose: store.closeTab,
    handleTabCloseOthers: store.closeOtherTabs,
    handleTabCloseAll: store.closeAllTabs,
    handleTabReorder: store.reorderTabs,
    handleTabPin: store.pinTab,
    handleTabUnpin: store.unpinTab,
    handleTabColor: store.setTabColor,
    handleFileOpen: store.openFile,
    handleRecentSelect: store.openRecentFile,
    handleRestoreTab: store.restoreTab,
    updateTabContent: store.updateTabContent,
  }
}
