import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'

import { Tab, TabColor, TabContentStatus, createTab, getWelcomeTab } from '../types/Tab'
import { RecentFile } from '../types/electron'
import { getStorageItem, setStorageItem } from '../utils/storage'

interface StoredTab {
  id: string
  name: string
  content?: string
  filePath?: string
  isPinned?: boolean
  size?: number
  lastModified?: number
  color?: TabColor
}

const SESSION_TABS_KEY = 'session-tabs'
const SESSION_ACTIVE_TAB_KEY = 'session-active-tab'
const MAX_TABS_KEY = 'max-tabs'
const DEFAULT_MAX_TABS = 10
const MAX_CLOSED_TABS = 10

interface TabState {
  tabs: Tab[]
  activeTabId: string
  isRestoringSession: boolean
  failedRestores: string[]
  closedTabs: Tab[]
  maxTabs: number
}

interface TabActions {
  activeTab: () => Tab | undefined
  newTab: () => void
  selectTab: (id: string) => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  pinTab: (id: string) => void
  unpinTab: (id: string) => void
  setTabColor: (id: string, color: TabColor) => void
  restoreTab: () => void
  openFile: (content: string, name: string, filePath?: string, size?: number, lastModified?: number) => void
  openRecentFile: (file: RecentFile) => Promise<boolean>
  updateTabContent: (filePath: string, content: string, name?: string) => void
  loadTabContent: (id: string) => Promise<boolean>
  restoreSession: () => Promise<void>
  clearFailedRestores: () => void
}

export type TabStore = TabState & TabActions

function getMaxTabs(): number {
  const stored = getStorageItem(MAX_TABS_KEY)
  return stored ? parseInt(stored, 10) : DEFAULT_MAX_TABS
}

function createRestoredTab(
  storedTab: StoredTab,
  content: string,
  contentStatus: TabContentStatus = 'ready',
  contentError?: string
): Tab {
  const tab = createTab(
    storedTab.name,
    content,
    storedTab.filePath,
    undefined,
    storedTab.size,
    storedTab.lastModified,
    storedTab.color
  )
  tab.id = storedTab.id || tab.id
  tab.isPinned = storedTab.isPinned
  tab.contentStatus = contentStatus
  tab.contentError = contentError
  return tab
}

function persistSessionSnapshot(tabs: Tab[], activeTabId: string): void {
  const storedTabs: StoredTab[] = tabs.map(tab => ({
    id: tab.id,
    name: tab.name,
    content: tab.filePath ? undefined : tab.content,
    filePath: tab.filePath,
    isPinned: tab.isPinned,
    size: tab.size,
    lastModified: tab.lastModified,
    color: tab.color,
  }))

  setStorageItem(SESSION_TABS_KEY, JSON.stringify(storedTabs))
  setStorageItem(SESSION_ACTIVE_TAB_KEY, activeTabId)
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: '',
      isRestoringSession: false,
      failedRestores: [],
      closedTabs: [],
      maxTabs: getMaxTabs(),

      activeTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId) || tabs[0]
      },

      newTab: () => {
        set(produce(state => {
          if (state.tabs.length >= state.maxTabs) return
          const welcomeTab = getWelcomeTab()
          state.tabs.push(welcomeTab)
          state.activeTabId = welcomeTab.id
        }))
      },

      selectTab: (id) => {
        set({ activeTabId: id })
        void get().loadTabContent(id)
      },

      closeTab: (id) => {
        set(produce(state => {
          const tabIndex = state.tabs.findIndex((t: Tab) => t.id === id)
          if (tabIndex === -1) return
          const tabToClose = state.tabs[tabIndex]
          if (tabToClose) {
            // Strip large content from closed tab to free memory
            const lightweightTab = {
              ...tabToClose,
              content: '',
              contentStatus: tabToClose.filePath ? 'pending' as TabContentStatus : tabToClose.contentStatus,
              contentError: undefined,
            }
            state.closedTabs = [lightweightTab, ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
          }
          state.tabs = state.tabs.filter((t: Tab) => t.id !== id)
          if (state.tabs.length === 0) {
            const welcomeTab = getWelcomeTab()
            state.activeTabId = welcomeTab.id
            state.tabs = [welcomeTab]
          } else if (state.activeTabId === id) {
            const newIndex = Math.min(tabIndex, state.tabs.length - 1)
            state.activeTabId = state.tabs[newIndex].id
          }
        }))
      },

      closeOtherTabs: (id) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (!tab) return
          const tabsToClose = state.tabs
            .filter((t: Tab) => t.id !== id)
            .map((t: Tab) => ({
              ...t,
              content: '',
              contentStatus: t.filePath ? 'pending' as TabContentStatus : t.contentStatus,
              contentError: undefined,
            }))
          state.closedTabs = [...tabsToClose, ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
          state.activeTabId = id
          state.tabs = [tab]
        }))
      },

      closeAllTabs: () => {
        set(produce(state => {
          const tabsToClose = state.tabs
            .filter((t: Tab) => t.name !== '欢迎使用.md')
            .map((t: Tab) => ({
              ...t,
              content: '',
              contentStatus: t.filePath ? 'pending' as TabContentStatus : t.contentStatus,
              contentError: undefined,
            }))
          state.closedTabs = [...tabsToClose, ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
          const welcomeTab = getWelcomeTab()
          state.activeTabId = welcomeTab.id
          state.tabs = [welcomeTab]
        }))
      },

      reorderTabs: (fromIndex, toIndex) => {
        set(produce(state => {
          const newTabs = [...state.tabs]
          const [movedTab] = newTabs.splice(fromIndex, 1)
          newTabs.splice(toIndex, 0, movedTab)
          const pinned = newTabs.filter((t: Tab) => t.isPinned)
          const unpinned = newTabs.filter((t: Tab) => !t.isPinned)
          state.tabs = [...pinned, ...unpinned]
        }))
      },

      pinTab: (id) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (!tab || tab.isPinned) return
          const newTabs = state.tabs.map((t: Tab) => t.id === id ? { ...t, isPinned: true } : t)
          const pinned = newTabs.filter((t: Tab) => t.isPinned)
          const unpinned = newTabs.filter((t: Tab) => !t.isPinned)
          state.tabs = [...pinned, ...unpinned]
        }))
      },

      unpinTab: (id) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (!tab || !tab.isPinned) return
          const newTabs = state.tabs.map((t: Tab) => t.id === id ? { ...t, isPinned: false } : t)
          const pinned = newTabs.filter((t: Tab) => t.isPinned)
          const unpinned = newTabs.filter((t: Tab) => !t.isPinned)
          state.tabs = [...pinned, ...unpinned]
        }))
      },

      setTabColor: (id, color) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (tab) tab.color = color
        }))
      },

      restoreTab: () => {
        let restoredId = ''
        set(produce(state => {
          if (state.closedTabs.length === 0) return
          const [tabToRestore, ...rest] = state.closedTabs
          state.closedTabs = rest

          const exists = state.tabs.find((t: Tab) =>
            t.name === tabToRestore.name && t.filePath === tabToRestore.filePath
          )
          if (exists) {
            state.activeTabId = exists.id
            return
          }

          while (state.tabs.length >= state.maxTabs) {
            const oldestNonActive = state.tabs.find((t: Tab) => t.id !== state.activeTabId && !t.isPinned)
            if (oldestNonActive) {
              state.tabs = state.tabs.filter((t: Tab) => t.id !== oldestNonActive.id)
            } else {
              break
            }
          }

          if (tabToRestore.filePath && !tabToRestore.content) {
            tabToRestore.contentStatus = 'pending'
            tabToRestore.contentError = undefined
          }
          state.tabs.push(tabToRestore)
          state.activeTabId = tabToRestore.id
          restoredId = tabToRestore.id
        }))
        if (restoredId) void get().loadTabContent(restoredId)
      },

      openFile: (content, name, filePath = '', size, lastModified) => {
        set(produce(state => {
          const existingTab = state.tabs.find((t: Tab) =>
            t.name === name &&
            !t.isModified &&
            (!filePath || t.filePath === filePath)
          )
          if (existingTab) {
            existingTab.content = content
            existingTab.size = size ?? new Blob([content]).size
            existingTab.lastModified = lastModified ?? existingTab.lastModified
            existingTab.contentStatus = 'ready'
            existingTab.contentError = undefined
            state.activeTabId = existingTab.id
            return
          }

          while (state.tabs.length >= state.maxTabs) {
            const oldestNonActive = state.tabs.find((t: Tab) => t.id !== state.activeTabId && !t.isPinned)
            if (oldestNonActive) {
              state.tabs = state.tabs.filter((t: Tab) => t.id !== oldestNonActive.id)
            } else {
              break
            }
          }

          const newTab = createTab(name, content, filePath, undefined, size, lastModified)
          state.tabs.push(newTab)
          state.activeTabId = newTab.id
        }))

        if (window.electronAPI && filePath) {
          window.electronAPI.addRecentFile({ name, filePath })
        }
      },

      openRecentFile: async (file) => {
        if (!window.electronAPI) return false
        const result = await window.electronAPI.readFile(file.filePath)
        if (result.success && result.content !== undefined) {
          const content = result.content
          set(produce(state => {
            const existingTab = state.tabs.find((t: Tab) => t.filePath === file.filePath && !t.isModified)
            if (existingTab) {
              existingTab.content = content
              existingTab.name = file.name
              existingTab.size = new Blob([content]).size
              existingTab.contentStatus = 'ready'
              existingTab.contentError = undefined
              state.activeTabId = existingTab.id
              return
            }

            while (state.tabs.length >= state.maxTabs) {
              const oldestNonActive = state.tabs.find((t: Tab) => t.id !== state.activeTabId && !t.isPinned)
              if (oldestNonActive) {
                state.tabs = state.tabs.filter((t: Tab) => t.id !== oldestNonActive.id)
              } else {
                break
              }
            }

            const newTab = createTab(file.name, content, file.filePath)
            state.tabs.push(newTab)
            state.activeTabId = newTab.id
          }))
          return true
        }
        await window.electronAPI.removeRecentFile?.(file.filePath)
        return false
      },

      updateTabContent: (filePath, content, name) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.filePath === filePath)
          if (tab) {
            tab.content = content
            if (name) tab.name = name
            tab.size = new Blob([content]).size
            tab.contentStatus = 'ready'
            tab.contentError = undefined
          }
        }))
      },

      loadTabContent: async (id) => {
        const currentTab = get().tabs.find(t => t.id === id)
        if (!currentTab?.filePath || !window.electronAPI) return false
        const filePath = currentTab.filePath
        if (currentTab.content && currentTab.contentStatus !== 'error') return true
        if (currentTab.contentStatus === 'loading') return false

        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (!tab) return
          tab.contentStatus = 'loading'
          tab.contentError = undefined
        }))

        let result: Awaited<ReturnType<NonNullable<typeof window.electronAPI>['readFile']>>
        try {
          result = await window.electronAPI.readFile(filePath)
        } catch (err) {
          result = {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }
        }
        if (result.success && result.content !== undefined) {
          set(produce(state => {
            const tab = state.tabs.find((t: Tab) => t.id === id)
            if (!tab) return
            tab.content = result.content || ''
            tab.size = new Blob([tab.content]).size
            tab.contentStatus = 'ready'
            tab.contentError = undefined
          }))
          return true
        }

        const error = result.error || '文件读取失败'
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.id === id)
          if (tab) {
            tab.contentStatus = 'error'
            tab.contentError = error
          }
          if (!state.failedRestores.includes(filePath)) {
            state.failedRestores.push(filePath)
          }
        }))
        await window.electronAPI.removeRecentFile?.(filePath)
        return false
      },

      restoreSession: async () => {
        set({ isRestoringSession: true })
        const failedRestores: string[] = []
        let restoredTabs: Tab[] = []
        let restoredActiveTabId = ''

        // Try old format first for backward compatibility
        const oldStored = getStorageItem(SESSION_TABS_KEY)
        const oldActiveId = getStorageItem(SESSION_ACTIVE_TAB_KEY)

        if (oldStored) {
          try {
            const storedTabs: StoredTab[] = JSON.parse(oldStored)
            for (const storedTab of storedTabs) {
              if (storedTab.filePath) {
                restoredTabs.push(createRestoredTab(storedTab, '', 'pending'))
              } else if (storedTab.content !== undefined) {
                restoredTabs.push(createRestoredTab(storedTab, storedTab.content))
              }
            }
            if (restoredTabs.length > 0) {
              const validActiveId = oldActiveId && restoredTabs.some(t => t.id === oldActiveId)
              restoredActiveTabId = validActiveId ? oldActiveId : restoredTabs[0].id
            }
          } catch {
            // Ignore parse errors
          }
        }

        if (restoredTabs.length === 0) {
          const welcomeTab = getWelcomeTab()
          restoredTabs = [welcomeTab]
          restoredActiveTabId = welcomeTab.id
        }

        set({
          tabs: restoredTabs,
          activeTabId: restoredActiveTabId,
          isRestoringSession: false,
          failedRestores,
        })

        persistSessionSnapshot(restoredTabs, restoredActiveTabId)
        await get().loadTabContent(restoredActiveTabId)
      },

      clearFailedRestores: () => {
        set({ failedRestores: [] })
      },
    }),
    {
      name: 'tab-store',
      skipHydration: true,
      partialize: (state) => ({
        tabs: state.tabs.map(t => ({
          ...t,
          content: t.filePath ? '' : t.content,
        })),
        activeTabId: state.activeTabId,
      }),
    }
  )
)

// Subscribe to tab changes for side effects
useTabStore.subscribe((state, prevState) => {
  if (state.isRestoringSession) return

  // Register window files when tabs change
  if (state.tabs !== prevState.tabs) {
    persistSessionSnapshot(state.tabs, state.activeTabId)

    const filePaths = state.tabs.map(t => t.filePath).filter((fp): fp is string => !!fp)
    if (window.electronAPI) {
      window.electronAPI.registerWindowFiles(filePaths)
    }
  }

  if (state.activeTabId !== prevState.activeTabId) {
    persistSessionSnapshot(state.tabs, state.activeTabId)
  }

  // Auto-add to recent files when active tab changes
  if (state.activeTabId !== prevState.activeTabId) {
    const tab = state.activeTab()
    if (tab?.filePath && window.electronAPI) {
      if (!(state.tabs.length === 1 && state.tabs[0].name === '欢迎使用.md')) {
        window.electronAPI.addRecentFile?.({ name: tab.name, filePath: tab.filePath })
      }
    }
  }
})
