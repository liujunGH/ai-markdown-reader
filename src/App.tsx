import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import styles from './styles/app.module.css'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer, MarkdownRendererRef } from './components/MarkdownRenderer'
import { ReadingStatsPanel } from './components/ReadingStatsPanel'
import { CustomStylePanel } from './components/CustomStylePanel'
import QuickJump from './components/QuickJump'
import { FileOpener } from './components/FileOpener'
import { Outline } from './components/Outline'
import { Minimap } from './components/Minimap'
import { SearchBox } from './components/SearchBox'
import { ProgressBar } from './components/ProgressBar'
import { StatusBar } from './components/StatusBar'
import { SourceView } from './components/SourceView'
import { FloatingTOC } from './components/FloatingTOC'
import { RecentFilesPage } from './components/RecentFilesPage'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import FirstUseGuide from './components/FirstUseGuide'
import QuickSwitcher from './components/QuickSwitcher'
import { SidebarFileExplorer } from './components/SidebarFileExplorer'
import { ElectronFolderExplorer } from './components/ElectronFolderExplorer'
import { FileInfoPanel } from './components/FileInfoPanel'
import { FilePreviewPanel } from './components/FilePreviewPanel'
import { BookmarkPanel, useBookmarks } from './components/Bookmark'
import { ExportPanel } from './components/ExportPanel'
import { useOutline } from './hooks/useOutline'
import { useScrollSpy } from './hooks/useScrollSpy'
import { useSearch } from './hooks/useSearch'
import { useFileSettings } from './hooks/useFileSettings'
import { TabBar } from './components/TabBar'
import { useTabs } from './hooks/useTabs'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useScrollHistory } from './hooks/useScrollHistory'
import { useReadingStats } from './hooks/useReadingStats'
import { basename, dirname, join } from './utils/path'
import { RecentFile } from './types/electron'
import { getStorageItem, setStorageItem, getSessionItem, setSessionItem } from './utils/storage'
import { ErrorBoundary } from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { Skeleton } from './components/Skeleton'
import { GlobalSearch } from './components/GlobalSearch'
import { indexFolder, getAllMarkdownFiles } from './utils/searchIndex'

const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'
const SEARCH_HISTORY_KEY = 'search-history'

interface Toast {
  id: string
  message: string
  type: 'error' | 'success'
}

function AppInner() {
  const { theme, accentColor, toggleTheme, customCSS, setCustomCSS } = useTheme()
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
  const [fontSize, setFontSize] = useState(16)
  const [showFileInfo, setShowFileInfo] = useState(false)
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; lastModified: number } | null>(null)
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeen = getStorageItem(HAS_SEEN_GUIDE_KEY)
    return !hasSeen
  })
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = getSessionItem(SEARCH_HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const scrollHistory = useScrollHistory()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isSplitView, setIsSplitView] = useState(false)
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showQuickJump, setShowQuickJump] = useState(false)
  const [showReadingStats, setShowReadingStats] = useState(false)
  const [showCustomStyle, setShowCustomStyle] = useState(false)
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>(undefined)
  const markdownRef = useRef<MarkdownRendererRef>(null)

  const mainRef = useRef<HTMLElement>(null)

  const {
    tabs, activeTabId, isRestoringSession, activeTab, failedRestores,
    handleNewTab, handleTabSelect, handleTabClose,
    handleTabCloseOthers, handleTabCloseAll, handleTabReorder,
    handleTabPin, handleTabUnpin, handleTabColor,
    handleFileOpen: handleFileOpenInternal, handleRecentSelect: handleRecentSelectInternal,
    updateTabContent
  } = useTabs()

  const { totalStats } = useReadingStats(activeTab?.filePath)

  const { settings: fileSettings, updateSetting: updateFileSetting } = useFileSettings(activeTab?.filePath)

  // 同步文件设置到全局状态
  useEffect(() => {
    if (isRestoringSession) return
    setFontSize(fileSettings.fontSize)
    setShowSource(fileSettings.showSource)
    setShowOutline(fileSettings.showOutline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.filePath, isRestoringSession])

  // 分屏时如果副标签被关闭，自动切换或关闭分屏
  useEffect(() => {
    if (!isSplitView || !secondaryTabId) return
    if (!tabs.some(t => t.id === secondaryTabId)) {
      const fallback = tabs.find(t => t.id !== activeTabId)
      if (fallback) {
        setSecondaryTabId(fallback.id)
      } else {
        setIsSplitView(false)
        setSecondaryTabId(null)
      }
    }
  }, [tabs, activeTabId, isSplitView, secondaryTabId])

  const { recentFiles, loadRecentFiles, removeRecentFile, clearRecentFiles } = useRecentFiles()

  const { changedFilePath, handleReloadChangedFile, watchFiles, ignoreChange } = useFileWatcher(
    (filePath, content, name) => {
      updateTabContent(filePath, content, name)
    }
  )

  const { isDraggingOver, dragProps } = useDragAndDrop((content, name, filePath) => {
    handleFileOpenInternal(content, name, filePath)
    loadRecentFiles()
  })

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  // Watch files when tabs change
  useEffect(() => {
    if (!isRestoringSession) {
      watchFiles(tabs)
    }
  }, [tabs, isRestoringSession, watchFiles])

  // Set window title
  useEffect(() => {
    if (window.electronAPI && activeTab) {
      window.electronAPI.setTitle(activeTab.name)
    }
  }, [activeTab])

  // Show failed restore toast
  useEffect(() => {
    if (!isRestoringSession && failedRestores.length > 0) {
      const names = failedRestores.map(basename).join('、')
      showToast(`以下文件已被移动或删除：${names}`, 'error')
    }
  }, [isRestoringSession, failedRestores, showToast])

  const handleFileOpen = useCallback((fileContent: string, name: string, filePath: string = '', size?: number, lastModified?: number) => {
    handleFileOpenInternal(fileContent, name, filePath, size, lastModified)
    loadRecentFiles()
    setFileInfo({
      name,
      size: size ?? new Blob([fileContent]).size,
      lastModified: lastModified ?? Date.now()
    })
  }, [handleFileOpenInternal, loadRecentFiles])

  const handleRecentSelect = useCallback(async (file: RecentFile) => {
    await handleRecentSelectInternal(file)
    loadRecentFiles()
    setShowRecent(false)
  }, [handleRecentSelectInternal, loadRecentFiles])

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return
    try {
      const folderPath = await window.electronAPI.openFolderDialog()
      if (!folderPath) return

      const result = await window.electronAPI.readFolder(folderPath)
      if (!result.success || !result.files || result.files.length === 0) {
        if (!result.success) {
          showToast(result.error || '读取文件夹失败', 'error')
        }
        return
      }

      const firstFile = result.files[0]
      const fileResult = await window.electronAPI.readFile(firstFile.filePath)
      if (fileResult.success && fileResult.content) {
        handleFileOpen(fileResult.content, firstFile.name, firstFile.filePath)
        setCurrentFolderName(basename(folderPath) || folderPath)
        setElectronFolderPath(folderPath)
        await window.electronAPI.setLastFolder(folderPath)
        setShowFileSidebar(true)
        // Index folder for global search
        try {
          const allFiles = await getAllMarkdownFiles(folderPath)
          await indexFolder(folderPath, allFiles)
        } catch (err) {
          console.error('Failed to index folder:', err)
        }
      } else {
        showToast(fileResult.error || '读取文件失败', 'error')
      }
    } catch {
      showToast('打开文件夹失败', 'error')
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

  const handleGlobalSearchOpenFile = async (filePath: string) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.readFile(filePath)
    if (result.success && result.content !== undefined) {
      const name = basename(filePath) || '未知文件.md'
      handleFileOpen(result.content, name, filePath)
      setCurrentFilePath(filePath)
    }
  }

  const handleOutlineClick = (id: string) => {
    const main = document.querySelector('main')
    if (main) {
      scrollHistory.push(main.scrollTop)
    }
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleWikiLinkClick = useCallback(async (target: string) => {
    if (!activeTab?.filePath || !window.electronAPI) {
      showToast('WikiLink 需要文件路径支持', 'error')
      return
    }
    const dir = dirname(activeTab.filePath)
    const candidates = [
      join(dir, target),
      join(dir, target + '.md'),
      join(dir, target.replace(/\.md$/i, '') + '.md'),
    ]
    for (const filePath of candidates) {
      const result = await window.electronAPI.readFile(filePath)
      if (result.success && result.content !== undefined) {
        const name = basename(filePath) || target
        handleFileOpen(result.content, name, filePath)
        return
      }
    }
    showToast(`未找到文件: ${target}`, 'error')
  }, [activeTab?.filePath, handleFileOpen, showToast])

  const toggleSplitView = useCallback(() => {
    setIsSplitView(prev => {
      if (prev) {
        setSecondaryTabId(null)
        return false
      }
      const currentIndex = tabs.findIndex(t => t.id === activeTabId)
      const secondary = tabs[currentIndex + 1] || tabs[currentIndex - 1]
      if (secondary && secondary.id !== activeTabId) {
        setSecondaryTabId(secondary.id)
      } else if (tabs[0] && tabs[0].id !== activeTabId) {
        setSecondaryTabId(tabs[0].id)
      }
      return true
    })
  }, [tabs, activeTabId])

  const handleBookmarkNavigate = (heading: string) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    for (const h of headings) {
      if (h.textContent === heading || h.textContent?.startsWith(heading)) {
        h.scrollIntoView({ behavior: 'smooth' })
        break
      }
    }
  }

  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(activeTab?.name || '')

  const secondaryTab = useMemo(() => {
    return tabs.find(t => t.id === secondaryTabId)
  }, [tabs, secondaryTabId])

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
    goToMatch,
    clearSearch
  } = useSearch(activeTab?.content || '')

  const handleCloseSearch = useCallback(() => {
    clearSearch()
    setShowSearch(false)
  }, [clearSearch])

  const handleSearchQueryChange = (newQuery: string) => {
    setQuery(newQuery)
  }

  const addSearchHistory = (q: string) => {
    if (!q.trim()) return
    setSearchHistory(prev => {
      const next = [q, ...prev.filter(h => h !== q)].slice(0, 5)
      setSessionItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleFileOpenRef = useRef(handleFileOpen)
  handleFileOpenRef.current = handleFileOpen

  useEffect(() => {
    if (!window.electronAPI) return
    const listener = async (filePath: string) => {
      try {
        const result = await window.electronAPI!.readFile(filePath)
        if (result.success && result.content !== undefined) {
          const name = basename(filePath) || '未知文件.md'
          handleFileOpenRef.current(result.content, name, filePath)
        } else {
          showToast(result.error || '打开文件失败', 'error')
        }
      } catch {
        showToast('打开文件失败', 'error')
      }
    }
    window.electronAPI.onOpenFile(listener)
    return () => {
      window.electronAPI!.offOpenFile(listener)
    }
  }, [showToast])

  useEffect(() => {
    if (showFocusMode) {
      document.body.classList.add('focus-mode')
    } else {
      document.body.classList.remove('focus-mode')
    }
    return () => document.body.classList.remove('focus-mode')
  }, [showFocusMode])

  useEffect(() => {
    setHighlightedLine(undefined)
  }, [activeTabId, showSource])

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
          handleTabSelect(tabs[nextIndex].id)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setShowGlobalSearch(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const newSize = Math.min(fontSize + 2, 32)
        setFontSize(newSize)
        if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        const newSize = Math.max(fontSize - 2, 12)
        setFontSize(newSize)
        if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        const next = !showSource
        setShowSource(next)
        if (activeTab?.filePath) updateFileSetting('showSource', next)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportPanel(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleSplitView()
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setShowQuickJump(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setShowCommandPalette(true)
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
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        const pos = scrollHistory.back()
        if (pos !== null) {
          const main = document.querySelector('main')
          if (main) main.scrollTop = pos
        }
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        const pos = scrollHistory.forward()
        if (pos !== null) {
          const main = document.querySelector('main')
          if (main) main.scrollTop = pos
        }
      }
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false)
        } else if (showReadingStats) {
          setShowReadingStats(false)
        } else if (showCustomStyle) {
          setShowCustomStyle(false)
        } else if (showQuickJump) {
          setShowQuickJump(false)
        } else if (showGlobalSearch) {
          setShowGlobalSearch(false)
        } else if (showSearch) {
          handleCloseSearch()
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false)
        } else if (showFocusMode) {
          setShowFocusMode(false)
        } else if (showQuickSwitcher) {
          setShowQuickSwitcher(false)
        } else if (showExportPanel) {
          setShowExportPanel(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, tabs, showSearch, showKeyboardShortcuts, showFocusMode, showQuickSwitcher, showExportPanel, showCommandPalette, showQuickJump, showGlobalSearch, showReadingStats, showCustomStyle, fontSize, showSource, handleNewTab, handleTabClose, handleTabSelect, handleCloseSearch, toggleSplitView, activeTab?.filePath, updateFileSetting, scrollHistory])

  return (
    <>
      <ProgressBar containerRef={mainRef} />
      {isDraggingOver && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayContent}>
            释放以打开 Markdown 文件
          </div>
        </div>
      )}
      <div className={styles.toastContainer}>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`${styles.toastItem} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}
            style={{ top: `${16 + index * 60}px` }}
          >
            {toast.message}
          </div>
        ))}
      </div>
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
            onTabPin={handleTabPin}
            onTabUnpin={handleTabUnpin}
            onTabColor={handleTabColor}
          />
          <header className={styles.header}>
            <div className={styles.toolbar}>
              <FileOpener onFileOpen={handleFileOpen} />
              <button
                onClick={() => setShowRecent(!showRecent)}
                data-guide="recent-files"
                className={`${styles.toolbarBtn} ${showRecent ? styles.toolbarBtnActive : ''}`}
                data-tooltip="最近打开 (Ctrl+Shift+R)"
              >
                📜
              </button>
              <button
                onClick={toggleSplitView}
                className={`${styles.toolbarBtn} ${isSplitView ? styles.toolbarBtnActive : ''}`}
                data-tooltip="分屏阅读 (Ctrl+\\)"
              >
                ⚡
              </button>
              <button
                onClick={handleOpenFolder}
                className={styles.toolbarBtn}
                data-tooltip="打开文件夹"
              >
                📂
              </button>
              {(currentFolderHandle || electronFolderPath) && (
                <button
                  onClick={() => setShowFileSidebar(!showFileSidebar)}
                  className={`${styles.toolbarBtn} ${showFileSidebar ? styles.toolbarBtnActive : ''}`}
                  data-tooltip="文件列表"
                >
                  📋
                </button>
              )}
            </div>
            <div className={styles.titleWrapper}>
              <span className={styles.title} title={activeTab?.name}>
                {activeTab?.name}
              </span>
            </div>
            <div className={styles.actions}>
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
                className={`${styles.toolbarBtn} ${showOutline ? styles.toolbarBtnActive : ''}`}
                data-tooltip={showFilePreview ? '显示目录' : '文件预览'}
              >
                {showFilePreview ? '📋' : '📑'}
              </button>
              <button
                onClick={() => setShowSearch(true)}
                data-guide="search"
                className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                data-tooltip="搜索 (Ctrl+F)"
              >
                🔍
              </button>
              <button
                onClick={() => setShowGlobalSearch(true)}
                className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                data-tooltip="全局搜索 (Ctrl+Shift+F)"
              >
                🔎
              </button>
              <button
                onClick={() => {
                  const next = !showSource
                  setShowSource(next)
                  if (activeTab?.filePath) updateFileSetting('showSource', next)
                }}
                data-guide="source"
                className={`${styles.toolbarBtn} ${showSource ? styles.toolbarBtnActive : ''}`}
                data-tooltip="源码 (Ctrl+S)"
              >
                📄
              </button>
              <button
                onClick={() => setShowExportPanel(true)}
                className={styles.toolbarBtn}
                data-tooltip="导出 (Ctrl+E)"
              >
                📤
              </button>
              <button
                onClick={() => setShowFocusMode(!showFocusMode)}
                data-guide="focus-mode"
                className={`${styles.toolbarBtn} ${showFocusMode ? styles.toolbarBtnActive : ''}`}
                data-tooltip="专注模式 (Ctrl+.)"
              >
                👁️
              </button>
              <div className={styles.fontSizeControls} data-guide="font-size">
                <button
                  onClick={() => {
                    const newSize = Math.max(fontSize - 2, 12)
                    setFontSize(newSize)
                    if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
                  }}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                  data-tooltip="缩小"
                >
                  A-
                </button>
                <span className={styles.fontSizeDisplay}>
                  {fontSize}
                </span>
                <button
                  onClick={() => {
                    const newSize = Math.min(fontSize + 2, 32)
                    setFontSize(newSize)
                    if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
                  }}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                  data-tooltip="放大"
                >
                  A+
                </button>
              </div>
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                data-tooltip="快捷键 (Ctrl+/)"
              >
                ⌨️
              </button>
              <button
                onClick={() => setShowFileInfo(true)}
                className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                data-tooltip="文件信息"
              >
                ℹ️
              </button>
              <button
                onClick={() => setShowReadingStats(true)}
                className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                data-tooltip="阅读统计"
              >
                📊
              </button>
              <BookmarkPanel
                bookmarks={bookmarks}
                onAdd={addBookmark}
                onRemove={removeBookmark}
                onNavigate={handleBookmarkNavigate}
                currentHeading={currentHeading}
              />
              <ThemeToggle onOpenCustomStyle={() => setShowCustomStyle(true)} />
            </div>
          </header>
        </>
      )}
      <ErrorBoundary>
        <div className={styles.app} {...dragProps}>
          <div className={styles.splitView}>
            {!showFocusMode && showFileSidebar && electronFolderPath && (
              <div className={styles.sidebar}>
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
              <div className={styles.sidebar}>
                <SidebarFileExplorer
                  folderName={currentFolderName}
                  handle={currentFolderHandle}
                  currentFilePath={currentFilePath}
                  onFileSelect={handleFolderFileSelect}
                  onClose={handleCloseFileSidebar}
                />
              </div>
            )}
            <main ref={mainRef} className={styles.main} style={{ flex: isSplitView ? 1 : undefined, fontSize: `${fontSize}px` }}>
              {!showFocusMode && !showSource && outlineItems.length >= 3 && (
                <FloatingTOC outlineItems={outlineItems} activeHeadingId={activeHeadingId} onNavigate={handleOutlineClick} />
              )}
              {isRestoringSession ? (
                <div style={{ padding: '20px' }}>
                  <Skeleton lines={20} />
                </div>
              ) : (
                <div key={`content-${activeTabId}`} className="tab-content">
                  {showSource ? (
                    <SourceView content={activeTab?.content || ''} highlightedLine={highlightedLine} />
                  ) : (
                    <MarkdownRenderer
                      ref={markdownRef}
                      content={activeTab?.content || ''}
                      searchQuery={query}
                      searchRegex={isRegex}
                      currentMatch={currentMatch}
                      matchCount={matches.length}
                      onWikiLinkClick={handleWikiLinkClick}
                    />
                  )}
                </div>
              )}
            </main>
            {isSplitView && secondaryTab && (
              <main className={`${styles.main} ${styles.splitPane}`} style={{ fontSize: `${fontSize}px` }}>
                <div key={`secondary-${secondaryTabId}`} className="tab-content">
                  {showSource ? (
                    <SourceView content={secondaryTab.content || ''} />
                  ) : (
                    <MarkdownRenderer
                      content={secondaryTab.content || ''}
                      onWikiLinkClick={handleWikiLinkClick}
                    />
                  )}
                </div>
              </main>
            )}
            {!showFocusMode && showOutline && !showSource && (
              <div className={styles.sidebar}>
                {showFilePreview ? (
                  <FilePreviewPanel
                    fileName={activeTab?.name || ''}
                    filePath={activeTab?.filePath || ''}
                    fileSize={activeTab?.content ? new Blob([activeTab.content]).size : 0}
                    lastModified={fileInfo?.lastModified}
                    content={activeTab?.content || ''}
                    outlineItems={outlineItems}
                    bookmarks={bookmarks}
                    onNavigate={handleOutlineClick}
                    onBookmarkNavigate={handleBookmarkNavigate}
                  />
                ) : (
                  <Outline items={outlineItems} activeId={activeHeadingId} onItemClick={handleOutlineClick} filePath={activeTab?.filePath} />
                )}
              </div>
            )}
            {!showFocusMode && showOutline && !showSource && !showFilePreview && outlineItems.length > 0 && (
              <div className={styles.sidebar}>
                <Minimap
                  outlineItems={outlineItems}
                  activeHeadingId={activeHeadingId}
                  onNavigate={handleOutlineClick}
                  contentLength={activeTab?.content?.length || 0}
                />
              </div>
            )}
          </div>
          {!showFocusMode && <StatusBar content={activeTab?.content || ''} />}
          {showRecent && (
            <RecentFilesPage
              files={recentFiles}
              onSelect={handleRecentSelect}
              onRemove={removeRecentFile}
              onClearAll={clearRecentFiles}
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
              onQueryChange={handleSearchQueryChange}
              onRegexChange={setIsRegex}
              onNext={() => { addSearchHistory(query); nextMatch() }}
              onPrev={() => { addSearchHistory(query); prevMatch() }}
              onClose={handleCloseSearch}
              searchHistory={searchHistory}
              onSelectHistory={(h) => setQuery(h)}
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={handleTabSelect}
              onNavigateToMatch={goToMatch}
            />
          )}
          {showKeyboardShortcuts && (
            <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
          )}
          {showExportPanel && (
            <ExportPanel
              isOpen={showExportPanel}
              onClose={() => setShowExportPanel(false)}
              fileName={activeTab?.name || ''}
              fileContent={activeTab?.content || ''}
              theme={theme}
              accentColor={accentColor}
            />
          )}
          {showGuide && !isRestoringSession && tabs.length === 1 && tabs[0].name === '欢迎使用.md' && (
            <FirstUseGuide
              onComplete={() => {
                setStorageItem(HAS_SEEN_GUIDE_KEY, 'true')
                setShowGuide(false)
              }}
              onSkip={() => {
                setStorageItem(HAS_SEEN_GUIDE_KEY, 'true')
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
              onRemoveRecent={removeRecentFile}
              onClearRecent={clearRecentFiles}
              onClose={() => setShowQuickSwitcher(false)}
            />
          )}
          {showFileInfo && (
            <FileInfoPanel
              fileInfo={fileInfo}
              onClose={() => setShowFileInfo(false)}
            />
          )}
          {showGlobalSearch && (
            <GlobalSearch
              isOpen={showGlobalSearch}
              onClose={() => setShowGlobalSearch(false)}
              folderPath={electronFolderPath}
              onOpenFile={handleGlobalSearchOpenFile}
            />
          )}
          {showReadingStats && (
            <ReadingStatsPanel
              isOpen={showReadingStats}
              onClose={() => setShowReadingStats(false)}
              stats={totalStats}
            />
          )}
          {showCustomStyle && (
            <CustomStylePanel
              isOpen={showCustomStyle}
              onClose={() => setShowCustomStyle(false)}
              customCSS={customCSS}
              onChange={setCustomCSS}
            />
          )}
          {changedFilePath && (
            <div className={styles.fileChangeBanner}>
              <span className={styles.fileChangeBannerIcon}>📄</span>
              <div>
                <div className={styles.fileChangeBannerTitle}>文件已在外被修改</div>
                <div className={styles.fileChangeBannerPath} title={changedFilePath}>
                  {basename(changedFilePath)}
                </div>
              </div>
              <div className={styles.fileChangeBannerActions}>
                <button
                  onClick={handleReloadChangedFile}
                  className={styles.fileChangeBannerBtnPrimary}
                >
                  重新加载
                </button>
                <button
                  onClick={ignoreChange}
                  className={styles.fileChangeBannerBtnSecondary}
                >
                  忽略
                </button>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
      {showQuickJump && (
        <QuickJump
          isOpen={showQuickJump}
          onClose={() => setShowQuickJump(false)}
          content={activeTab?.content || ''}
          outlineItems={outlineItems}
          onJumpToLine={(line: number) => {
            setShowQuickJump(false)
            if (showSource) {
              setHighlightedLine(line)
            } else {
              const element = document.querySelector(`[data-line="${line}"]`)
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }
          }}
          onJumpToHeading={(id: string) => {
            setShowQuickJump(false)
            handleOutlineClick(id)
          }}
          totalLines={activeTab?.content.split('\n').length || 0}
          showSource={showSource}
        />
      )}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onExecute={(commandId) => {
          switch (commandId) {
            case 'open-file':
              setShowQuickSwitcher(true)
              break
            case 'open-folder':
              handleOpenFolder()
              break
            case 'new-tab':
              handleNewTab()
              break
            case 'close-tab':
              if (activeTabId) handleTabClose(activeTabId)
              break
            case 'toggle-source': {
              const next = !showSource
              setShowSource(next)
              if (activeTab?.filePath) updateFileSetting('showSource', next)
              break
            }
            case 'toggle-outline':
              setShowOutline(prev => !prev)
              break
            case 'toggle-search':
              setShowSearch(true)
              break
            case 'toggle-focus':
              setShowFocusMode(prev => !prev)
              break
            case 'toggle-recent':
              setShowRecent(prev => !prev)
              break
            case 'toggle-split':
              toggleSplitView()
              break
            case 'zoom-in': {
              const newSize = Math.min(fontSize + 2, 32)
              setFontSize(newSize)
              if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
              break
            }
            case 'zoom-out': {
              const newSize = Math.max(fontSize - 2, 12)
              setFontSize(newSize)
              if (activeTab?.filePath) updateFileSetting('fontSize', newSize)
              break
            }
            case 'export-html':
              setShowExportPanel(true)
              break
            case 'print':
              window.print()
              break
            case 'show-shortcuts':
              setShowKeyboardShortcuts(true)
              break
            case 'toggle-theme':
              toggleTheme()
              break
            case 'reading-stats':
              setShowReadingStats(true)
              break
            case 'custom-style':
              setShowCustomStyle(true)
              break
            case 'quick-jump':
              setShowQuickJump(true)
              break
            default:
              break
          }
          setShowCommandPalette(false)
        }}
      />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

export default App
