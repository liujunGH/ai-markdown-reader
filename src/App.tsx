import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import styles from './styles/app.module.css'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer, MarkdownRendererRef } from './components/MarkdownRenderer'
import { ReadingStatsPanel } from './components/ReadingStatsPanel'
import { CustomStylePanel } from './components/CustomStylePanel'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'

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
import { ResizableSidebar } from './components/ResizableSidebar'
import { BookmarkPanel, useBookmarks } from './components/Bookmark'
import { ExportPanel } from './components/ExportPanel'
import { useOutline } from './hooks/useOutline'
import { useScrollSpy } from './hooks/useScrollSpy'
import { useSearch } from './hooks/useSearch'
import { useFileSettings } from './hooks/useFileSettings'
import { TabBar } from './components/TabBar'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useScrollHistory } from './hooks/useScrollHistory'
import { useReadingStats } from './hooks/useReadingStats'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { basename, dirname, join } from './utils/path'
import { RecentFile } from './types/electron'
import { getStorageItem, setStorageItem, getSessionItem, setSessionItem } from './utils/storage'
import { ErrorBoundary } from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { Skeleton } from './components/Skeleton'
import { GlobalSearch } from './components/GlobalSearch'
import { UpdateNotification } from './components/UpdateNotification'
import { indexFolder, getAllMarkdownFiles } from './utils/searchIndex'
import { useUIStore, useTabStore, useFileStore, useToastStore } from './stores'

const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'
const SEARCH_HISTORY_KEY = 'search-history'

function AppInner() {
  const { theme, accentColor, toggleTheme, customCSS, setCustomCSS } = useTheme()

  // ── Stores ──
  const {
    showOutline, showSearch, showSource, showRecent, showKeyboardShortcuts,
    showFocusMode, showQuickSwitcher, showFileSidebar, showFileInfo, showFilePreview,
    showExportPanel, showCommandPalette, showGlobalSearch, showQuickJump,
    showReadingStats, showCustomStyle, showDiagnostics, fontSize, isSplitView, secondaryTabId,
    highlightedLine, togglePanel, openPanel, closePanel, setFontSize, setSplitView,
    setHighlightedLine, setShowSource, setShowOutline
  } = useUIStore()

  const {
    tabs, activeTabId, isRestoringSession, activeTab: getActiveTab, failedRestores,
    newTab, selectTab, closeTab, closeOtherTabs, closeAllTabs, reorderTabs,
    pinTab, unpinTab, setTabColor, openFile, openRecentFile, updateTabContent,
    clearFailedRestores
  } = useTabStore()

  const activeTab = getActiveTab()

  const {
    currentFolderPath, currentFolderName, currentFilePath, currentFolderHandle, fileInfo,
    setFolder, setCurrentFilePath, setFileInfo, clearFolder
  } = useFileStore()

  const { toasts, showToast } = useToastStore()

  // ── Local state ──
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

  // ── Hooks ──
  const scrollHistory = useScrollHistory()
  const markdownRef = useRef<MarkdownRendererRef>(null)
  const mainRef = useRef<HTMLElement>(null)

  const { totalStats } = useReadingStats(activeTab?.filePath)
  const { settings: fileSettings, updateSetting: updateFileSetting } = useFileSettings(activeTab?.filePath)
  const { recentFiles, loadRecentFiles, removeRecentFile, clearRecentFiles } = useRecentFiles()

  // ── Effects ──

  // Restore session on mount
  useEffect(() => {
    useTabStore.getState().restoreSession()
  }, [])

  // Sync file settings to global UI state
  useEffect(() => {
    if (isRestoringSession) return
    setFontSize(fileSettings.fontSize)
    setShowSource(fileSettings.showSource)
    setShowOutline(fileSettings.showOutline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.filePath, isRestoringSession])

  // Split view fallback when secondary tab is closed
  useEffect(() => {
    if (!isSplitView || !secondaryTabId) return
    if (!tabs.some(t => t.id === secondaryTabId)) {
      const fallback = tabs.find(t => t.id !== activeTabId)
      if (fallback) {
        setSplitView(true, fallback.id)
      } else {
        setSplitView(false, null)
      }
    }
  }, [tabs, activeTabId, isSplitView, secondaryTabId, setSplitView])

  // Watch files when tabs change
  const { changedFilePath, handleReloadChangedFile, watchFiles, ignoreChange } = useFileWatcher(
    (filePath, content, name) => {
      updateTabContent(filePath, content, name)
    }
  )

  useEffect(() => {
    if (!isRestoringSession) {
      watchFiles(tabs)
    }
  }, [tabs, isRestoringSession, watchFiles])

  // Drag and drop
  const { isDraggingOver } = useDragAndDrop(
    (content, name, filePath) => {
      openFile(content, name, filePath)
      loadRecentFiles()
    },
    showToast
  )

  // Set window title
  useEffect(() => {
    if (window.electronAPI && activeTab) {
      window.electronAPI.setTitle(activeTab.name)
    }
  }, [activeTab])

  // Show failed restore toast (auto-clear after first notification)
  useEffect(() => {
    if (!isRestoringSession && failedRestores.length > 0) {
      const names = failedRestores.map(basename).join('、')
      showToast(`以下文件已被移动或删除：${names}`, 'error')
      clearFailedRestores()
    }
  }, [isRestoringSession, failedRestores, showToast, clearFailedRestores])

  // File open handler
  const handleFileOpen = useCallback((fileContent: string, name: string, filePath: string = '', size?: number, lastModified?: number) => {
    openFile(fileContent, name, filePath, size, lastModified)
    loadRecentFiles()
    setFileInfo({
      name,
      size: size ?? new Blob([fileContent]).size,
      lastModified: lastModified ?? Date.now()
    })
  }, [openFile, loadRecentFiles, setFileInfo])

  // Recent file select handler
  const handleRecentSelect = useCallback(async (file: RecentFile) => {
    await openRecentFile(file)
    loadRecentFiles()
    closePanel('recent')
  }, [openRecentFile, loadRecentFiles, closePanel])

  // Open folder
  const handleOpenFolder = useCallback(async () => {
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

      const firstFile = result.files.find(f => !f.isDirectory)
      if (!firstFile) {
        showToast('该目录中没有 Markdown 文件', 'error')
        return
      }
      const fileResult = await window.electronAPI.readFile(firstFile.filePath)
      if (fileResult.success && fileResult.content) {
        handleFileOpen(fileResult.content, firstFile.name, firstFile.filePath)
        setFolder(folderPath, basename(folderPath) || folderPath)
        await window.electronAPI.setLastFolder(folderPath)
        openPanel('fileSidebar')
        try {
          const allFiles = await getAllMarkdownFiles(folderPath)
          await indexFolder(folderPath, allFiles)
        } catch (err) {
          console.error('Failed to index folder:', err)
        }
      } else {
        showToast(fileResult.error || '读取文件失败', 'error')
      }
    } catch (err) {
      console.error('[handleOpenFolder] error:', err)
      showToast('打开文件夹失败: ' + String(err), 'error')
    }
  }, [handleFileOpen, setFolder, openPanel, showToast])

  // Folder file select
  const handleFolderFileSelect = useCallback((fileContent: string, fileName: string, filePath: string) => {
    handleFileOpen(fileContent, fileName, filePath)
    setCurrentFilePath(filePath)
  }, [handleFileOpen, setCurrentFilePath])

  // Close file sidebar
  const handleCloseFileSidebar = useCallback(() => {
    closePanel('fileSidebar')
    clearFolder()
  }, [closePanel, clearFolder])

  // Global search open file
  const handleGlobalSearchOpenFile = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.readFile(filePath)
    if (result.success && result.content !== undefined) {
      const name = basename(filePath) || '未知文件.md'
      handleFileOpen(result.content, name, filePath)
      setCurrentFilePath(filePath)
    }
  }, [handleFileOpen, setCurrentFilePath])

  // Outline click
  const handleOutlineClick = useCallback((id: string) => {
    const main = document.querySelector('main')
    if (main) {
      scrollHistory.push(main.scrollTop)
    }
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [scrollHistory])

  // Wiki link click
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

  // Toggle split view
  const toggleSplitView = useCallback(() => {
    if (isSplitView) {
      setSplitView(false, null)
      return
    }
    const currentIndex = tabs.findIndex(t => t.id === activeTabId)
    const secondary = tabs[currentIndex + 1] || tabs[currentIndex - 1]
    if (secondary && secondary.id !== activeTabId) {
      setSplitView(true, secondary.id)
    } else if (tabs[0] && tabs[0].id !== activeTabId) {
      setSplitView(true, tabs[0].id)
    } else {
      setSplitView(true, null)
    }
  }, [isSplitView, tabs, activeTabId, setSplitView])

  // Bookmark navigate
  const handleBookmarkNavigate = useCallback((heading: string) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    for (const h of headings) {
      if (h.textContent === heading || h.textContent?.startsWith(heading)) {
        h.scrollIntoView({ behavior: 'smooth' })
        break
      }
    }
  }, [])

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
    closePanel('search')
  }, [clearSearch, closePanel])

  const handleSearchQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [setQuery])

  const addSearchHistory = useCallback((q: string) => {
    if (!q.trim()) return
    setSearchHistory(prev => {
      const next = [q, ...prev.filter(h => h !== q)].slice(0, 5)
      setSessionItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Electron file open listener
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

  // Electron folder open listener
  const handleOpenFolderRef = useRef(handleOpenFolder)
  handleOpenFolderRef.current = handleOpenFolder

  useEffect(() => {
    if (!window.electronAPI) return
    const listener = async (folderPath: string) => {
      try {
        const result = await window.electronAPI!.readFolder(folderPath)
        if (!result.success || !result.files || result.files.length === 0) {
          if (!result.success) {
            showToast(result.error || '读取文件夹失败', 'error')
          }
          return
        }
        const firstFile = result.files.find(f => !f.isDirectory)
        if (!firstFile) {
          showToast('该目录中没有 Markdown 文件', 'error')
          return
        }
        const fileResult = await window.electronAPI!.readFile(firstFile.filePath)
        if (fileResult.success && fileResult.content) {
          handleFileOpenRef.current(fileResult.content, firstFile.name, firstFile.filePath)
          setFolder(folderPath, basename(folderPath) || folderPath)
          await window.electronAPI!.setLastFolder(folderPath)
          openPanel('fileSidebar')
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
    window.electronAPI.onOpenFolder(listener)
    return () => {
      window.electronAPI!.offOpenFolder(listener)
    }
  }, [showToast, setFolder, openPanel])

  // Focus mode body class
  useEffect(() => {
    if (showFocusMode) {
      document.body.classList.add('focus-mode')
    } else {
      document.body.classList.remove('focus-mode')
    }
    return () => document.body.classList.remove('focus-mode')
  }, [showFocusMode])

  // Reset highlighted line on tab/source change
  useEffect(() => {
    setHighlightedLine(undefined)
  }, [activeTabId, showSource, setHighlightedLine])

  // Scroll position memory
  const prevActiveTabIdRef = useRef<string>('')
  useEffect(() => {
    if (isRestoringSession) {
      prevActiveTabIdRef.current = activeTabId
      return
    }

    const main = document.querySelector('main')
    const prevId = prevActiveTabIdRef.current

    // Save old tab scroll position
    if (prevId && prevId !== activeTabId) {
      const prevTab = tabs.find(t => t.id === prevId)
      if (prevTab && main) {
        const scrollKey = `scroll-position-${prevTab.filePath || prevId}` as const
        setStorageItem(scrollKey, String(main.scrollTop))
      }
    }

    // Restore new tab scroll position
    const newTab = tabs.find(t => t.id === activeTabId)
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null
    if (newTab && main) {
      const scrollKey = `scroll-position-${newTab.filePath || activeTabId}` as const
      const saved = getStorageItem(scrollKey)
      if (saved != null) {
        scrollTimeout = setTimeout(() => {
          if (main) main.scrollTop = parseInt(saved, 10)
        }, 100)
      } else {
        main.scrollTop = 0
      }
    }

    prevActiveTabIdRef.current = activeTabId
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [activeTabId, tabs, isRestoringSession])

  // Keyboard shortcuts
  useKeyboardShortcuts(
    scrollHistory,
    handleCloseSearch,
    updateFileSetting as (key: string, value: unknown) => void
  )

  return (
    <>
      <UpdateNotification />
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
      <ErrorBoundary>
        <div className={styles.app}>
          {tabs.length > 0 && !showFocusMode && (
            <>
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabSelect={selectTab}
                onTabClose={closeTab}
                onTabCloseOthers={closeOtherTabs}
                onTabCloseAll={closeAllTabs}
                onNewTab={newTab}
                onTabReorder={reorderTabs}
                onTabPin={pinTab}
                onTabUnpin={unpinTab}
                onTabColor={setTabColor}
              />
              <header className={styles.header}>
              <div className={styles.toolbar}>
                <FileOpener onFileOpen={handleFileOpen} onError={showToast} />
                <button
                  onClick={() => togglePanel('recent')}
                  data-guide="recent-files"
                  className={`${styles.toolbarBtn} ${showRecent ? styles.toolbarBtnActive : ''}`}
                  aria-label="最近打开" data-tooltip="最近打开 (Ctrl+Shift+R)"
                >
                  📜
                </button>
                <button
                  onClick={toggleSplitView}
                  className={`${styles.toolbarBtn} ${isSplitView ? styles.toolbarBtnActive : ''}`}
                  aria-label="分屏阅读" data-tooltip="分屏阅读 (Ctrl+\\)"
                >
                  ⚡
                </button>
                <button
                  onClick={handleOpenFolder}
                  className={styles.toolbarBtn}
                  aria-label="打开文件夹" data-tooltip="打开文件夹"
                >
                  📂
                </button>
                {(currentFolderHandle || currentFolderPath) && (
                  <button
                    onClick={() => togglePanel('fileSidebar')}
                    className={`${styles.toolbarBtn} ${showFileSidebar ? styles.toolbarBtnActive : ''}`}
                    aria-label="文件列表" data-tooltip="文件列表"
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
                      openPanel('outline')
                      closePanel('filePreview')
                    } else if (showFilePreview) {
                      closePanel('filePreview')
                    } else {
                      openPanel('filePreview')
                    }
                  }}
                  data-guide="outline"
                  className={`${styles.toolbarBtn} ${showOutline ? styles.toolbarBtnActive : ''}`}
                  data-tooltip={showFilePreview ? '显示目录' : '文件预览'}
                >
                  {showFilePreview ? '📋' : '📑'}
                </button>
                <button
                  onClick={() => openPanel('search')}
                  data-guide="search"
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="搜索" data-tooltip="搜索 (Ctrl+F)"
                >
                  🔍
                </button>
                <button
                  onClick={() => openPanel('globalSearch')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="全局搜索" data-tooltip="全局搜索 (Ctrl+Shift+F)"
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
                  aria-label="源码" data-tooltip="源码 (Ctrl+S)"
                >
                  📄
                </button>
                <button
                  onClick={() => openPanel('exportPanel')}
                  className={styles.toolbarBtn}
                  aria-label="导出" data-tooltip="导出 (Ctrl+E)"
                >
                  📤
                </button>
                <button
                  onClick={() => togglePanel('focusMode')}
                  className={`${styles.toolbarBtn} ${showFocusMode ? styles.toolbarBtnActive : ''}`}
                  aria-label="专注模式" data-tooltip="专注模式 (Ctrl+.)"
                >
                  🎯
                </button>
                <div className={styles.fontSizeControls} data-guide="font-size">
                  <button
                    onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                    className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                    aria-label="缩小字体"
                  >
                    A-
                  </button>
                  <span className={styles.fontSizeDisplay}>
                    {fontSize}
                  </span>
                  <button
                    onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                    className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                    aria-label="放大字体"
                  >
                    A+
                  </button>
                </div>
                <button
                  onClick={() => openPanel('keyboardShortcuts')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="快捷键" data-tooltip="快捷键 (Ctrl+/)"
                >
                  ⌨️
                </button>
                <button
                  onClick={() => openPanel('fileInfo')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="文件信息" data-tooltip="文件信息"
                >
                  ℹ️
                </button>
                <button
                  onClick={() => openPanel('readingStats')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="阅读统计" data-tooltip="阅读统计"
                >
                  📊
                </button>
                <button
                  onClick={() => openPanel('diagnostics')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label="诊断面板" data-tooltip="诊断面板"
                >
                  🛠️
                </button>
                <BookmarkPanel
                  bookmarks={bookmarks}
                  onAdd={addBookmark}
                  onRemove={removeBookmark}
                  onNavigate={handleBookmarkNavigate}
                  currentHeading={currentHeading}
                />
                <ThemeToggle onOpenCustomStyle={() => openPanel('customStyle')} />
              </div>
            </header>
          </>
          )}
          <div className={styles.splitView}>
            {!showFocusMode && showFileSidebar && currentFolderPath && (
              <ResizableSidebar side="left" storageKey="file-sidebar" isOpen={showFileSidebar} onToggle={handleCloseFileSidebar}>
                <ElectronFolderExplorer
                  folderPath={currentFolderPath}
                  folderName={currentFolderName}
                  currentFilePath={currentFilePath}
                  onFileSelect={handleFolderFileSelect}
                  onClose={handleCloseFileSidebar}
                />
              </ResizableSidebar>
            )}
            {!showFocusMode && showFileSidebar && currentFolderHandle && !currentFolderPath && (
              <ResizableSidebar side="left" storageKey="file-sidebar" isOpen={showFileSidebar} onToggle={handleCloseFileSidebar}>
                <SidebarFileExplorer
                  folderName={currentFolderName}
                  handle={currentFolderHandle}
                  currentFilePath={currentFilePath}
                  onFileSelect={handleFolderFileSelect}
                  onClose={handleCloseFileSidebar}
                />
              </ResizableSidebar>
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
            {!showFocusMode && !showSource && (showFilePreview || outlineItems.length > 0) && (
              <ResizableSidebar side="right" storageKey="right-sidebar" isOpen={showOutline} onToggle={() => closePanel('outline')}>
                {showOutline && (
                  <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
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
                    {!showFilePreview && outlineItems.length > 0 && (
                      <Minimap
                        outlineItems={outlineItems}
                        activeHeadingId={activeHeadingId}
                        onNavigate={handleOutlineClick}
                        contentLength={activeTab?.content?.length || 0}
                      />
                    )}
                  </div>
                )}
              </ResizableSidebar>
            )}
          </div>
          {!showFocusMode && <StatusBar content={activeTab?.content || ''} />}
          {showRecent && (
            <RecentFilesPage
              files={recentFiles}
              onSelect={handleRecentSelect}
              onRemove={removeRecentFile}
              onClearAll={clearRecentFiles}
              onClose={() => closePanel('recent')}
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
              onTabSelect={selectTab}
              onNavigateToMatch={goToMatch}
            />
          )}
          {showKeyboardShortcuts && (
            <KeyboardShortcuts onClose={() => closePanel('keyboardShortcuts')} />
          )}
          {showExportPanel && (
            <ExportPanel
              isOpen={showExportPanel}
              onClose={() => closePanel('exportPanel')}
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
                closePanel('quickSwitcher')
              }}
              onRemoveRecent={removeRecentFile}
              onClearRecent={clearRecentFiles}
              onClose={() => closePanel('quickSwitcher')}
            />
          )}
          {showFileInfo && (
            <FileInfoPanel
              fileInfo={fileInfo}
              onClose={() => closePanel('fileInfo')}
            />
          )}
          {showGlobalSearch && (
            <GlobalSearch
              isOpen={showGlobalSearch}
              onClose={() => closePanel('globalSearch')}
              folderPath={currentFolderPath}
              onOpenFile={handleGlobalSearchOpenFile}
            />
          )}
          {showReadingStats && (
            <ReadingStatsPanel
              isOpen={showReadingStats}
              onClose={() => closePanel('readingStats')}
              stats={totalStats}
            />
          )}
          {showCustomStyle && (
            <CustomStylePanel
              isOpen={showCustomStyle}
              onClose={() => closePanel('customStyle')}
              customCSS={customCSS}
              onChange={setCustomCSS}
            />
          )}
          {showDiagnostics && (
            <DiagnosticsPanel
              isOpen={showDiagnostics}
              onClose={() => closePanel('diagnostics')}
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
          onClose={() => closePanel('quickJump')}
          content={activeTab?.content || ''}
          outlineItems={outlineItems}
          onJumpToLine={(line: number) => {
            closePanel('quickJump')
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
            closePanel('quickJump')
            handleOutlineClick(id)
          }}
          totalLines={activeTab?.content.split('\n').length || 0}
          showSource={showSource}
        />
      )}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => closePanel('commandPalette')}
        onExecute={(commandId) => {
          switch (commandId) {
            case 'open-file':
              openPanel('quickSwitcher')
              break
            case 'open-folder':
              handleOpenFolder()
              break
            case 'new-tab':
              newTab()
              break
            case 'close-tab':
              if (activeTabId) closeTab(activeTabId)
              break
            case 'toggle-source': {
              const next = !showSource
              setShowSource(next)
              if (activeTab?.filePath) updateFileSetting('showSource', next)
              break
            }
            case 'toggle-outline':
              togglePanel('outline')
              break
            case 'toggle-search':
              openPanel('search')
              break
            case 'toggle-focus':
              togglePanel('focusMode')
              break
            case 'toggle-recent':
              togglePanel('recent')
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
              openPanel('exportPanel')
              break
            case 'print':
              window.print()
              break
            case 'show-shortcuts':
              openPanel('keyboardShortcuts')
              break
            case 'toggle-theme':
              toggleTheme()
              break
            case 'reading-stats':
              openPanel('readingStats')
              break
            case 'custom-style':
              openPanel('customStyle')
              break
            case 'quick-jump':
              openPanel('quickJump')
              break
            default:
              break
          }
          closePanel('commandPalette')
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
