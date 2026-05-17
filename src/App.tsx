import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './styles/app.module.css'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer, MarkdownRendererRef } from './components/MarkdownRenderer'
import { VirtualMarkdown } from './components/VirtualMarkdown'


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
import { WelcomeHome } from './components/WelcomeHome'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import FirstUseGuide from './components/FirstUseGuide'
import QuickSwitcher from './components/QuickSwitcher'
import { ToolsMenu } from './components/ToolsMenu'
import { SidebarFileExplorer } from './components/SidebarFileExplorer'
import { ElectronFolderExplorer } from './components/ElectronFolderExplorer'
import { FileInfoPanel } from './components/FileInfoPanel'
import { FilePreviewPanel } from './components/FilePreviewPanel'
import { DocumentLoadState } from './components/DocumentLoadState'
import { ResizableSidebar } from './components/ResizableSidebar'
import { BookmarkPanel, useBookmarks } from './components/Bookmark'

import { useOutline } from './hooks/useOutline'
import { useScrollSpy } from './hooks/useScrollSpy'
import { useSearch } from './hooks/useSearch'
import { useFileSettings } from './hooks/useFileSettings'
import { TabBar } from './components/TabBar'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useScrollHistory } from './hooks/useScrollHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { basename, dirname, join } from './utils/path'
import { RecentFile } from './types/electron'
import { getStorageItem, setStorageItem, removeStorageItem, getSessionItem, setSessionItem } from './utils/storage'
import { ErrorBoundary } from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { Skeleton } from './components/Skeleton'

const ExportPanel = React.lazy(() => import('./components/ExportPanel').then(m => ({ default: m.ExportPanel })))
const GlobalSearch = React.lazy(() => import('./components/GlobalSearch').then(m => ({ default: m.GlobalSearch })))
const IndexDiagnosticsPanel = React.lazy(() => import('./components/IndexDiagnosticsPanel').then(m => ({ default: m.IndexDiagnosticsPanel })))
const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel').then(m => ({ default: m.WorkspacePanel })))
const ReadingTimelinePanel = React.lazy(() => import('./components/ReadingTimelinePanel').then(m => ({ default: m.ReadingTimelinePanel })))
const ReadingToolsPanel = React.lazy(() => import('./components/ReadingToolsPanel').then(m => ({ default: m.ReadingToolsPanel })))
const ReadingMediaPanel = React.lazy(() => import('./components/ReadingMediaPanel').then(m => ({ default: m.ReadingMediaPanel })))

import { UpdateNotification } from './components/UpdateNotification'
import { indexFolder, getAllMarkdownFiles, getIndexedFileCount, IndexProgress, IndexSkippedItem } from './utils/searchIndex'
import { useUIStore, useTabStore, useFileStore, useToastStore } from './stores'
import { EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME } from './data/exampleMarkdown'
import {
  getWorkspaceSession,
  getWorkspaces,
  saveWorkspace,
  saveWorkspaceSession,
  removeWorkspace,
  removeWorkspaces,
  renameWorkspace,
  toggleWorkspacePinned,
  Workspace,
} from './utils/workspaces'
import { getReadingHistory, recordReadingHistory, ReadingHistoryItem } from './utils/readingHistory'
import { clearSavedIndexDiagnostics, loadSavedIndexDiagnostics, saveIndexDiagnostics } from './utils/indexDiagnostics'
import { getEffectiveIndexPolicy, loadIndexSettings, resetIndexSettings, saveIndexSettings, type IndexSettings } from './utils/indexSettings'
import { applyReadingDataBackup, createReadingDataBackup } from './utils/readingDataBackup'
import {
  addReaderMark,
  buildAnnotationOverview,
  buildChapterProgress,
  buildChapterReadingPlan,
  buildComparisonSyncTarget,
  buildReadingStatusCard,
  buildReadingStats,
  buildReadingLandmarks,
  buildResumePoint,
  createReadingSnapshot,
  createReadingSession,
  createFocusTimer,
  exportReaderAnnotationsMarkdown,
  extractReadingMediaItems,
  getDefaultReadingPresets,
  normalizeAccessibilitySettings,
  normalizeLayoutMode,
  normalizeReadingKeyboardAction,
  toggleChapterCompletion,
  updateReaderMarkMetadata,
  updateReadLaterStatus,
  upsertReadLaterItem,
  type AnnotationOverviewItem,
  type ReaderMark,
  type ChapterCompletion,
  type ChapterReadingAction,
  type FocusTimer,
  type ReadingAccessibilitySettings,
  type ReadingSnapshot,
  type ReadLaterItem,
  type ReadLaterStatus,
  type ReadingLandmark,
  type ReadingLayoutMode,
  type ReadingPreset,
  type ReadingSession,
} from './utils/readingExperience'

const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'
const SEARCH_HISTORY_KEY = 'search-history'
const READER_MARKS_KEY = 'reader-marks'
const READER_QUEUE_KEY = 'reader-queue'
const READER_PRESET_KEY = 'reader-preset'
const READER_LAYOUT_KEY = 'reader-layout'
const READER_SESSIONS_KEY = 'reader-sessions'
const READER_CHAPTERS_KEY = 'reader-chapters'
const READER_ACCESSIBILITY_KEY = 'reader-accessibility'
const READER_FOCUS_TIMER_KEY = 'reader-focus-timer'
const READER_SNAPSHOTS_KEY = 'reader-snapshots'

function runAfterFirstPaint(task: () => void, delay = 250): void {
  globalThis.setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 2000 })
    } else {
      globalThis.setTimeout(task, 0)
    }
  }, delay)
}

function loadJsonArray<T>(key: Parameters<typeof getStorageItem>[0]): T[] {
  try {
    const stored = getStorageItem(key, '[]')
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadJsonObject<T>(key: Parameters<typeof getStorageItem>[0], fallback: T): T {
  try {
    const stored = getStorageItem(key)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback
  } catch {
    return fallback
  }
}

function wikiPathCandidates(dir: string, target: string): string[] {
  const trimmed = target.trim()
  if (!trimmed) return []
  const withoutAnchor = trimmed.split('#')[0]
  if (!withoutAnchor) return []
  const withoutExtension = withoutAnchor.replace(/\.(md|markdown)$/i, '')
  return [
    join(dir, withoutAnchor),
    join(dir, `${withoutAnchor}.md`),
    join(dir, `${withoutExtension}.md`),
    join(dir, `${withoutExtension}.markdown`),
  ]
}

function AppInner() {
  const { t } = useTranslation()
  const { theme, accentColor, toggleTheme, setTheme } = useTheme()

  // ── Stores ──
  const {
    showOutline, showSearch, showSource, showRecent, showKeyboardShortcuts,
    showFocusMode, showQuickSwitcher, showFileSidebar, showFileInfo, showFilePreview,
    showExportPanel, showCommandPalette, showGlobalSearch, showQuickJump,
    showIndexDiagnostics, showWorkspaces, showReadingTimeline, showReadingTools,
    fontSize, isSplitView, secondaryTabId,
    highlightedLine, togglePanel, openPanel, closePanel, setFontSize, setSplitView,
    setHighlightedLine, setShowSource, setShowOutline
  } = useUIStore()

  const {
    tabs, activeTabId, isRestoringSession, activeTab: getActiveTab, failedRestores,
    newTab, selectTab, closeTab, closeOtherTabs, closeAllTabs, reorderTabs,
    pinTab, unpinTab, setTabColor, openFile, openRecentFile, updateTabContent, loadTabContent,
    clearFailedRestores
  } = useTabStore()

  const activeTab = getActiveTab()

  const {
    currentFolderPath, currentFolderName, currentFilePath, currentFolderHandle, fileInfo,
    setFolder, setCurrentFilePath, setFileInfo, clearFolder
  } = useFileStore()

  const { toasts, showToast } = useToastStore()

  // ── Local state ──
  const [showGuide, setShowGuide] = useState(false)

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = getSessionItem(SEARCH_HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [indexedFileCount, setIndexedFileCount] = useState(0)
  const [workspaceIndexCounts, setWorkspaceIndexCounts] = useState<Record<string, number>>({})
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null)
  const [indexSkippedItems, setIndexSkippedItems] = useState<IndexSkippedItem[]>([])
  const [indexDiagnosticsUpdatedAt, setIndexDiagnosticsUpdatedAt] = useState<number | null>(null)
  const [indexSettings, setIndexSettings] = useState<IndexSettings>(() => loadIndexSettings())
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => getWorkspaces())
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => getReadingHistory())
  const [readerMarks, setReaderMarks] = useState<ReaderMark[]>(() => loadJsonArray<ReaderMark>(READER_MARKS_KEY))
  const [readLaterItems, setReadLaterItems] = useState<ReadLaterItem[]>(() => loadJsonArray<ReadLaterItem>(READER_QUEUE_KEY))
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>(() => loadJsonArray<ReadingSession>(READER_SESSIONS_KEY))
  const [chapterCompletions, setChapterCompletions] = useState<ChapterCompletion[]>(() => loadJsonArray<ChapterCompletion>(READER_CHAPTERS_KEY))
  const [readingSnapshots, setReadingSnapshots] = useState<ReadingSnapshot[]>(() => loadJsonArray<ReadingSnapshot>(READER_SNAPSHOTS_KEY))
  const [focusTimer, setFocusTimer] = useState<FocusTimer | null>(() => {
    const timer = loadJsonObject<FocusTimer | null>(READER_FOCUS_TIMER_KEY, null)
    return timer && timer.endsAt > Date.now() ? timer : null
  })
  const [accessibility, setAccessibility] = useState<ReadingAccessibilitySettings>(() => (
    normalizeAccessibilitySettings(loadJsonObject<Partial<ReadingAccessibilitySettings>>(READER_ACCESSIBILITY_KEY, {}))
  ))
  const [selectedReaderText, setSelectedReaderText] = useState('')
  const [currentReadingLine, setCurrentReadingLine] = useState(1)
  const [currentReadingProgress, setCurrentReadingProgress] = useState(0)
  const [showReadingMediaPanel, setShowReadingMediaPanel] = useState(false)
  const [activeReadingMediaId, setActiveReadingMediaId] = useState<string | null>(null)
  const [activeSessionMinutes, setActiveSessionMinutes] = useState(0)
  const [activeReaderPresetId, setActiveReaderPresetId] = useState<ReadingPreset['id']>(() => {
    const stored = getStorageItem(READER_PRESET_KEY)
    return stored === 'longform' || stored === 'code-doc' || stored === 'paper' ? stored : 'default'
  })
  const [readingLayoutMode, setReadingLayoutMode] = useState<ReadingLayoutMode>(() => normalizeLayoutMode(getStorageItem(READER_LAYOUT_KEY)))
  const indexAbortControllerRef = useRef<AbortController | null>(null)
  const readingSessionRef = useRef<{ filePath: string; fileName: string; startedAt: number; progressStart: number; wordsStart: number } | null>(null)
  const readingProgressRef = useRef(0)

  const exportReadingDataBackup = useCallback(async () => {
    if (!window.electronAPI?.saveTextFile) {
      showToast('当前环境不支持备份导出', 'error')
      return
    }
    const backup = createReadingDataBackup()
    const stamp = new Date().toISOString().slice(0, 10)
    const result = await window.electronAPI.saveTextFile({
      defaultPath: `ai-markdown-reader-backup-${stamp}.json`,
      content: JSON.stringify(backup, null, 2),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.success) {
      showToast(`阅读数据备份已导出：${basename(result.filePath || '') || 'backup.json'}`)
    } else if (!result.cancelled) {
      showToast(result.error || '阅读数据备份导出失败', 'error')
    }
  }, [showToast])

  const importReadingDataBackup = useCallback(async () => {
    if (!window.electronAPI?.openTextFile) {
      showToast('当前环境不支持备份导入', 'error')
      return
    }
    const result = await window.electronAPI.openTextFile({
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!result.success || result.content === undefined) {
      if (!result.cancelled) {
        showToast(result.error || '阅读数据备份导入失败', 'error')
      }
      return
    }
    const imported = applyReadingDataBackup(result.content)
    if (!imported.success) {
      showToast(imported.error || '阅读数据备份导入失败', 'error')
      return
    }
    showToast(`已导入 ${imported.imported} 项阅读数据${imported.skipped ? `，跳过 ${imported.skipped} 项` : ''}`)
  }, [showToast])

  const saveSourceEdit = useCallback(async (content: string) => {
    if (!activeTab?.filePath) {
      showToast('当前标签没有可写入的 Markdown 文件', 'error')
      return
    }
    const result = await window.electronAPI?.updateMarkdownFile(activeTab.filePath, content)
    if (!result?.success) {
      showToast(result?.error || '源码保存失败', 'error')
      throw new Error(result?.error || '源码保存失败')
    }
    updateTabContent(activeTab.filePath, content, activeTab.name)
    showToast('源码已保存')
  }, [activeTab?.filePath, activeTab?.name, showToast, updateTabContent])

  // ── Hooks ──
  const scrollHistory = useScrollHistory()
  const markdownRef = useRef<MarkdownRendererRef>(null)
  const mainRef = useRef<HTMLElement>(null)

  const { settings: fileSettings, updateSetting: updateFileSetting } = useFileSettings(activeTab?.filePath)
  const { recentFiles, loadRecentFiles, removeRecentFile, clearRecentFiles } = useRecentFiles()
  const indexPolicy = useMemo(() => getEffectiveIndexPolicy(indexSettings), [indexSettings])
  const readingPresets = useMemo(() => getDefaultReadingPresets(), [])
  const activeReadingPreset = useMemo(() => (
    readingPresets.find(preset => preset.id === activeReaderPresetId) || readingPresets[0]
  ), [activeReaderPresetId, readingPresets])
  const activeReaderFileKey = activeTab?.filePath || activeTab?.id || ''
  const activeReaderMarks = useMemo(() => (
    readerMarks.filter(mark => mark.filePath === activeReaderFileKey)
  ), [activeReaderFileKey, readerMarks])
  const activeChapterCompletions = useMemo(() => (
    chapterCompletions.filter(item => item.filePath === activeReaderFileKey)
  ), [activeReaderFileKey, chapterCompletions])
  const activeReadingHighlights = useMemo(() => (
    activeReaderMarks.filter(mark => mark.kind === 'highlight').map(mark => mark.text)
  ), [activeReaderMarks])
  const activeResumePoint = useMemo(() => {
    if (!activeTab) return null
    const history = readingHistory.find(item => item.filePath === activeTab.filePath)
    if (!history) return null
    return buildResumePoint({
      filePath: activeTab.filePath || activeTab.id,
      fileName: activeTab.name,
      content: activeTab.content || '',
      progress: history.progress,
      scrollTop: history.scrollTop || 0,
    }, history.updatedAt)
  }, [activeTab, readingHistory])
  const activeHistoryItem = useMemo(() => (
    activeTab?.filePath ? readingHistory.find(item => item.filePath === activeTab.filePath) : undefined
  ), [activeTab?.filePath, readingHistory])
  const readingLandmarks = useMemo(() => buildReadingLandmarks(activeTab?.content || ''), [activeTab?.content])
  const readingMediaItems = useMemo(() => extractReadingMediaItems(activeTab?.content || ''), [activeTab?.content])
  const activeReadingSnapshots = useMemo(() => (
    readingSnapshots.filter(snapshot => snapshot.filePath === activeReaderFileKey)
  ), [activeReaderFileKey, readingSnapshots])
  const annotationOverview = useMemo(() => (
    buildAnnotationOverview(activeReaderMarks, activeChapterCompletions)
  ), [activeChapterCompletions, activeReaderMarks])
  const readingStatusCard = useMemo(() => (
    activeTab ? buildReadingStatusCard({
      filePath: activeReaderFileKey,
      fileName: activeTab.name,
      progress: currentReadingProgress,
      marks: activeReaderMarks,
      chapterCompletions: activeChapterCompletions,
      historyUpdatedAt: activeHistoryItem?.updatedAt,
    }) : null
  ), [activeChapterCompletions, activeHistoryItem?.updatedAt, activeReaderFileKey, activeReaderMarks, activeTab, currentReadingProgress])
  const chapterReadingActions = useMemo(() => (
    activeTab?.content ? buildChapterReadingPlan(activeTab.content, activeChapterCompletions, activeReaderFileKey) : []
  ), [activeChapterCompletions, activeReaderFileKey, activeTab?.content])
  const readingStats = useMemo(() => buildReadingStats(readingSessions), [readingSessions])
  const chapterProgress = useMemo(() => (
    activeTab?.content ? buildChapterProgress(activeTab.content, currentReadingLine) : null
  ), [activeTab?.content, currentReadingLine])

  // ── Effects ──

  // Restore previous reading tabs after the first paint. This keeps the app
  // feeling responsive while preserving the reader's last session.
  useEffect(() => {
    runAfterFirstPaint(() => {
      void useTabStore.getState().restoreSession()
    }, 300)
  }, [])

  const refreshIndexedFiles = useCallback(async (folderPath: string | null) => {
    if (!folderPath) {
      setIndexedFileCount(0)
      return
    }
    try {
      const count = await getIndexedFileCount(folderPath)
      setIndexedFileCount(count)
      setWorkspaceIndexCounts(prev => ({ ...prev, [folderPath]: count }))
    } catch (error) {
      console.error('Failed to load indexed files:', error)
      setIndexedFileCount(0)
      setWorkspaceIndexCounts(prev => ({ ...prev, [folderPath]: 0 }))
    }
  }, [])

  const refreshWorkspaceIndexCounts = useCallback(async () => {
    const paths = Array.from(new Set([
      ...workspaces.map(workspace => workspace.folderPath),
      currentFolderPath,
    ].filter((path): path is string => Boolean(path))))

    if (paths.length === 0) {
      setWorkspaceIndexCounts({})
      return
    }

    const entries = await Promise.all(paths.map(async folderPath => {
      try {
        return [folderPath, await getIndexedFileCount(folderPath)] as const
      } catch (error) {
        console.error('Failed to load workspace index count:', error)
        return [folderPath, 0] as const
      }
    }))
    setWorkspaceIndexCounts(Object.fromEntries(entries))
  }, [currentFolderPath, workspaces])

  const rebuildFolderIndex = useCallback(async (
    folderPath = currentFolderPath,
    options: { silent?: boolean; policy?: typeof indexPolicy } = {}
  ) => {
    if (!folderPath) {
      if (!options.silent) {
        showToast('请先打开一个文件夹', 'error')
      }
      return
    }
    indexAbortControllerRef.current?.abort()
    const controller = new AbortController()
    indexAbortControllerRef.current = controller
    setIsIndexing(true)
    setIndexProgress({
      phase: 'scanning',
      discoveredFiles: 0,
      indexedFiles: 0,
      skippedFiles: 0,
      currentPath: folderPath,
    })
    try {
      const activeIndexPolicy = options.policy ?? indexPolicy
      const handleProgress = (progress: IndexProgress) => setIndexProgress(progress)
      const skippedItems: IndexSkippedItem[] = []
      const persistSkippedItems = (nextItems: IndexSkippedItem[]) => {
        const updatedAt = Date.now()
        setIndexSkippedItems([...nextItems])
        setIndexDiagnosticsUpdatedAt(updatedAt)
        saveIndexDiagnostics(folderPath, nextItems, updatedAt)
      }
      setIndexSkippedItems([])
      setIndexDiagnosticsUpdatedAt(null)
      const allFiles = await getAllMarkdownFiles(folderPath, {
        signal: controller.signal,
        onProgress: handleProgress,
        onSkip: item => {
          skippedItems.push(item)
          persistSkippedItems(skippedItems)
        },
        maxFileSizeBytes: activeIndexPolicy.maxFileSizeBytes,
        skipDirectoryNames: activeIndexPolicy.skipDirectoryNames,
      })
      await indexFolder(folderPath, allFiles, {
        signal: controller.signal,
        onProgress: handleProgress,
        onSkip: item => {
          skippedItems.push(item)
          persistSkippedItems(skippedItems)
        },
        initialSkippedItems: skippedItems,
      })
      persistSkippedItems(skippedItems)
      await refreshIndexedFiles(folderPath)
      if (!options.silent) {
        const skippedCount = skippedItems.length
        showToast(skippedCount > 0
          ? `索引已更新：${allFiles.length} 个 Markdown 文件，跳过 ${skippedCount} 项`
          : `索引已更新：${allFiles.length} 个 Markdown 文件`)
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setIndexProgress(prev => ({
          phase: 'cancelled',
          discoveredFiles: prev?.discoveredFiles ?? 0,
          indexedFiles: prev?.indexedFiles ?? 0,
          skippedFiles: prev?.skippedFiles ?? 0,
          currentPath: prev?.currentPath,
          skippedItems: prev?.skippedItems,
        }))
        if (!options.silent) {
          showToast('索引已取消')
        }
        return
      }
      console.error('Failed to rebuild index:', error)
      if (!options.silent) {
        showToast(`索引失败：${String(error)}`, 'error')
      }
      throw error
    } finally {
      if (indexAbortControllerRef.current === controller) {
        indexAbortControllerRef.current = null
      }
      setIsIndexing(false)
    }
  }, [currentFolderPath, indexPolicy.maxFileSizeBytes, indexPolicy.skipDirectoryNames, refreshIndexedFiles, showToast])

  const cancelFolderIndex = useCallback(() => {
    indexAbortControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    void refreshIndexedFiles(currentFolderPath)
  }, [currentFolderPath, refreshIndexedFiles])

  useEffect(() => {
    if (!currentFolderPath) {
      setIndexSkippedItems([])
      setIndexDiagnosticsUpdatedAt(null)
      return
    }
    const saved = loadSavedIndexDiagnostics(currentFolderPath)
    setIndexSkippedItems(saved.skippedItems)
    setIndexDiagnosticsUpdatedAt(saved.updatedAt)
  }, [currentFolderPath])

  useEffect(() => {
    if (showWorkspaces) {
      void refreshWorkspaceIndexCounts()
    }
  }, [refreshWorkspaceIndexCounts, showWorkspaces])

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
      showToast(t('app.failedRestores', { names }), 'error')
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

  const openFileAtLine = useCallback(async (filePath: string, line?: number, scrollTop?: number) => {
    if (!window.electronAPI) return
    if (typeof scrollTop === 'number') {
      setStorageItem(`scroll-position-${filePath}`, String(Math.max(0, Math.round(scrollTop))))
    }
    const result = await window.electronAPI.readFile(filePath)
    if (result.success && result.content !== undefined) {
      handleFileOpen(result.content, basename(filePath) || filePath, filePath)
      if (line) {
        setShowSource(true)
        window.setTimeout(() => setHighlightedLine(line), 0)
      }
    } else {
      showToast(result.error || t('app.readFileFailed'), 'error')
    }
  }, [handleFileOpen, setHighlightedLine, setShowSource, showToast, t])

  // Recent file select handler
  const handleRecentSelect = useCallback(async (file: RecentFile) => {
    const opened = await openRecentFile(file)
    loadRecentFiles()
    if (opened) {
      closePanel('recent')
    } else {
      showToast(t('app.recentFileRemoved'), 'error')
    }
  }, [openRecentFile, loadRecentFiles, closePanel, showToast, t])

  const saveCurrentWorkspaceSession = useCallback(() => {
    if (!currentFolderPath) return
    const workspace = saveWorkspace(currentFolderName || basename(currentFolderPath) || currentFolderPath, currentFolderPath)
    saveWorkspaceSession(workspace.id, {
      tabs: tabs
        .filter(tab => !tab.filePath || tab.filePath.startsWith(currentFolderPath))
        .map(tab => ({
          name: tab.name,
          filePath: tab.filePath,
          content: tab.filePath ? undefined : tab.content,
          isPinned: tab.isPinned,
        })),
      activeFilePath: activeTab?.filePath,
      updatedAt: Date.now(),
    })
    setWorkspaces(getWorkspaces())
  }, [activeTab?.filePath, currentFolderName, currentFolderPath, tabs])

  const handleOpenWorkspace = useCallback(async (folderPath: string) => {
    if (!window.electronAPI) return
    saveCurrentWorkspaceSession()
    const result = await window.electronAPI.readFolder(folderPath)
    if (!result.success || !result.files) {
      showToast(result.error || t('app.readFolderFailed'), 'error')
      return
    }
    setFolder(folderPath, basename(folderPath) || folderPath)
    await window.electronAPI.setLastFolder(folderPath)
    openPanel('fileSidebar')
    closePanel('workspaces')

    const workspace = getWorkspaces().find(item => item.folderPath === folderPath)
    const session = workspace ? getWorkspaceSession(workspace.id) : null
    const sessionTabs = session?.tabs.filter(tab => tab.filePath) || []
    if (sessionTabs.length > 0) {
      closeAllTabs()
      const inactiveTabs = sessionTabs.filter(tab => tab.filePath !== session?.activeFilePath)
      const activeSessionTab = sessionTabs.find(tab => tab.filePath === session?.activeFilePath) || sessionTabs[0]
      for (const tab of [...inactiveTabs, activeSessionTab]) {
        if (tab.filePath) await openFileAtLine(tab.filePath)
      }
    } else {
      const firstFile = result.files.find(file => !file.isDirectory)
      if (firstFile) {
        await openFileAtLine(firstFile.filePath)
      }
    }
  }, [closeAllTabs, closePanel, openFileAtLine, openPanel, saveCurrentWorkspaceSession, setFolder, showToast, t])

  const handleSaveWorkspace = useCallback(() => {
    if (!currentFolderPath) return
    saveCurrentWorkspaceSession()
    showToast('工作区已保存')
  }, [currentFolderPath, saveCurrentWorkspaceSession, showToast])

  const handleOpenFileDialog = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.openFileDialog()
      if (!result) return
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      handleFileOpen(result.content, basename(result.filePath) || '未命名.md', result.filePath)
    } catch (err) {
      console.error('[handleOpenFileDialog] error:', err)
      showToast(`打开文件失败：${String(err)}`, 'error')
    }
  }, [handleFileOpen, showToast])

  const toggleSourceView = useCallback(() => {
    const next = !showSource
    setShowSource(next)
    if (activeTab?.filePath) updateFileSetting('showSource', next)
  }, [activeTab?.filePath, setShowSource, showSource, updateFileSetting])

  const zoomIn = useCallback(() => {
    const next = Math.min(32, fontSize + 2)
    setFontSize(next)
    if (activeTab?.filePath) updateFileSetting('fontSize', next)
  }, [activeTab?.filePath, fontSize, setFontSize, updateFileSetting])

  const zoomOut = useCallback(() => {
    const next = Math.max(12, fontSize - 2)
    setFontSize(next)
    if (activeTab?.filePath) updateFileSetting('fontSize', next)
  }, [activeTab?.filePath, fontSize, setFontSize, updateFileSetting])

  const handleRemoveWorkspace = useCallback((id: string) => {
    removeWorkspace(id)
    setWorkspaces(getWorkspaces())
  }, [])

  const handleToggleWorkspacePinned = useCallback((id: string) => {
    toggleWorkspacePinned(id)
    setWorkspaces(getWorkspaces())
  }, [])

  const handleRenameWorkspace = useCallback((id: string, name: string) => {
    renameWorkspace(id, name)
    setWorkspaces(getWorkspaces())
    showToast('工作区已重命名')
  }, [showToast])

  const handleCleanInvalidWorkspaces = useCallback(async () => {
    if (!window.electronAPI) return
    const invalidIds: string[] = []
    for (const workspace of getWorkspaces()) {
      const result = await window.electronAPI.readFolder(workspace.folderPath)
      if (!result.success) {
        invalidIds.push(workspace.id)
      }
    }
    if (invalidIds.length === 0) {
      showToast('没有失效工作区')
      return
    }
    removeWorkspaces(invalidIds)
    setWorkspaces(getWorkspaces())
    showToast(`已清理 ${invalidIds.length} 个失效工作区`)
  }, [showToast])

  // Open folder
  const handleOpenFolder = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const folderPath = await window.electronAPI.openFolderDialog()
      if (!folderPath) return

      const result = await window.electronAPI.readFolder(folderPath)
      if (!result.success || !result.files || result.files.length === 0) {
        if (!result.success) {
          showToast(result.error || t('app.readFolderFailed'), 'error')
        }
        return
      }

      const firstFile = result.files.find(f => !f.isDirectory)
      if (!firstFile) {
        showToast(t('app.noMarkdownFiles'), 'error')
        return
      }
      const fileResult = await window.electronAPI.readFile(firstFile.filePath)
      if (fileResult.success && fileResult.content !== undefined) {
        handleFileOpen(fileResult.content, firstFile.name, firstFile.filePath)
        setFolder(folderPath, basename(folderPath) || folderPath)
        await window.electronAPI.setLastFolder(folderPath)
        openPanel('fileSidebar')
      } else {
        showToast(fileResult.error || t('app.readFileFailed'), 'error')
      }
    } catch (err) {
      console.error('[handleOpenFolder] error:', err)
      showToast(t('app.openFolderFailedWithError', { error: String(err) }), 'error')
    }
  }, [handleFileOpen, setFolder, openPanel, showToast, t])

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
  const handleGlobalSearchOpenFile = useCallback(async (filePath: string, line?: number) => {
    await openFileAtLine(filePath, line)
    setCurrentFilePath(filePath)
  }, [openFileAtLine, setCurrentFilePath])

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
  const handleWikiLinkClick = useCallback(async (target: string, altTarget?: string) => {
    if (!activeTab?.filePath || !window.electronAPI) {
      showToast(t('app.wikiLinkNoPath'), 'error')
      return
    }
    const dir = dirname(activeTab.filePath)
    const candidates = [
      ...wikiPathCandidates(dir, target),
      ...(altTarget ? wikiPathCandidates(dir, altTarget) : []),
    ].filter((filePath, index, list) => list.indexOf(filePath) === index)
    for (const filePath of candidates) {
      const result = await window.electronAPI.readFile(filePath)
      if (result.success && result.content !== undefined) {
        const name = basename(filePath) || target
        handleFileOpen(result.content, name, filePath)
        return
      }
    }
    showToast(t('app.fileNotFound', { name: target }), 'error')
  }, [activeTab?.filePath, handleFileOpen, showToast, t])

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
  const isWelcomeTab = activeTab?.name === '欢迎使用.md' && !activeTab.filePath
  const showHome = !activeTab || isWelcomeTab
  const activeTabNeedsContent = Boolean(
    activeTab?.filePath &&
    !activeTab.content &&
    (activeTab.contentStatus === 'pending' || activeTab.contentStatus === 'loading' || activeTab.contentStatus === 'error')
  )
  const secondaryTabNeedsContent = Boolean(
    secondaryTab?.filePath &&
    !secondaryTab.content &&
    (secondaryTab.contentStatus === 'pending' || secondaryTab.contentStatus === 'loading' || secondaryTab.contentStatus === 'error')
  )

  useEffect(() => {
    if (!activeTab?.filePath || activeTab.content || activeTab.contentStatus === 'loading' || activeTab.contentStatus === 'error') return
    void loadTabContent(activeTab.id)
  }, [activeTab?.content, activeTab?.contentStatus, activeTab?.filePath, activeTab?.id, loadTabContent])

  useEffect(() => {
    if (!isSplitView || !secondaryTab?.filePath || secondaryTab.content || secondaryTab.contentStatus === 'loading' || secondaryTab.contentStatus === 'error') return
    void loadTabContent(secondaryTab.id)
  }, [isSplitView, loadTabContent, secondaryTab?.content, secondaryTab?.contentStatus, secondaryTab?.filePath, secondaryTab?.id])

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

  const persistReaderMarks = useCallback((next: ReaderMark[]) => {
    setReaderMarks(next)
    setStorageItem(READER_MARKS_KEY, JSON.stringify(next))
  }, [])

  const persistReadLaterItems = useCallback((next: ReadLaterItem[]) => {
    setReadLaterItems(next)
    setStorageItem(READER_QUEUE_KEY, JSON.stringify(next))
    setStorageItem('read-later-count', String(next.filter(item => item.status !== 'done').length))
  }, [])

  const persistChapterCompletions = useCallback((next: ChapterCompletion[]) => {
    setChapterCompletions(next)
    setStorageItem(READER_CHAPTERS_KEY, JSON.stringify(next))
  }, [])

  const persistReadingSnapshots = useCallback((next: ReadingSnapshot[]) => {
    setReadingSnapshots(next)
    setStorageItem(READER_SNAPSHOTS_KEY, JSON.stringify(next))
  }, [])

  const getSelectedLine = useCallback((text: string): number | undefined => {
    if (!activeTab?.content || !text) return undefined
    const index = activeTab.content.indexOf(text)
    if (index < 0) return undefined
    return activeTab.content.slice(0, index).split('\n').length
  }, [activeTab?.content])

  const handleAddReaderMark = useCallback((kind: 'highlight' | 'excerpt') => {
    if (!activeTab || !selectedReaderText.trim()) {
      showToast('请先选中正文文本')
      return
    }
    const next = addReaderMark(readerMarks, {
      filePath: activeReaderFileKey,
      fileName: activeTab.name,
      text: selectedReaderText,
      kind,
      color: kind === 'highlight' ? 'yellow' : 'blue',
      line: getSelectedLine(selectedReaderText),
    })
    persistReaderMarks(next)
    showToast(kind === 'highlight' ? '高亮已保存' : '摘录已保存')
  }, [activeReaderFileKey, activeTab, getSelectedLine, persistReaderMarks, readerMarks, selectedReaderText, showToast])

  const handleRemoveReaderMark = useCallback((id: string) => {
    persistReaderMarks(readerMarks.filter(mark => mark.id !== id))
    showToast('阅读标记已删除')
  }, [persistReaderMarks, readerMarks, showToast])

  const handleUpdateReaderMarkMetadata = useCallback((id: string, metadata: { color?: ReaderMark['color']; tag?: string }) => {
    persistReaderMarks(updateReaderMarkMetadata(readerMarks, id, metadata))
    showToast('高亮信息已更新')
  }, [persistReaderMarks, readerMarks, showToast])

  const handleExportAnnotations = useCallback(() => {
    if (!activeTab) {
      showToast('当前没有可导出的阅读批注')
      return
    }
    const markdown = exportReaderAnnotationsMarkdown({
      fileName: activeTab.name,
      marks: activeReaderMarks,
      chapterCompletions: activeChapterCompletions,
      progressLabel: activeResumePoint?.label || (chapterProgress ? `${chapterProgress.currentHeading} · ${chapterProgress.percent}%` : undefined),
    })
    void navigator.clipboard?.writeText(markdown)
    showToast('阅读批注已复制为 Markdown')
  }, [activeChapterCompletions, activeReaderMarks, activeResumePoint?.label, activeTab, chapterProgress, showToast])

  const handleAddReadLater = useCallback(() => {
    if (!activeTab) {
      showToast('当前没有可加入稍后读的文档')
      return
    }
    const next = upsertReadLaterItem(readLaterItems, {
      filePath: activeReaderFileKey,
      fileName: activeTab.name,
      heading: currentHeading || undefined,
      status: 'unread',
    })
    persistReadLaterItems(next)
    showToast('已加入稍后读')
  }, [activeReaderFileKey, activeTab, currentHeading, persistReadLaterItems, readLaterItems, showToast])

  const handleOpenReadLater = useCallback((item: ReadLaterItem) => {
    void openFileAtLine(item.filePath)
  }, [openFileAtLine])

  const handleUpdateReadLaterStatus = useCallback((id: string, status: ReadLaterStatus) => {
    persistReadLaterItems(updateReadLaterStatus(readLaterItems, id, status))
    showToast(status === 'done' ? '已标记为已读' : '阅读状态已更新')
  }, [persistReadLaterItems, readLaterItems, showToast])

  const handleToggleChapterCompletion = useCallback(() => {
    if (!activeTab || !chapterProgress) {
      showToast('当前没有可标记的章节')
      return
    }
    const next = toggleChapterCompletion(chapterCompletions, {
      filePath: activeReaderFileKey,
      heading: chapterProgress.currentHeading,
      line: chapterProgress.lineStart,
    })
    persistChapterCompletions(next)
    const completed = next.some(item => item.filePath === activeReaderFileKey && item.heading === chapterProgress.currentHeading && item.line === chapterProgress.lineStart)
    showToast(completed ? '章节已标记完成' : '章节完成标记已取消')
  }, [activeReaderFileKey, activeTab, chapterCompletions, chapterProgress, persistChapterCompletions, showToast])

  const handleResumeReading = useCallback(() => {
    if (!activeResumePoint) {
      showToast('当前文档暂无可恢复位置')
      return
    }
    if (activeTab?.filePath === activeResumePoint.filePath && mainRef.current) {
      mainRef.current.scrollTop = activeResumePoint.scrollTop
      return
    }
    void openFileAtLine(activeResumePoint.filePath, undefined, activeResumePoint.scrollTop)
  }, [activeResumePoint, activeTab?.filePath, openFileAtLine, showToast])

  const handleApplyReadingPreset = useCallback((preset: ReadingPreset) => {
    setActiveReaderPresetId(preset.id)
    setStorageItem(READER_PRESET_KEY, preset.id)
    setFontSize(preset.fontSize)
    setShowOutline(preset.showOutline)
    if (activeTab?.filePath) {
      updateFileSetting('fontSize', preset.fontSize)
      updateFileSetting('showOutline', preset.showOutline)
    }
    const nextLayout = preset.columns ? 'columns' : readingLayoutMode
    setReadingLayoutMode(nextLayout)
    setStorageItem(READER_LAYOUT_KEY, nextLayout)
    if (nextLayout !== 'split') setSplitView(false, null)
    showToast(`已应用阅读预设：${preset.name}`)
  }, [activeTab?.filePath, readingLayoutMode, setFontSize, setShowOutline, setSplitView, showToast, updateFileSetting])

  const handleJumpToReadingLandmark = useCallback((landmark: ReadingLandmark) => {
    const element = document.querySelector(`[data-line="${landmark.line}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setShowSource(true)
    window.setTimeout(() => setHighlightedLine(landmark.line), 0)
  }, [setHighlightedLine, setShowSource])

  const handleOpenAnnotation = useCallback((item: AnnotationOverviewItem) => {
    if (item.line) {
      if (activeTab?.filePath === item.filePath || activeReaderFileKey === item.filePath) {
        handleJumpToReadingLandmark({
          id: item.id,
          type: item.kind === 'chapter' ? 'heading' : 'paragraph',
          label: item.label,
          line: item.line,
        })
        return
      }
      void openFileAtLine(item.filePath, item.line)
      return
    }
    setQuery(item.label)
    openPanel('search')
  }, [activeReaderFileKey, activeTab?.filePath, handleJumpToReadingLandmark, openFileAtLine, openPanel, setQuery])

  const handleOpenChapterAction = useCallback((chapter: ChapterReadingAction) => {
    handleJumpToReadingLandmark({
      id: chapter.id,
      type: 'heading',
      label: chapter.heading,
      line: chapter.line,
    })
  }, [handleJumpToReadingLandmark])

  const handleSetReadingLayoutMode = useCallback((mode: ReadingLayoutMode) => {
    setReadingLayoutMode(mode)
    setStorageItem(READER_LAYOUT_KEY, mode)
    if (mode === 'split') {
      if (!isSplitView) toggleSplitView()
    } else {
      setSplitView(false, null)
    }
  }, [isSplitView, setSplitView, toggleSplitView])

  const handleJumpToReaderMark = useCallback((mark: ReaderMark) => {
    if (mark.line) {
      handleJumpToReadingLandmark({
        id: mark.id,
        type: mark.kind === 'highlight' ? 'paragraph' : 'paragraph',
        label: mark.text,
        line: mark.line,
      })
      return
    }
    setQuery(mark.text)
    openPanel('search')
  }, [handleJumpToReadingLandmark, openPanel, setQuery])

  const handleStartFocusTimer = useCallback((minutes: number) => {
    const timer = createFocusTimer({ minutes })
    setFocusTimer(timer)
    setStorageItem(READER_FOCUS_TIMER_KEY, JSON.stringify(timer))
    openPanel('focusMode')
    showToast(`已开始 ${timer.minutes} 分钟防打扰阅读`)
  }, [openPanel, showToast])

  const handleStopFocusTimer = useCallback(() => {
    setFocusTimer(null)
    removeStorageItem(READER_FOCUS_TIMER_KEY)
    showToast('防打扰计时已停止')
  }, [showToast])

  const handleOpenMediaGallery = useCallback(() => {
    const media = readingMediaItems[0]
    if (!media) {
      showToast('当前文档没有图片或表格')
      return
    }
    setActiveReadingMediaId(media.id)
    setShowReadingMediaPanel(true)
  }, [readingMediaItems, showToast])

  const handleJumpToReadingMediaLine = useCallback((line: number) => {
    setShowReadingMediaPanel(false)
    handleJumpToReadingLandmark({
      id: `media-line-${line}`,
      type: 'paragraph',
      label: `行 ${line}`,
      line,
    })
  }, [handleJumpToReadingLandmark])

  const handleCopyReadingMedia = useCallback((text: string, label: string) => {
    void navigator.clipboard?.writeText(text)
    showToast(label)
  }, [showToast])

  const handleSyncComparison = useCallback(() => {
    if (!secondaryTab?.content) {
      showToast('请先打开对比阅读视图')
      if (!isSplitView) toggleSplitView()
      return
    }
    const target = buildComparisonSyncTarget(currentReadingProgress, secondaryTab.content)
    window.setTimeout(() => {
      const panes = Array.from(document.querySelectorAll<HTMLElement>(`main.${styles.splitPane}`))
      const secondaryPane = panes[0]
      if (!secondaryPane) return
      const maxScroll = Math.max(1, secondaryPane.scrollHeight - secondaryPane.clientHeight)
      secondaryPane.scrollTop = maxScroll * target.progress
    }, 0)
    showToast(`对比文档已同步到约第 ${target.line} 行`)
  }, [currentReadingProgress, isSplitView, secondaryTab?.content, showToast, toggleSplitView])

  const handleUpdateAccessibility = useCallback((settings: Partial<ReadingAccessibilitySettings>) => {
    const next = normalizeAccessibilitySettings({ ...accessibility, ...settings })
    setAccessibility(next)
    setStorageItem(READER_ACCESSIBILITY_KEY, JSON.stringify(next))
    showToast('阅读无障碍设置已更新')
  }, [accessibility, showToast])

  const handleCreateReadingSnapshot = useCallback(() => {
    if (!activeTab) {
      showToast('当前没有可保存的阅读现场')
      return
    }
    const snapshot = createReadingSnapshot({
      filePath: activeReaderFileKey,
      fileName: activeTab.name,
      progress: currentReadingProgress,
      scrollTop: mainRef.current?.scrollTop || 0,
      fontSize,
      theme,
      layoutMode: readingLayoutMode,
      heading: currentHeading || undefined,
    })
    persistReadingSnapshots([snapshot, ...readingSnapshots.filter(item => item.id !== snapshot.id)].slice(0, 60))
    showToast('阅读快照已保存')
  }, [activeReaderFileKey, activeTab, currentHeading, currentReadingProgress, fontSize, persistReadingSnapshots, readingLayoutMode, readingSnapshots, showToast, theme])

  const handleRestoreReadingSnapshot = useCallback((snapshot: ReadingSnapshot) => {
    setFontSize(snapshot.fontSize)
    if (snapshot.theme === 'light' || snapshot.theme === 'dark' || snapshot.theme === 'sepia') {
      setTheme(snapshot.theme)
    }
    handleSetReadingLayoutMode(snapshot.layoutMode)
    if (activeReaderFileKey === snapshot.filePath && mainRef.current) {
      mainRef.current.scrollTop = snapshot.scrollTop
    } else {
      void openFileAtLine(snapshot.filePath, undefined, snapshot.scrollTop)
    }
    showToast('阅读快照已恢复')
  }, [activeReaderFileKey, handleSetReadingLayoutMode, openFileAtLine, setFontSize, setTheme, showToast])

  const jumpHeadingByOffset = useCallback((offset: number) => {
    if (outlineItems.length === 0) return
    const activeIndex = Math.max(0, outlineItems.findIndex(item => item.id === activeHeadingId))
    const fallbackIndex = offset > 0 ? 0 : outlineItems.length - 1
    const nextIndex = Math.max(0, Math.min(outlineItems.length - 1, (activeIndex >= 0 ? activeIndex : fallbackIndex) + offset))
    handleOutlineClick(outlineItems[nextIndex].id)
  }, [activeHeadingId, handleOutlineClick, outlineItems])

  const handleKeyboardBookmark = useCallback(() => {
    const heading = currentHeading || activeTab?.name
    if (!heading) return
    addBookmark(heading)
    showToast('已添加书签')
  }, [activeTab?.name, addBookmark, currentHeading, showToast])

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
          showToast(result.error || t('app.openFileFailed'), 'error')
        }
      } catch {
        showToast(t('app.openFileFailed'), 'error')
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
        await handleOpenWorkspace(folderPath)
      } catch {
        showToast(t('app.openFolderFailed'), 'error')
      }
    }
    window.electronAPI.onOpenFolder(listener)
    return () => {
      window.electronAPI!.offOpenFolder(listener)
    }
  }, [handleOpenWorkspace, showToast, t])

  // Focus mode body class
  useEffect(() => {
    if (showFocusMode) {
      document.body.classList.add('focus-mode')
    } else {
      document.body.classList.remove('focus-mode')
    }
    return () => document.body.classList.remove('focus-mode')
  }, [showFocusMode])

  useEffect(() => {
    document.body.classList.toggle('reader-reduce-motion', accessibility.reduceMotion)
    document.body.classList.toggle('reader-high-contrast', accessibility.highContrastHighlights)
    return () => {
      document.body.classList.remove('reader-reduce-motion')
      document.body.classList.remove('reader-high-contrast')
    }
  }, [accessibility.highContrastHighlights, accessibility.reduceMotion])

  useEffect(() => {
    if (!focusTimer) return
    const checkTimer = () => {
      if (Date.now() < focusTimer.endsAt) return
      setFocusTimer(null)
      removeStorageItem(READER_FOCUS_TIMER_KEY)
      closePanel('focusMode')
      showToast('防打扰阅读计时结束')
    }
    checkTimer()
    const interval = window.setInterval(checkTimer, 10000)
    return () => window.clearInterval(interval)
  }, [closePanel, focusTimer, showToast])

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

  useEffect(() => {
    const main = mainRef.current
    if (!main || !activeTab?.filePath || isRestoringSession) return
    let timeout: ReturnType<typeof setTimeout> | null = null

    const record = () => {
      const maxScroll = Math.max(1, main.scrollHeight - main.clientHeight)
      const progress = Math.min(1, Math.max(0, main.scrollTop / maxScroll))
      const lineCount = activeTab.content.split('\n').length
      const line = Math.max(1, Math.round(progress * lineCount))
      setCurrentReadingProgress(progress)
      setCurrentReadingLine(line)
      readingProgressRef.current = progress
      recordReadingHistory({
        filePath: activeTab.filePath || '',
        name: activeTab.name,
        progress,
        line,
        scrollTop: main.scrollTop,
      })
      setReadingHistory(getReadingHistory())
    }

    const onScroll = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(record, 500)
    }

    main.addEventListener('scroll', onScroll)
    record()
    return () => {
      if (timeout) clearTimeout(timeout)
      main.removeEventListener('scroll', onScroll)
    }
  }, [activeTab?.content, activeTab?.filePath, activeTab?.name, isRestoringSession])

  useEffect(() => {
    if (!activeTab?.filePath || isRestoringSession) return
    const startedAt = Date.now()
    const wordsStart = Math.round((activeTab.content || '').replace(/\s/g, '').length * readingProgressRef.current)
    readingSessionRef.current = {
      filePath: activeTab.filePath,
      fileName: activeTab.name,
      startedAt,
      progressStart: readingProgressRef.current,
      wordsStart,
    }
    setActiveSessionMinutes(0)

    const interval = window.setInterval(() => {
      setActiveSessionMinutes(Math.max(0, Math.round((Date.now() - startedAt) / 60000)))
    }, 30000)

    return () => {
      window.clearInterval(interval)
      const session = readingSessionRef.current
      if (!session || session.filePath !== activeTab.filePath) return
      const endedAt = Date.now()
      if (endedAt - session.startedAt < 5000) return
      const wordsEnd = Math.round((activeTab.content || '').replace(/\s/g, '').length * readingProgressRef.current)
      const nextSession = createReadingSession({
        filePath: session.filePath,
        fileName: session.fileName,
        startedAt: session.startedAt,
        endedAt,
        progressStart: session.progressStart,
        progressEnd: readingProgressRef.current,
        wordsRead: Math.max(0, wordsEnd - session.wordsStart),
      })
      setReadingSessions(prev => {
        const next = [nextSession, ...prev].slice(0, 500)
        setStorageItem(READER_SESSIONS_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [activeTab?.content, activeTab?.filePath, activeTab?.name, isRestoringSession])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const action = normalizeReadingKeyboardAction(event.key)
      if (!action) return
      event.preventDefault()
      const main = mainRef.current
      if (action === 'scroll-down') main?.scrollBy({ top: Math.round((main.clientHeight || 600) * 0.72), behavior: 'smooth' })
      if (action === 'scroll-up') main?.scrollBy({ top: -Math.round((main.clientHeight || 600) * 0.72), behavior: 'smooth' })
      if (action === 'next-heading') jumpHeadingByOffset(1)
      if (action === 'previous-heading') jumpHeadingByOffset(-1)
      if (action === 'mark-read-later') handleAddReadLater()
      if (action === 'bookmark') handleKeyboardBookmark()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddReadLater, handleKeyboardBookmark, jumpHeadingByOffset])

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
      {showFocusMode && (
        <div className={styles.focusReadingBar} role="region" aria-label="专注阅读工具条">
          <span>{chapterProgress ? `${chapterProgress.currentHeading} · ${chapterProgress.percent}%` : `全文 ${Math.round(currentReadingProgress * 100)}%`}</span>
          <button type="button" onClick={() => {
            closePanel('focusMode')
            openPanel('outline')
          }}>目录</button>
          <button type="button" onClick={() => setFontSize(Math.max(10, fontSize - 1))}>A-</button>
          <button type="button" onClick={() => setFontSize(Math.min(32, fontSize + 1))}>A+</button>
          <button type="button" onClick={() => togglePanel('focusMode')}>退出</button>
        </div>
      )}
      {isDraggingOver && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayContent}>
            {t('app.dropOverlay')}
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
                  onClick={handleOpenFolder}
                  className={styles.toolbarBtn}
                  aria-label={t('toolbar.openFolder')} data-tooltip={t('toolbar.openFolder')}
                >
                  📂
                </button>
                {(currentFolderHandle || currentFolderPath) && (
                  <button
                    onClick={() => togglePanel('fileSidebar')}
                    className={`${styles.toolbarBtn} ${showFileSidebar ? styles.toolbarBtnActive : ''}`}
                    aria-label={t('toolbar.fileList')} data-tooltip={t('toolbar.fileList')}
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
                  data-tooltip={showFilePreview ? t('toolbar.showOutline') : t('toolbar.filePreview')}
                >
                  {showFilePreview ? '📋' : '📑'}
                </button>
                <button
                  onClick={() => openPanel('search')}
                  data-guide="search"
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label={t('toolbar.search')} data-tooltip={t('toolbar.searchTooltip')}
                >
                  🔍
                </button>
                <ToolsMenu
                  buttonClassName={styles.toolbarBtn}
                  activeButtonClassName={styles.toolbarBtnActive}
                  isActive={showIndexDiagnostics || showReadingTools || showWorkspaces || showReadingTimeline || showGlobalSearch || showSource || showExportPanel || showFocusMode || showQuickJump || showFileInfo}
                  onOpenPanel={openPanel}
                  showSource={showSource}
                  showFocusMode={showFocusMode}
                  fontSize={fontSize}
                  onToggleSource={toggleSourceView}
                  onToggleFocusMode={() => togglePanel('focusMode')}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                />
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
              {!showFocusMode && !showSource && !showHome && outlineItems.length >= 3 && (
                <FloatingTOC outlineItems={outlineItems} activeHeadingId={activeHeadingId} onNavigate={handleOutlineClick} />
              )}

              <div key={`content-${activeTabId || 'home'}`} className="tab-content">
                  {showSource ? (
                    <SourceView
                      content={activeTab?.content || ''}
                      highlightedLine={highlightedLine}
                      editable={Boolean(activeTab?.filePath)}
                      onSave={saveSourceEdit}
                    />
                  ) : showHome ? (
                    <WelcomeHome
                      recentFileCount={recentFiles.length}
                      readingHistoryCount={readingHistory.length}
                      indexedFileCount={indexedFileCount}
                      isIndexing={isIndexing}
                      indexProgress={indexProgress}
                      currentFolderName={currentFolderName}
                      currentFolderPath={currentFolderPath}
                      latestReadingName={readingHistory[0]?.name}
                      onOpenFile={handleOpenFileDialog}
                      onOpenFolder={handleOpenFolder}
                      onOpenRecent={() => openPanel('recent')}
                      onOpenReadingTimeline={() => openPanel('readingTimeline')}
                      onShowGuide={() => setShowGuide(true)}
                      onReindex={() => rebuildFolderIndex()}
                    />
                  ) : activeTabNeedsContent ? (
                    <DocumentLoadState
                      fileName={activeTab?.name}
                      status={activeTab?.contentStatus}
                      error={activeTab?.contentError}
                      onRetry={activeTab ? () => void loadTabContent(activeTab.id) : undefined}
                    />
                  ) : (
                    (activeTab?.content && (activeTab.content.length > 300000 || activeTab.content.split('\n').length > 5000)) ? (
                      <VirtualMarkdown
                        ref={markdownRef}
                        content={activeTab.content}
                        filePath={activeTab.filePath}
                        searchQuery={query}
                        searchRegex={isRegex}
                        currentMatch={currentMatch}
                        matchCount={matches.length}
                        onWikiLinkClick={handleWikiLinkClick}
                      />
                    ) : (
                      <MarkdownRenderer
                        ref={markdownRef}
                        content={activeTab?.content || ''}
                        filePath={activeTab?.filePath}
                        searchQuery={query}
                        searchRegex={isRegex}
                        currentMatch={currentMatch}
                        matchCount={matches.length}
                        readingHighlights={activeReadingHighlights}
                        readingLayout={readingLayoutMode === 'columns' ? 'columns' : 'single'}
                        readingStyle={activeReadingPreset ? {
                          lineHeight: accessibility.lineHeight || activeReadingPreset.lineHeight,
                          lineWidth: activeReadingPreset.lineWidth,
                          letterSpacing: accessibility.letterSpacing,
                          paragraphSpacing: accessibility.paragraphSpacing,
                        } : undefined}
                        ttsRate={accessibility.ttsRate}
                        onTextSelect={({ text }) => setSelectedReaderText(text)}
                        onWikiLinkClick={handleWikiLinkClick}
                      />
                    )
                  )}
              </div>
            </main>
            {isSplitView && secondaryTab && (
              <main className={`${styles.main} ${styles.splitPane}`} style={{ fontSize: `${fontSize}px` }}>
                <div key={`secondary-${secondaryTabId}`} className="tab-content">
                  {secondaryTabNeedsContent ? (
                    <DocumentLoadState
                      fileName={secondaryTab?.name}
                      status={secondaryTab?.contentStatus}
                      error={secondaryTab?.contentError}
                      onRetry={secondaryTab ? () => void loadTabContent(secondaryTab.id) : undefined}
                    />
                  ) : showSource ? (
                    <SourceView content={secondaryTab.content || ''} />
                  ) : (
                    <MarkdownRenderer
                      content={secondaryTab.content || ''}
                      filePath={secondaryTab.filePath}
                      readingLayout="single"
                      readingStyle={activeReadingPreset ? {
                        lineHeight: accessibility.lineHeight || activeReadingPreset.lineHeight,
                        lineWidth: activeReadingPreset.lineWidth,
                        letterSpacing: accessibility.letterSpacing,
                        paragraphSpacing: accessibility.paragraphSpacing,
                      } : undefined}
                      ttsRate={accessibility.ttsRate}
                      onWikiLinkClick={handleWikiLinkClick}
                    />
                  )}
                </div>
              </main>
            )}
            {!showFocusMode && !showSource && !isWelcomeTab && (showFilePreview || outlineItems.length > 0) && (
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
            {!showFocusMode && showReadingTools && (
              <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
                <ReadingToolsPanel
                  fileName={activeTab?.name || '未打开文档'}
                  selectedText={selectedReaderText}
                  marks={activeReaderMarks}
                  readLaterItems={readLaterItems}
                  resumePoint={activeResumePoint}
                  presets={readingPresets}
                  activePresetId={activeReaderPresetId}
                  landmarks={readingLandmarks}
                  layoutMode={readingLayoutMode}
                  panelMode="sidebar"
                  readingStats={readingStats}
                  chapterProgress={chapterProgress}
                  chapterCompletions={activeChapterCompletions}
                  focusTimer={focusTimer}
                  accessibility={accessibility}
                  annotationOverview={annotationOverview}
                  statusCard={readingStatusCard}
                  chapterActions={chapterReadingActions}
                  snapshots={activeReadingSnapshots}
                  activeSessionMinutes={activeSessionMinutes}
                  onAddHighlight={() => handleAddReaderMark('highlight')}
                  onAddExcerpt={() => handleAddReaderMark('excerpt')}
                  onAddReadLater={handleAddReadLater}
                  onOpenReadLater={handleOpenReadLater}
                  onUpdateReadLaterStatus={handleUpdateReadLaterStatus}
                  onResume={handleResumeReading}
                  onApplyPreset={handleApplyReadingPreset}
                  onJumpToLandmark={handleJumpToReadingLandmark}
                  onJumpToMark={handleJumpToReaderMark}
                  onSetLayoutMode={handleSetReadingLayoutMode}
                  onRemoveMark={handleRemoveReaderMark}
                  onExportAnnotations={handleExportAnnotations}
                  onUpdateMarkMetadata={handleUpdateReaderMarkMetadata}
                  onToggleChapterCompletion={handleToggleChapterCompletion}
                  onStartFocusTimer={handleStartFocusTimer}
                  onStopFocusTimer={handleStopFocusTimer}
                  onOpenMediaGallery={handleOpenMediaGallery}
                  onSyncComparison={handleSyncComparison}
                  onUpdateAccessibility={handleUpdateAccessibility}
                  onOpenAnnotation={handleOpenAnnotation}
                  onOpenChapter={handleOpenChapterAction}
                  onCreateSnapshot={handleCreateReadingSnapshot}
                  onRestoreSnapshot={handleRestoreReadingSnapshot}
                  onClose={() => closePanel('readingTools')}
                />
              </Suspense>
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
              onOpenWorkspaces={() => {
                closePanel('recent')
                openPanel('workspaces')
              }}
              onOpenReadingTimeline={() => {
                closePanel('recent')
                openPanel('readingTimeline')
              }}
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
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ExportPanel
                isOpen={showExportPanel}
                onClose={() => closePanel('exportPanel')}
                fileName={activeTab?.name || ''}
                fileContent={activeTab?.content || ''}
                filePath={activeTab?.filePath}
                theme={theme}
                accentColor={accentColor}
              />
            </Suspense>
          )}
          {showIndexDiagnostics && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <IndexDiagnosticsPanel
                folderPath={currentFolderPath}
                skippedItems={indexSkippedItems}
                isIndexing={isIndexing}
                policy={indexPolicy}
                settings={indexSettings}
                indexedFileCount={indexedFileCount}
                updatedAt={indexDiagnosticsUpdatedAt}
                onReindex={() => rebuildFolderIndex()}
                onClear={() => {
                  setIndexSkippedItems([])
                  setIndexDiagnosticsUpdatedAt(null)
                  if (currentFolderPath) {
                    clearSavedIndexDiagnostics(currentFolderPath)
                  }
                }}
                onSaveSettings={settings => {
                  const saved = saveIndexSettings(settings)
                  setIndexSettings(saved)
                  showToast('索引设置已保存，重新扫描后生效')
                }}
                onSaveSettingsAndReindex={settings => {
                  const saved = saveIndexSettings(settings)
                  const savedPolicy = getEffectiveIndexPolicy(saved)
                  setIndexSettings(saved)
                  showToast('索引设置已保存，开始重新扫描')
                  void rebuildFolderIndex(currentFolderPath, { silent: true, policy: savedPolicy }).catch(error => {
                    console.error('Failed to rebuild index after settings save:', error)
                    showToast(`索引失败：${String(error)}`, 'error')
                  })
                }}
                onResetSettings={() => {
                  const defaults = resetIndexSettings()
                  setIndexSettings(defaults)
                  showToast('索引设置已恢复默认')
                }}
                onClose={() => closePanel('indexDiagnostics')}
              />
            </Suspense>
          )}
          {showWorkspaces && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <WorkspacePanel
                workspaces={workspaces}
                currentFolderPath={currentFolderPath}
                currentFolderName={currentFolderName}
                workspaceIndexCounts={workspaceIndexCounts}
                isIndexing={isIndexing}
                onSaveCurrent={handleSaveWorkspace}
                onOpenWorkspace={handleOpenWorkspace}
                onRemoveWorkspace={handleRemoveWorkspace}
                onTogglePinned={handleToggleWorkspacePinned}
                onRenameWorkspace={handleRenameWorkspace}
                onCleanInvalidWorkspaces={handleCleanInvalidWorkspaces}
                onOpenGlobalSearch={() => {
                  closePanel('workspaces')
                  openPanel('globalSearch')
                }}
                onOpenReadingTimeline={() => {
                  closePanel('workspaces')
                  openPanel('readingTimeline')
                }}
                onClose={() => closePanel('workspaces')}
              />
            </Suspense>
          )}
          {showReadingTimeline && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ReadingTimelinePanel
                items={readingHistory}
                onOpenFile={openFileAtLine}
                onClose={() => closePanel('readingTimeline')}
              />
            </Suspense>
          )}
          {showReadingMediaPanel && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ReadingMediaPanel
                items={readingMediaItems}
                activeId={activeReadingMediaId}
                onJumpToLine={handleJumpToReadingMediaLine}
                onCopy={handleCopyReadingMedia}
                onClose={() => setShowReadingMediaPanel(false)}
              />
            </Suspense>
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
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <GlobalSearch
                isOpen={showGlobalSearch}
                onClose={() => closePanel('globalSearch')}
                folderPath={currentFolderPath}
                onOpenFile={handleGlobalSearchOpenFile}
                onReindex={() => rebuildFolderIndex()}
                isIndexing={isIndexing}
                indexProgress={indexProgress}
                onCancelIndex={cancelFolderIndex}
              />
            </Suspense>
          )}
          {changedFilePath && (
            <div className={styles.fileChangeBanner}>
              <span className={styles.fileChangeBannerIcon}>📄</span>
              <div>
                <div className={styles.fileChangeBannerTitle}>{t('app.fileChangedTitle')}</div>
                <div className={styles.fileChangeBannerPath} title={changedFilePath}>
                  {basename(changedFilePath)}
                </div>
              </div>
              <div className={styles.fileChangeBannerActions}>
                <button
                  onClick={handleReloadChangedFile}
                  className={styles.fileChangeBannerBtnPrimary}
                >
                  {t('app.reload')}
                </button>
                <button
                  onClick={ignoreChange}
                  className={styles.fileChangeBannerBtnSecondary}
                >
                  {t('app.ignore')}
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
            case 'open-example':
              handleFileOpen(EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME)
              break
            case 'new-tab':
              newTab()
              break
            case 'close-tab':
              if (activeTabId) closeTab(activeTabId)
              break
            case 'toggle-source': {
              toggleSourceView()
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
              zoomIn()
              break
            }
            case 'zoom-out': {
              zoomOut()
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
            case 'quick-jump':
              openPanel('quickJump')
              break
            case 'file-info':
              openPanel('fileInfo')
              break
            case 'global-search':
              openPanel('globalSearch')
              break
            case 'index-diagnostics':
              openPanel('indexDiagnostics')
              break
            case 'workspaces':
              openPanel('workspaces')
              break
            case 'reading-timeline':
              openPanel('readingTimeline')
              break
            case 'reading-tools':
              openPanel('readingTools')
              break
            case 'export-reading-backup':
              exportReadingDataBackup()
              break
            case 'import-reading-backup':
              importReadingDataBackup()
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
