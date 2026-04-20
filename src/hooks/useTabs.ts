import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Tab, TabColor, createTab, getWelcomeTab } from '../types/Tab'
import { RecentFile } from '../types/electron'
import { getStorageItem, setStorageItem } from '../utils/storage'

interface StoredTab {
  id: string
  name: string
  content: string
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

async function getInitialTabs(): Promise<{ tabs: Tab[]; activeTabId: string; failedRestores: string[] }> {
  const stored = getStorageItem(SESSION_TABS_KEY)
  const failedRestores: string[] = []
  if (stored) {
    try {
      const storedTabs: StoredTab[] = JSON.parse(stored)
      const restoredTabs: Tab[] = []

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
            continue
          }
        } else if (storedTab.content) {
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
        const activeTabId = getStorageItem(SESSION_ACTIVE_TAB_KEY)
        const validActiveId = activeTabId && restoredTabs.some(t => t.id === activeTabId)
        return {
          tabs: restoredTabs,
          activeTabId: validActiveId ? activeTabId! : restoredTabs[0].id,
          failedRestores
        }
      }
    } catch {}
  }
  const welcomeTab = getWelcomeTab()
  return { tabs: [welcomeTab], activeTabId: welcomeTab.id, failedRestores }
}

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
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [failedRestores, setFailedRestores] = useState<string[]>([])
  const [closedTabs, setClosedTabs] = useState<Tab[]>([])
  const maxTabs = useMemo(() => {
    const stored = getStorageItem(MAX_TABS_KEY)
    return stored ? parseInt(stored, 10) : DEFAULT_MAX_TABS
  }, [])
  const prevActiveTabIdRef = useRef<string>('')

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0]
  }, [tabs, activeTabId])

  // 会话恢复
  useEffect(() => {
    getInitialTabs().then(({ tabs: restoredTabs, activeTabId: restoredActiveTabId, failedRestores: failed }) => {
      setTabs(restoredTabs)
      setActiveTabId(restoredActiveTabId)
      setFailedRestores(failed)
      setIsRestoringSession(false)
    })
  }, [])

  // 保存标签页会话
  useEffect(() => {
    if (isRestoringSession || tabs.length === 0) return
    const tabsToSave: StoredTab[] = tabs.map(t => ({
      id: t.id,
      name: t.name,
      content: t.content,
      filePath: t.filePath,
      isPinned: t.isPinned,
      size: t.size,
      lastModified: t.lastModified,
      color: t.color
    }))
    setStorageItem(SESSION_TABS_KEY, JSON.stringify(tabsToSave))
    if (activeTabId) {
      setStorageItem(SESSION_ACTIVE_TAB_KEY, activeTabId)
    }
  }, [tabs, activeTabId, isRestoringSession])

  // 向主进程注册当前窗口打开的文件列表（用于多窗口文件聚焦）
  useEffect(() => {
    if (isRestoringSession || !window.electronAPI) return
    const filePaths = tabs.map(t => t.filePath).filter((fp): fp is string => !!fp)
    window.electronAPI.registerWindowFiles(filePaths)
  }, [tabs, isRestoringSession])

  // 阅读滚动位置记忆
  useEffect(() => {
    if (isRestoringSession) {
      prevActiveTabIdRef.current = activeTabId
      return
    }

    const main = document.querySelector('main')
    const prevId = prevActiveTabIdRef.current

    // 保存旧标签的滚动位置
    if (prevId && prevId !== activeTabId) {
      const prevTab = tabs.find(t => t.id === prevId)
      if (prevTab && main) {
        const scrollKey = `scroll-position-${prevTab.filePath || prevId}` as const
        setStorageItem(scrollKey, String(main.scrollTop))
      }
    }

    // 恢复新标签的滚动位置
    const newTab = tabs.find(t => t.id === activeTabId)
    if (newTab && main) {
      const scrollKey = `scroll-position-${newTab.filePath || activeTabId}` as const
      const saved = getStorageItem(scrollKey)
      if (saved != null) {
        setTimeout(() => {
          if (main) main.scrollTop = parseInt(saved, 10)
        }, 100)
      } else {
        main.scrollTop = 0
      }
    }

    prevActiveTabIdRef.current = activeTabId
  }, [activeTabId, tabs, isRestoringSession])

  // 自动添加到最近文件
  useEffect(() => {
    if (tabs.length === 1 && tabs[0].name === '欢迎使用.md') return
    const tab = activeTab
    if (!tab || !tab.filePath) return
    if (window.electronAPI) {
      window.electronAPI.addRecentFile({ name: tab.name, filePath: tab.filePath })
    }
  }, [activeTab])

  const handleNewTab = useCallback(() => {
    if (tabs.length >= maxTabs) return
    const welcomeTab = getWelcomeTab()
    setTabs(prev => [...prev, welcomeTab])
    setActiveTabId(welcomeTab.id)
  }, [tabs.length, maxTabs])

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const handleTabClose = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    if (tabIndex === -1) return

    const tabToClose = tabs[tabIndex]
    if (tabToClose) {
      setClosedTabs(prev => [tabToClose, ...prev].slice(0, MAX_CLOSED_TABS))
    }

    const newTabs = tabs.filter(t => t.id !== tabId)
    if (newTabs.length === 0) {
      const welcomeTab = getWelcomeTab()
      setTabs([welcomeTab])
      setActiveTabId(welcomeTab.id)
    } else {
      setTabs(newTabs)
      if (activeTabId === tabId) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1)
        setActiveTabId(newTabs[newIndex].id)
      }
    }
  }, [tabs, activeTabId])

  const handleTabCloseOthers = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    const tabsToClose = tabs.filter(t => t.id !== tabId)
    setClosedTabs(prev => [...tabsToClose, ...prev].slice(0, MAX_CLOSED_TABS))
    setTabs([tab])
    setActiveTabId(tabId)
  }, [tabs])

  const handleTabCloseAll = useCallback(() => {
    const tabsToClose = tabs.filter(t => t.name !== '欢迎使用.md')
    setClosedTabs(prev => [...tabsToClose, ...prev].slice(0, MAX_CLOSED_TABS))
    const welcomeTab = getWelcomeTab()
    setTabs([welcomeTab])
    setActiveTabId(welcomeTab.id)
  }, [tabs])

  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newTabs = [...tabs]
    const [movedTab] = newTabs.splice(fromIndex, 1)
    newTabs.splice(toIndex, 0, movedTab)
    // Ensure pinned tabs stay at the front
    const pinned = newTabs.filter(t => t.isPinned)
    const unpinned = newTabs.filter(t => !t.isPinned)
    setTabs([...pinned, ...unpinned])
    if (activeTabId === movedTab.id) {
      setActiveTabId(movedTab.id)
    }
  }, [tabs, activeTabId])

  const handleTabPin = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId)
      if (!tab || tab.isPinned) return prev
      const newTabs = prev.map(t => t.id === tabId ? { ...t, isPinned: true } : t)
      const pinned = newTabs.filter(t => t.isPinned)
      const unpinned = newTabs.filter(t => !t.isPinned)
      return [...pinned, ...unpinned]
    })
  }, [])

  const handleTabUnpin = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId)
      if (!tab || !tab.isPinned) return prev
      const newTabs = prev.map(t => t.id === tabId ? { ...t, isPinned: false } : t)
      const pinned = newTabs.filter(t => t.isPinned)
      const unpinned = newTabs.filter(t => !t.isPinned)
      return [...pinned, ...unpinned]
    })
  }, [])

  const handleTabColor = useCallback((tabId: string, color: TabColor) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, color } : tab
    ))
  }, [])

  const handleRestoreTab = useCallback(() => {
    setClosedTabs(prev => {
      if (prev.length === 0) return prev
      const [tabToRestore, ...rest] = prev

      // 检查是否已存在同名同路径的标签
      const exists = tabs.find(t =>
        t.name === tabToRestore.name && t.filePath === tabToRestore.filePath
      )
      if (exists) {
        setActiveTabId(exists.id)
        return rest
      }

      // 如果标签数已达上限，先移除最旧的非固定标签
      let newTabs = [...tabs]
      while (newTabs.length >= maxTabs) {
        const oldestNonActive = newTabs.find(t => t.id !== activeTabId && !t.isPinned)
        if (oldestNonActive) {
          newTabs = newTabs.filter(t => t.id !== oldestNonActive.id)
        } else {
          break
        }
      }

      newTabs.push(tabToRestore)
      setTabs(newTabs)
      setActiveTabId(tabToRestore.id)

      return rest
    })
  }, [tabs, activeTabId, maxTabs])

  const handleFileOpen = useCallback((fileContent: string, name: string, filePath: string = '', size?: number, lastModified?: number) => {
    const existingTab = tabs.find(t =>
      t.name === name &&
      !t.isModified &&
      (!filePath || t.filePath === filePath)
    )
    if (existingTab) {
      setActiveTabId(existingTab.id)
      return
    }

    let tabsToAdd = [...tabs]
    while (tabsToAdd.length >= maxTabs) {
      const oldestNonActive = tabsToAdd.find(t => t.id !== activeTabId && !t.isPinned)
      if (oldestNonActive) {
        tabsToAdd = tabsToAdd.filter(t => t.id !== oldestNonActive.id)
      } else {
        break
      }
    }

    const newTab = createTab(name, fileContent, filePath, undefined, size, lastModified)
    tabsToAdd.push(newTab)
    setTabs(tabsToAdd)
    setActiveTabId(newTab.id)

    if (window.electronAPI && filePath) {
      window.electronAPI.addRecentFile({ name, filePath })
    }
  }, [tabs, activeTabId, maxTabs])

  const handleRecentSelect = useCallback(async (file: RecentFile) => {
    const existingTab = tabs.find(t => t.filePath === file.filePath && !t.isModified)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      return
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.readFile(file.filePath)
      if (result.success && result.content) {
        let tabsToUse = [...tabs]
        while (tabsToUse.length >= maxTabs) {
          const oldestNonActive = tabsToUse.find(t => t.id !== activeTabId && !t.isPinned)
          if (oldestNonActive) {
            tabsToUse = tabsToUse.filter(t => t.id !== oldestNonActive.id)
          } else {
            break
          }
        }
        const newTab = createTab(file.name, result.content, file.filePath)
        tabsToUse.push(newTab)
        setTabs(tabsToUse)
        setActiveTabId(newTab.id)
      }
    }
  }, [tabs, activeTabId, maxTabs])

  const updateTabContent = useCallback((filePath: string, content: string, name?: string) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.filePath === filePath
        ? { ...tab, content, ...(name && { name }), size: new Blob([content]).size }
        : tab
    ))
  }, [])

  return {
    tabs,
    activeTabId,
    isRestoringSession,
    activeTab,
    failedRestores,
    closedTabsCount: closedTabs.length,
    handleNewTab,
    handleTabSelect,
    handleTabClose,
    handleTabCloseOthers,
    handleTabCloseAll,
    handleTabReorder,
    handleTabPin,
    handleTabUnpin,
    handleTabColor,
    handleFileOpen,
    handleRecentSelect,
    handleRestoreTab,
    updateTabContent,
  }
}
