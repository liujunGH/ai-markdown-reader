import { useState, useEffect, useRef, useMemo } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer, MarkdownRendererRef } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'
import { Outline } from './components/Outline'
import { SearchBox } from './components/SearchBox'
import { ProgressBar } from './components/ProgressBar'
import { StatusBar } from './components/StatusBar'
import { RecentFilesPage } from './components/RecentFilesPage'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import FirstUseGuide from './components/FirstUseGuide'
import QuickSwitcher from './components/QuickSwitcher'
import { SidebarFileExplorer } from './components/SidebarFileExplorer'
import { ElectronFolderExplorer } from './components/ElectronFolderExplorer'
import { FileInfoPanel } from './components/FileInfoPanel'
import { FilePreviewPanel } from './components/FilePreviewPanel'
import { BookmarkPanel, useBookmarks } from './components/Bookmark'
import { useOutline } from './hooks/useOutline'
import { useScrollSpy } from './hooks/useScrollSpy'
import { useSearch } from './hooks/useSearch'
import { TabBar } from './components/TabBar'
import { Tab, createTab, getWelcomeTab } from './types/Tab'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

interface FolderFile {
  name: string
  filePath: string
  size?: number
  lastModified?: number
  isDirectory?: boolean
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    electronAPI?: {
      openFileDialog: () => Promise<{ filePath: string; content: string } | null>
      openFolderDialog: () => Promise<string | null>
      readFolder: (folderPath: string) => Promise<{ success: boolean; files?: FolderFile[]; error?: string }>
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
      getFileInfo: (filePath: string) => Promise<{ success: boolean; info?: { name: string; size: number; lastModified: number; created: number }; error?: string }>
      showInFolder: (filePath: string) => Promise<void>
      onOpenFile: (callback: (filePath: string) => void) => void
      onFileChanged: (callback: (filePath: string) => void) => void
      watchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
      unwatchFile: (filePath: string) => Promise<void>
      getRecentFiles: () => Promise<RecentFile[]>
      addRecentFile: (file: { name: string; filePath: string }) => Promise<void>
      removeRecentFile: (filePath: string) => Promise<void>
      clearRecentFiles: () => Promise<void>
      getLastFolder: () => Promise<string | null>
      setLastFolder: (folderPath: string) => Promise<void>
      getMaxRecentFiles: () => Promise<number>
      setMaxRecentFiles: (max: number) => Promise<void>
    }
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle>
    getFile(): Promise<File>
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>
    queryPermission(options?: { mode?: string }): Promise<PermissionState>
    requestPermission(options?: { mode?: string }): Promise<PermissionState>
  }
}

const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'
const SESSION_TABS_KEY = 'session-tabs'
const SESSION_ACTIVE_TAB_KEY = 'session-active-tab'
const MAX_TABS_KEY = 'max-tabs'
const DEFAULT_MAX_TABS = 10

interface StoredTab {
  id: string
  name: string
  content: string
  filePath?: string
}

async function getInitialTabs(): Promise<{ tabs: Tab[]; activeTabId: string }> {
  const stored = localStorage.getItem(SESSION_TABS_KEY)
  if (stored) {
    try {
      const storedTabs: StoredTab[] = JSON.parse(stored)
      const restoredTabs: Tab[] = []
      
      for (const storedTab of storedTabs) {
        if (storedTab.filePath && window.electronAPI) {
          const result = await window.electronAPI.readFile(storedTab.filePath)
          if (result.success && result.content !== undefined) {
            restoredTabs.push(createTab(storedTab.name, result.content, storedTab.filePath))
          }
        } else if (storedTab.content) {
          restoredTabs.push(createTab(storedTab.name, storedTab.content, storedTab.filePath))
        }
      }
      
      if (restoredTabs.length > 0) {
        const activeTabId = localStorage.getItem(SESSION_ACTIVE_TAB_KEY)
        const validActiveId = activeTabId && restoredTabs.some(t => t.id === activeTabId)
        return {
          tabs: restoredTabs,
          activeTabId: validActiveId ? activeTabId! : restoredTabs[0].id
        }
      }
    } catch {}
  }
  const welcomeTab = getWelcomeTab()
  return { tabs: [welcomeTab], activeTabId: welcomeTab.id }
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [showOutline, setShowOutline] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [showFileSidebar, setShowFileSidebar] = useState(false)
  const [currentFolderHandle, setCurrentFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [electronFolderPath, setElectronFolderPath] = useState<string | null>(null)
  const [currentFolderName, setCurrentFolderName] = useState<string>('')
  const [currentFilePath, setCurrentFilePath] = useState<string>('')
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [fontSize, setFontSize] = useState(16)
  const [showFileInfo, setShowFileInfo] = useState(false)
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; lastModified: number } | null>(null)
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeen = localStorage.getItem(HAS_SEEN_GUIDE_KEY)
    return !hasSeen
  })
  const [changedFilePath, setChangedFilePath] = useState<string | null>(null)
  const [maxTabs] = useState<number>(() => {
    const stored = localStorage.getItem(MAX_TABS_KEY)
    return stored ? parseInt(stored, 10) : DEFAULT_MAX_TABS
  })
  const markdownRef = useRef<MarkdownRendererRef>(null)

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0]
  }, [tabs, activeTabId])

  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(activeTab?.name || '')

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getRecentFiles().then(files => setRecentFiles(files))
    }
  }, [])

  useEffect(() => {
    getInitialTabs().then(({ tabs: restoredTabs, activeTabId: restoredActiveTabId }) => {
      setTabs(restoredTabs)
      setActiveTabId(restoredActiveTabId)
      setIsRestoringSession(false)
    })
  }, [])

  useEffect(() => {
    if (tabs.length === 1 && tabs[0].name === '欢迎使用.md') return
    const tab = activeTab
    if (!tab || !tab.filePath) return
    if (window.electronAPI) {
      window.electronAPI.addRecentFile({ name: tab.name, filePath: tab.filePath })
      window.electronAPI.getRecentFiles().then(files => setRecentFiles(files))
    }
  }, [activeTab])

  useEffect(() => {
    if (isRestoringSession || tabs.length === 0) return
    const tabsToSave: StoredTab[] = tabs.map(t => ({
      id: t.id,
      name: t.name,
      content: t.content,
      filePath: t.filePath
    }))
    localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(tabsToSave))
    if (activeTabId) {
      localStorage.setItem(SESSION_ACTIVE_TAB_KEY, activeTabId)
    }
  }, [tabs, activeTabId, isRestoringSession])

  useEffect(() => {
    if (!window.electronAPI || isRestoringSession) return
    tabs.forEach(tab => {
      if (tab.filePath) {
        window.electronAPI!.watchFile(tab.filePath)
      }
    })
  }, [tabs, isRestoringSession])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onFileChanged(async (filePath: string) => {
      setChangedFilePath(filePath)
    })
  }, [])

  const handleReloadChangedFile = async () => {
    if (!changedFilePath || !window.electronAPI) return
    const result = await window.electronAPI.readFile(changedFilePath)
    if (result.success && result.content !== undefined) {
      const name = changedFilePath.split('/').pop() || '未知文件.md'
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.filePath === changedFilePath
          ? { ...tab, content: result.content!, name }
          : tab
      ))
    }
    setChangedFilePath(null)
  }

  useEffect(() => {
    if (tabs.length === 1 && tabs[0].name === '欢迎使用.md') return
    const tab = activeTab
    if (!tab || !tab.filePath) return
    if (window.electronAPI) {
      window.electronAPI.addRecentFile({ name: tab.name, filePath: tab.filePath })
      window.electronAPI.getRecentFiles().then(files => setRecentFiles(files))
    }
  }, [activeTab])

  const outlineItems = useOutline(activeTab?.content || '')
  const outlineIds = outlineItems.map(item => item.id)
  const activeHeadingId = useScrollSpy(outlineIds)
  const currentHeading = useMemo(() => {
    const activeItem = outlineItems.find(item => item.id === activeHeadingId)
    return activeItem?.text || ''
  }, [outlineItems, activeHeadingId])
  const {
    query,
    setQuery,
    isRegex,
    setIsRegex,
    matches,
    currentMatch,
    nextMatch,
    prevMatch,
    clearSearch
  } = useSearch(activeTab?.content || '')

  const handleNewTab = () => {
    if (tabs.length >= maxTabs) return
    const welcomeTab = getWelcomeTab()
    setTabs(prev => [...prev, welcomeTab])
    setActiveTabId(welcomeTab.id)
  }

  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId)
  }

  const handleTabClose = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    if (tabIndex === -1) return
    
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
  }

  const handleTabCloseOthers = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    setTabs([tab])
    setActiveTabId(tabId)
  }

  const handleTabCloseAll = () => {
    const welcomeTab = getWelcomeTab()
    setTabs([welcomeTab])
    setActiveTabId(welcomeTab.id)
  }

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    const newTabs = [...tabs]
    const [movedTab] = newTabs.splice(fromIndex, 1)
    newTabs.splice(toIndex, 0, movedTab)
    setTabs(newTabs)
    if (activeTabId === movedTab.id) {
      setActiveTabId(movedTab.id)
    }
  }

  const handleFileOpen = (fileContent: string, name: string, filePath: string = '') => {
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
      const oldestNonActive = tabsToAdd.find(t => t.id !== activeTabId)
      if (oldestNonActive) {
        tabsToAdd = tabsToAdd.filter(t => t.id !== oldestNonActive.id)
      } else {
        break
      }
    }

    const newTab = createTab(name, fileContent, filePath)
    tabsToAdd.push(newTab)
    setTabs(tabsToAdd)
    setActiveTabId(newTab.id)
    
    if (window.electronAPI && filePath) {
      window.electronAPI.addRecentFile({ name, filePath })
      window.electronAPI.getRecentFiles().then(files => setRecentFiles(files))
    }
    
    setFileInfo({
      name,
      size: new Blob([fileContent]).size,
      lastModified: Date.now()
    })
  }

  const handleRecentSelect = async (file: RecentFile) => {
    const existingTab = tabs.find(t => t.filePath === file.filePath && !t.isModified)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      setShowRecent(false)
      return
    }
    
    if (window.electronAPI) {
      const result = await window.electronAPI.readFile(file.filePath)
      if (result.success && result.content) {
        let tabsToUse = [...tabs]
        while (tabsToUse.length >= maxTabs) {
          const oldestNonActive = tabsToUse.find(t => t.id !== activeTabId)
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
    setShowRecent(false)
  }

  const handleRemoveRecent = async (filePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.removeRecentFile(filePath)
      const files = await window.electronAPI.getRecentFiles()
      setRecentFiles(files)
    }
  }

  const handleClearRecent = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearRecentFiles()
      setRecentFiles([])
    }
  }

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return
    try {
      const folderPath = await window.electronAPI.openFolderDialog()
      if (!folderPath) return
      
      const result = await window.electronAPI.readFolder(folderPath)
      if (!result.success || !result.files || result.files.length === 0) return
      
      const firstFile = result.files[0]
      const fileResult = await window.electronAPI.readFile(firstFile.filePath)
      if (fileResult.success && fileResult.content) {
        handleFileOpen(fileResult.content, firstFile.name, firstFile.filePath)
        setCurrentFolderName(folderPath.split('/').pop() || folderPath)
        setElectronFolderPath(folderPath)
        await window.electronAPI.setLastFolder(folderPath)
        setShowFileSidebar(true)
      }
    } catch (err) {
      console.error('Failed to open folder:', err)
    }
  }

  const handleFolderFileSelect = (fileContent: string, fileName: string, filePath: string) => {
    handleFileOpen(fileContent, fileName, filePath)
    setCurrentFilePath(filePath)
  }

  const handleCloseFileSidebar = () => {
    setShowFileSidebar(false)
    setCurrentFolderHandle(null)
    setElectronFolderPath(null)
    setCurrentFolderName('')
    setCurrentFilePath('')
  }

  const handleOutlineClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleBookmarkNavigate = (heading: string) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    for (const h of headings) {
      if (h.textContent === heading || h.textContent?.startsWith(heading)) {
        h.scrollIntoView({ behavior: 'smooth' })
        break
      }
    }
  }

  const handleCloseSearch = () => {
    clearSearch()
    setShowSearch(false)
  }

  useEffect(() => {
    if (!window.electronAPI) return
    
    window.electronAPI.onOpenFile(async (filePath: string) => {
      console.log('[App] Received open-file:', filePath)
      try {
        const result = await window.electronAPI!.readFile(filePath)
        if (result.success && result.content !== undefined) {
          const name = filePath.split('/').pop() || '未知文件.md'
          handleFileOpen(result.content, name, filePath)
        }
      } catch (err) {
        console.error('[App] Failed to open file:', err)
      }
    })
  }, [handleFileOpen])

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        return
      }

      if (window.electronAPI && (file as any).path) {
        const result = await window.electronAPI.readFile((file as any).path)
        if (result.success && result.content !== undefined) {
          handleFileOpen(result.content, file.name, (file as any).path)
        }
      } else {
        const fileContent = await file.text()
        handleFileOpen(fileContent, file.name, '')
      }
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  useEffect(() => {
    if (showFocusMode) {
      document.body.classList.add('focus-mode')
    } else {
      document.body.classList.remove('focus-mode')
    }
    return () => document.body.classList.remove('focus-mode')
  }, [showFocusMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        handleNewTab()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) handleTabClose(activeTabId)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        if (currentIndex !== -1) {
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length
          setActiveTabId(tabs[nextIndex].id)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setFontSize(prev => Math.min(prev + 2, 32))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setFontSize(prev => Math.max(prev - 2, 12))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        setShowSource(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        window.print()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        setShowQuickSwitcher(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setShowFocusMode(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      if (e.key === 'F1') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
      if (e.key === 'Escape') {
        if (showSearch) {
          handleCloseSearch()
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false)
        } else if (showFocusMode) {
          setShowFocusMode(false)
        } else if (showQuickSwitcher) {
          setShowQuickSwitcher(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, tabs, showSearch, showKeyboardShortcuts, showFocusMode, showQuickSwitcher])

  return (
    <ThemeProvider>
      <ProgressBar />
      {!showFocusMode && (
        <>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onTabCloseOthers={handleTabCloseOthers}
            onTabCloseAll={handleTabCloseAll}
            onNewTab={handleNewTab}
            onTabReorder={handleTabReorder}
          />
          <header style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <FileOpener onFileOpen={handleFileOpen} />
            <button 
              onClick={() => setShowRecent(!showRecent)}
              data-guide="recent-files"
              style={{
                background: showRecent ? 'var(--accent)' : 'transparent',
                color: showRecent ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="最近打开 (Ctrl+Shift+R)"
            >
              📜
            </button>
            <button 
              onClick={handleOpenFolder}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="打开文件夹"
            >
              📂
            </button>
            {(currentFolderHandle || electronFolderPath) && (
              <button 
                onClick={() => setShowFileSidebar(!showFileSidebar)}
                style={{
                  background: showFileSidebar ? 'var(--accent)' : 'transparent',
                  color: showFileSidebar ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                data-tooltip="文件列表"
              >
                📋
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeTab?.name}>
              {activeTab?.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={() => {
                if (!showOutline) {
                  setShowOutline(true)
                  setShowFilePreview(false)
                } else if (showFilePreview) {
                  setShowFilePreview(false)
                } else {
                  setShowFilePreview(true)
                }
              }}
              data-guide="outline"
              style={{
                background: showOutline ? (showFilePreview ? 'var(--accent)' : 'var(--accent)') : 'transparent',
                color: showOutline ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip={showFilePreview ? '显示目录' : '文件预览'}
            >
              {showFilePreview ? '📋' : '📑'}
            </button>
            <button 
              onClick={() => setShowSearch(true)}
              data-guide="search"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="搜索 (Ctrl+F)"
            >
              🔍
            </button>
            <button 
              onClick={() => setShowSource(!showSource)}
              data-guide="source"
              style={{
                background: showSource ? 'var(--accent)' : 'transparent',
                color: showSource ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="源码 (Ctrl+S)"
            >
              📄
            </button>
            <button 
              onClick={() => setShowFocusMode(!showFocusMode)}
              data-guide="focus-mode"
              style={{
                background: showFocusMode ? 'var(--accent)' : 'transparent',
                color: showFocusMode ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="专注模式 (Ctrl+.)"
            >
              👁️
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} data-guide="font-size">
              <button 
                onClick={() => setFontSize(prev => Math.max(prev - 2, 12))}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
                data-tooltip="缩小"
              >
                A-
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'center' }}>
                {fontSize}
              </span>
              <button 
                onClick={() => setFontSize(prev => Math.min(prev + 2, 32))}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
                data-tooltip="放大"
              >
                A+
              </button>
            </div>
            <button 
              onClick={() => setShowKeyboardShortcuts(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="快捷键 (Ctrl+/)"
            >
              ⌨️
            </button>
            <button 
              onClick={() => setShowFileInfo(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="文件信息"
            >
              ℹ️
            </button>
            <BookmarkPanel
              bookmarks={bookmarks}
              onAdd={addBookmark}
              onRemove={removeBookmark}
              onNavigate={handleBookmarkNavigate}
              currentHeading={currentHeading}
            />
            <ThemeToggle />
          </div>
        </header>
        </>
      )}
      <div className="app">
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {!showFocusMode && showFileSidebar && electronFolderPath && (
            <div style={{ position: 'sticky', top: 81, height: 'calc(100vh - 81px - 32px)', alignSelf: 'flex-start', flexShrink: 0 }}>
              <ElectronFolderExplorer
                folderPath={electronFolderPath}
                folderName={currentFolderName}
                currentFilePath={currentFilePath}
                onFileSelect={handleFolderFileSelect}
                onClose={handleCloseFileSidebar}
              />
            </div>
          )}
          {!showFocusMode && showFileSidebar && currentFolderHandle && !electronFolderPath && (
            <div style={{ position: 'sticky', top: 81, height: 'calc(100vh - 81px - 32px)', alignSelf: 'flex-start', flexShrink: 0 }}>
              <SidebarFileExplorer
                folderName={currentFolderName}
                handle={currentFolderHandle}
                currentFilePath={currentFilePath}
                onFileSelect={handleFolderFileSelect}
                onClose={handleCloseFileSidebar}
              />
            </div>
          )}
          <main style={{ 
            flex: 1, 
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            fontSize: `${fontSize}px`
          }}>
            {showSource ? (
              <pre style={{ 
                padding: '20px', 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}>
                {activeTab?.content}
              </pre>
            ) : (
              <MarkdownRenderer 
                ref={markdownRef}
                content={activeTab?.content || ''}
                searchQuery={query}
                searchRegex={isRegex}
                currentMatch={currentMatch}
                matchCount={matches.length}
              />
            )}
          </main>
          {!showFocusMode && showOutline && !showSource && (
            <div style={{ position: 'sticky', top: 81, height: 'calc(100vh - 81px - 32px)', alignSelf: 'flex-start', flexShrink: 0 }}>
              {showFilePreview ? (
                <FilePreviewPanel
                  fileName={activeTab?.name || ''}
                  filePath={activeTab?.filePath || ''}
                  fileSize={activeTab?.content ? new Blob([activeTab.content]).size : 0}
                  lastModified={fileInfo?.lastModified}
                  outlineItems={outlineItems}
                  bookmarks={bookmarks}
                  onNavigate={handleOutlineClick}
                  onBookmarkNavigate={handleBookmarkNavigate}
                />
              ) : (
                <Outline items={outlineItems} activeId={activeHeadingId} onItemClick={handleOutlineClick} />
              )}
            </div>
          )}
        </div>
        <StatusBar content={activeTab?.content || ''} />
        {showRecent && (
          <RecentFilesPage
            files={recentFiles}
            onSelect={handleRecentSelect}
            onRemove={handleRemoveRecent}
            onClearAll={handleClearRecent}
            onClose={() => setShowRecent(false)}
            onOpenFolder={handleOpenFolder}
          />
        )}
        {showSearch && (
          <SearchBox 
            query={query}
            isRegex={isRegex}
            matches={matches.length}
            currentMatch={currentMatch}
            onQueryChange={setQuery}
            onRegexChange={setIsRegex}
            onNext={nextMatch}
            onPrev={prevMatch}
            onClose={handleCloseSearch}
          />
        )}
        {showKeyboardShortcuts && (
          <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
        )}
        {showGuide && !isRestoringSession && tabs.length === 1 && tabs[0].name === '欢迎使用.md' && (
          <FirstUseGuide 
            onComplete={() => {
              localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true')
              setShowGuide(false)
            }}
            onSkip={() => {
              localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true')
              setShowGuide(false)
            }}
          />
        )}
        {showQuickSwitcher && (
          <QuickSwitcher
            recentFiles={recentFiles}
            onFileSelect={(content, name, filePath) => {
              handleFileOpen(content, name, filePath)
              setShowQuickSwitcher(false)
            }}
            onRemoveRecent={handleRemoveRecent}
            onClearRecent={handleClearRecent}
            onClose={() => setShowQuickSwitcher(false)}
          />
        )}
        {showFileInfo && (
          <FileInfoPanel
            fileInfo={fileInfo}
            onClose={() => setShowFileInfo(false)}
          />
        )}
        {changedFilePath && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2d2d2d',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '14px',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '2px' }}>文件已在外被修改</div>
              <div style={{ opacity: 0.7, fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={changedFilePath}>
                {changedFilePath.split('/').pop()}
              </div>
            </div>
            <button
              onClick={handleReloadChangedFile}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px'
              }}
            >
              重新加载
            </button>
            <button
              onClick={() => setChangedFilePath(null)}
              style={{
                background: 'transparent',
                color: '#999',
                border: '1px solid #555',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              忽略
            </button>
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
