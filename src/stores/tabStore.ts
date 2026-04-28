import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'

import { Tab, TabColor, createTab, getWelcomeTab } from '../types/Tab'
import { RecentFile } from '../types/electron'
import { getStorageItem } from '../utils/storage'

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
  openRecentFile: (file: RecentFile) => Promise<void>
  updateTabContent: (filePath: string, content: string, name?: string) => void
  restoreSession: () => Promise<void>
  clearFailedRestores: () => void
}

export type TabStore = TabState & TabActions

function getMaxTabs(): number {
  const stored = getStorageItem(MAX_TABS_KEY)
  return stored ? parseInt(stored, 10) : DEFAULT_MAX_TABS
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: '',
      isRestoringSession: true,
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
      },

      closeTab: (id) => {
        set(produce(state => {
          const tabIndex = state.tabs.findIndex((t: Tab) => t.id === id)
          if (tabIndex === -1) return
          const tabToClose = state.tabs[tabIndex]
          if (tabToClose) {
            state.closedTabs = [tabToClose, ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
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
          const tabsToClose = state.tabs.filter((t: Tab) => t.id !== id)
          state.closedTabs = [...tabsToClose, ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
          state.activeTabId = id
          state.tabs = [tab]
        }))
      },

      closeAllTabs: () => {
        set(produce(state => {
          const tabsToClose = state.tabs.filter((t: Tab) => t.name !== '欢迎使用.md')
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

          state.tabs.push(tabToRestore)
          state.activeTabId = tabToRestore.id
        }))
      },

      openFile: (content, name, filePath = '', size, lastModified) => {
        set(produce(state => {
          const existingTab = state.tabs.find((t: Tab) =>
            t.name === name &&
            !t.isModified &&
            (!filePath || t.filePath === filePath)
          )
          if (existingTab) {
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
        if (!window.electronAPI) return
        const result = await window.electronAPI.readFile(file.filePath)
        if (result.success && result.content) {
          const content = result.content
          set(produce(state => {
            const existingTab = state.tabs.find((t: Tab) => t.filePath === file.filePath && !t.isModified)
            if (existingTab) {
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
        }
      },

      updateTabContent: (filePath, content, name) => {
        set(produce(state => {
          const tab = state.tabs.find((t: Tab) => t.filePath === filePath)
          if (tab) {
            tab.content = content
            if (name) tab.name = name
            tab.size = new Blob([content]).size
          }
        }))
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
              if (storedTab.filePath && window.electronAPI) {
                const result = await window.electronAPI.readFile(storedTab.filePath)
                if (result.success && result.content !== undefined) {
                  restoredTabs.push(createTab(
                    storedTab.name,
                    result.content,
                    storedTab.filePath,
                    undefined,
                    storedTab.size,
                    storedTab.lastModified,
                    storedTab.color
                  ))
                } else {
                  failedRestores.push(storedTab.filePath)
                }
              } else if (storedTab.content !== undefined) {
                restoredTabs.push(createTab(
                  storedTab.name,
                  storedTab.content,
                  storedTab.filePath,
                  undefined,
                  storedTab.size,
                  storedTab.lastModified,
                  storedTab.color
                ))
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
    const filePaths = state.tabs.map(t => t.filePath).filter((fp): fp is string => !!fp)
    if (window.electronAPI) {
      window.electronAPI.registerWindowFiles(filePaths)
    }
  }

  // Auto-add to recent files when active tab changes
  if (state.activeTabId !== prevState.activeTabId) {
    const tab = state.activeTab()
    if (tab?.filePath && window.electronAPI) {
      if (!(state.tabs.length === 1 && state.tabs[0].name === '欢迎使用.md')) {
        window.electronAPI.addRecentFile({ name: tab.name, filePath: tab.filePath })
      }
    }
  }
})
