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
import { SidebarFileExplorer } from './components/SidebarFileExplorer'
import { ElectronFolderExplorer } from './components/ElectronFolderExplorer'
import { FileInfoPanel } from './components/FileInfoPanel'
import { FilePreviewPanel } from './components/FilePreviewPanel'
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
import { getStorageItem, setStorageItem, getSessionItem, setSessionItem } from './utils/storage'
import { ErrorBoundary } from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { Skeleton } from './components/Skeleton'

const ExportPanel = React.lazy(() => import('./components/ExportPanel').then(m => ({ default: m.ExportPanel })))
const GlobalSearch = React.lazy(() => import('./components/GlobalSearch').then(m => ({ default: m.GlobalSearch })))
const DocumentHealthPanel = React.lazy(() => import('./components/DocumentHealthPanel').then(m => ({ default: m.DocumentHealthPanel })))
const KnowledgeHealthPanel = React.lazy(() => import('./components/KnowledgeHealthPanel').then(m => ({ default: m.KnowledgeHealthPanel })))
const ImageInventoryPanel = React.lazy(() => import('./components/ImageInventoryPanel').then(m => ({ default: m.ImageInventoryPanel })))
const BacklinksPanel = React.lazy(() => import('./components/BacklinksPanel').then(m => ({ default: m.BacklinksPanel })))
const MarkdownGraphPanel = React.lazy(() => import('./components/MarkdownGraphPanel').then(m => ({ default: m.MarkdownGraphPanel })))
const MissingLinksPanel = React.lazy(() => import('./components/MissingLinksPanel').then(m => ({ default: m.MissingLinksPanel })))
const IndexDiagnosticsPanel = React.lazy(() => import('./components/IndexDiagnosticsPanel').then(m => ({ default: m.IndexDiagnosticsPanel })))
const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel').then(m => ({ default: m.WorkspacePanel })))
const ReadingTimelinePanel = React.lazy(() => import('./components/ReadingTimelinePanel').then(m => ({ default: m.ReadingTimelinePanel })))

import { UpdateNotification } from './components/UpdateNotification'
import { indexFolder, getAllMarkdownFiles, getIndexedFiles, getIndexedFileCount, FileIndex, IndexProgress, IndexSkippedItem } from './utils/searchIndex'
import { useUIStore, useTabStore, useFileStore, useToastStore } from './stores'
import { EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME } from './data/exampleMarkdown'
import { buildWikiGraph, findBacklinks, findMissingWikiLinks, resolveWikiTargetFile } from './utils/wikiGraph'
import { analyzeDocumentHealth } from './utils/documentHealth'
import { analyzeMarkdownImages } from './utils/imageInventory'
import { buildKnowledgeHealthReport, formatKnowledgeHealthMarkdown, KnowledgeHealthCard } from './utils/knowledgeHealth'
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

const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'
const SEARCH_HISTORY_KEY = 'search-history'
const HAS_SEEN_INSPECTION_TOOLS_KEY = 'has-seen-inspection-tools'
const MAX_INDEX_FILE_SIZE = 50 * 1024 * 1024

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

function markdownFileNameForTarget(target: string): string {
  const withoutAnchor = target.trim().split('#')[0].replace(/^\.?\//, '')
  if (!withoutAnchor) return 'Untitled.md'
  if (/\.(md|markdown)$/i.test(withoutAnchor)) return withoutAnchor
  return `${withoutAnchor}.md`
}

function AppInner() {
  const { t } = useTranslation()
  const { theme, accentColor, toggleTheme } = useTheme()

  // ── Stores ──
  const {
    showOutline, showSearch, showSource, showRecent, showKeyboardShortcuts,
    showFocusMode, showQuickSwitcher, showFileSidebar, showFileInfo, showFilePreview,
    showExportPanel, showCommandPalette, showGlobalSearch, showQuickJump,
    showDocumentHealth, showKnowledgeHealth, showImageInventory, showBacklinks, showMarkdownGraph, showMissingLinks, showIndexDiagnostics, showWorkspaces, showReadingTimeline,
    fontSize, isSplitView, secondaryTabId,
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
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [indexedFiles, setIndexedFiles] = useState<FileIndex[]>([])
  const [indexedFileCount, setIndexedFileCount] = useState(0)
  const [workspaceIndexCounts, setWorkspaceIndexCounts] = useState<Record<string, number>>({})
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null)
  const [indexSkippedItems, setIndexSkippedItems] = useState<IndexSkippedItem[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => getWorkspaces())
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => getReadingHistory())
  const [focusedMissingTarget, setFocusedMissingTarget] = useState<string | null>(null)
  const hasRestoredLastFolderRef = useRef(false)
  const indexAbortControllerRef = useRef<AbortController | null>(null)

  // ── Hooks ──
  const scrollHistory = useScrollHistory()
  const markdownRef = useRef<MarkdownRendererRef>(null)
  const mainRef = useRef<HTMLElement>(null)

  const { settings: fileSettings, updateSetting: updateFileSetting } = useFileSettings(activeTab?.filePath)
  const { recentFiles, loadRecentFiles, removeRecentFile, clearRecentFiles } = useRecentFiles()
  const wikiGraph = useMemo(() => buildWikiGraph(indexedFiles), [indexedFiles])
  const backlinks = useMemo(() => (
    activeTab?.filePath ? findBacklinks(indexedFiles, activeTab.filePath, activeTab.name) : []
  ), [activeTab?.filePath, activeTab?.name, indexedFiles])
  const missingLinks = useMemo(() => findMissingWikiLinks(indexedFiles), [indexedFiles])
  const activeDocumentHealth = useMemo(
    () => analyzeDocumentHealth(activeTab?.content || '', activeTab?.filePath),
    [activeTab?.content, activeTab?.filePath],
  )
  const activeImageInventory = useMemo(
    () => analyzeMarkdownImages(activeTab?.content || '', activeTab?.filePath),
    [activeTab?.content, activeTab?.filePath],
  )
  const knowledgeHealthReport = useMemo(() => buildKnowledgeHealthReport({
    indexedFileCount: indexedFiles.length,
    missingLinks,
    orphanNodeCount: wikiGraph.orphanNodes.length,
    documentIssueCount: activeDocumentHealth.summary.totalIssues,
    documentErrorCount: activeDocumentHealth.summary.errors,
    imageWarningCount: activeImageInventory.filter(image => image.warnings.length > 0).length,
    unresolvedImageCount: activeImageInventory.filter(image => image.type === 'local-relative' && !image.resolvedPath).length,
  }), [activeDocumentHealth.summary.errors, activeDocumentHealth.summary.totalIssues, activeImageInventory, indexedFiles.length, missingLinks, wikiGraph.orphanNodes.length])

  // ── Effects ──

  // Restore session on mount
  useEffect(() => {
    useTabStore.getState().restoreSession()
  }, [])

  useEffect(() => {
    if (getStorageItem(HAS_SEEN_INSPECTION_TOOLS_KEY)) return
    showToast('新增工具：文档健康检查、图片检查面板，外部链接会用系统浏览器打开')
    setStorageItem(HAS_SEEN_INSPECTION_TOOLS_KEY, 'true')
  }, [showToast])

  const refreshIndexedFiles = useCallback(async (folderPath: string | null) => {
    if (!folderPath) {
      setIndexedFiles([])
      setIndexedFileCount(0)
      return
    }
    try {
      const [files, count] = await Promise.all([
        getIndexedFiles(folderPath),
        getIndexedFileCount(folderPath),
      ])
      setIndexedFiles(files)
      setIndexedFileCount(count)
      setWorkspaceIndexCounts(prev => ({ ...prev, [folderPath]: count }))
    } catch (error) {
      console.error('Failed to load indexed files:', error)
      setIndexedFiles([])
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
    options: { silent?: boolean } = {}
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
      const handleProgress = (progress: IndexProgress) => setIndexProgress(progress)
      const skippedItems: IndexSkippedItem[] = []
      setIndexSkippedItems([])
      const allFiles = await getAllMarkdownFiles(folderPath, {
        signal: controller.signal,
        onProgress: handleProgress,
        onSkip: item => {
          skippedItems.push(item)
          setIndexSkippedItems([...skippedItems])
        },
        maxFileSizeBytes: MAX_INDEX_FILE_SIZE,
      })
      await indexFolder(folderPath, allFiles, {
        signal: controller.signal,
        onProgress: handleProgress,
        onSkip: item => {
          skippedItems.push(item)
          setIndexSkippedItems([...skippedItems])
        },
        initialSkippedItems: skippedItems,
      })
      setIndexSkippedItems([...skippedItems])
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
  }, [currentFolderPath, refreshIndexedFiles, showToast])

  const cancelFolderIndex = useCallback(() => {
    indexAbortControllerRef.current?.abort()
  }, [])

  const scheduleFolderIndex = useCallback((folderPath: string) => {
    void rebuildFolderIndex(folderPath, { silent: true }).catch(error => {
      console.error('Background folder indexing failed:', error)
    })
  }, [rebuildFolderIndex])

  useEffect(() => {
    void refreshIndexedFiles(currentFolderPath)
  }, [currentFolderPath, refreshIndexedFiles])

  useEffect(() => {
    void refreshWorkspaceIndexCounts()
  }, [refreshWorkspaceIndexCounts])

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
    scheduleFolderIndex(folderPath)

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
  }, [closeAllTabs, closePanel, openFileAtLine, openPanel, saveCurrentWorkspaceSession, scheduleFolderIndex, setFolder, showToast, t])

  const handleSaveWorkspace = useCallback(() => {
    if (!currentFolderPath) return
    saveCurrentWorkspaceSession()
    showToast('工作区已保存')
  }, [currentFolderPath, saveCurrentWorkspaceSession, showToast])

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

  const handleCreateMissingLink = useCallback(async (target: string) => {
    if (!window.electronAPI || !currentFolderPath) {
      showToast('请先打开一个文件夹', 'error')
      return
    }
    const relativeName = markdownFileNameForTarget(target)
    const filePath = join(currentFolderPath, relativeName)
    const title = basename(relativeName).replace(/\.(md|markdown)$/i, '') || target
    const result = await window.electronAPI.writeFile(filePath, `# ${title}\n\n`)
    if (!result.success) {
      showToast(result.error || '创建文档失败', 'error')
      return
    }
    await openFileAtLine(filePath)
    scheduleFolderIndex(currentFolderPath)
    closePanel('missingLinks')
    setFocusedMissingTarget(null)
    showToast(`已创建 ${basename(filePath)}`)
  }, [closePanel, currentFolderPath, openFileAtLine, scheduleFolderIndex, showToast])

  const handleOpenMissingLinkFromGraph = useCallback((target: string) => {
    setFocusedMissingTarget(target)
    openPanel('missingLinks')
  }, [openPanel])

  const handleOpenKnowledgeHealthDetail = useCallback((detail: KnowledgeHealthCard['id']) => {
    closePanel('knowledgeHealth')
    if (detail === 'missing-links') openPanel('missingLinks')
    if (detail === 'orphan-docs') openPanel('markdownGraph')
    if (detail === 'document-issues') openPanel('documentHealth')
    if (detail === 'image-warnings') openPanel('imageInventory')
  }, [closePanel, openPanel])

  const handleOpenFirstKnowledgeIssue = useCallback(() => {
    const firstCard = knowledgeHealthReport.cards.find(card => card.value > 0 && card.severity !== 'good')
    if (firstCard) {
      handleOpenKnowledgeHealthDetail(firstCard.id)
      return
    }
    showToast('没有需要定位的问题')
  }, [handleOpenKnowledgeHealthDetail, knowledgeHealthReport.cards, showToast])

  const handleCopyKnowledgeHealthReport = useCallback(() => {
    void navigator.clipboard?.writeText(formatKnowledgeHealthMarkdown(knowledgeHealthReport))
    showToast('健康报告已复制')
  }, [knowledgeHealthReport, showToast])

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
        scheduleFolderIndex(folderPath)
      } else {
        showToast(fileResult.error || t('app.readFileFailed'), 'error')
      }
    } catch (err) {
      console.error('[handleOpenFolder] error:', err)
      showToast(t('app.openFolderFailedWithError', { error: String(err) }), 'error')
    }
  }, [handleFileOpen, setFolder, openPanel, scheduleFolderIndex, showToast, t])

  useEffect(() => {
    if (!window.electronAPI || isRestoringSession || hasRestoredLastFolderRef.current) return
    hasRestoredLastFolderRef.current = true

    const restoreLastFolder = async () => {
      const folderPath = await window.electronAPI?.getLastFolder()
      if (!folderPath) return

      const result = await window.electronAPI?.readFolder(folderPath)
      if (!result?.success || !result.files || result.files.length === 0) return

      setFolder(folderPath, basename(folderPath) || folderPath)
      openPanel('fileSidebar')
      scheduleFolderIndex(folderPath)

      const hasRestoredFile = tabs.some(tab => tab.filePath?.startsWith(folderPath))
      if (!hasRestoredFile) {
        const firstFile = result.files.find(file => !file.isDirectory)
        if (firstFile) {
          await openFileAtLine(firstFile.filePath)
        }
      }
    }

    void restoreLastFolder()
  }, [isRestoringSession, openFileAtLine, openPanel, scheduleFolderIndex, setFolder, tabs])

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

  const handleJumpToLine = useCallback((line: number) => {
    closePanel('documentHealth')
    setShowSource(true)
    window.setTimeout(() => setHighlightedLine(line), 0)
  }, [closePanel, setHighlightedLine, setShowSource])

  // Wiki link click
  const handleWikiLinkClick = useCallback(async (target: string, altTarget?: string) => {
    if (!activeTab?.filePath || !window.electronAPI) {
      showToast(t('app.wikiLinkNoPath'), 'error')
      return
    }
    const indexedMatch = resolveWikiTargetFile(indexedFiles, target, altTarget)
    if (indexedMatch) {
      await openFileAtLine(indexedMatch.path)
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
  }, [activeTab?.filePath, handleFileOpen, indexedFiles, openFileAtLine, showToast, t])

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
      recordReadingHistory({
        filePath: activeTab.filePath || '',
        name: activeTab.name,
        progress,
        line: Math.max(1, Math.round(progress * lineCount)),
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
                <button
                  onClick={() => openPanel('globalSearch')}
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary}`}
                  aria-label={t('toolbar.globalSearch')} data-tooltip={t('toolbar.globalSearchTooltip')}
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
                  aria-label={t('toolbar.source')} data-tooltip={t('toolbar.sourceTooltip')}
                >
                  📄
                </button>
                <button
                  onClick={() => openPanel('exportPanel')}
                  className={styles.toolbarBtn}
                  aria-label={t('toolbar.export')} data-tooltip={t('toolbar.exportTooltip')}
                >
                  📤
                </button>
                <div className={styles.toolsMenu}>
                  <button
                    onClick={() => setShowToolsMenu(open => !open)}
                    className={`${styles.toolbarBtn} ${showKnowledgeHealth || showDocumentHealth || showImageInventory || showIndexDiagnostics ? styles.toolbarBtnActive : ''}`}
                    aria-label={t('toolbar.tools')}
                    aria-expanded={showToolsMenu}
                    data-tooltip={t('toolbar.toolsTooltip')}
                  >
                    🧰
                  </button>
                  {showToolsMenu && (
                    <div className={styles.toolsDropdown} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('knowledgeHealth')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>◉</span>
                        {t('toolbar.knowledgeHealth')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('documentHealth')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>✓</span>
                        {t('toolbar.documentHealth')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('imageInventory')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>▣</span>
                        {t('toolbar.imageInventory')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('backlinks')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>↩</span>
                        {t('toolbar.backlinks')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('markdownGraph')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>◎</span>
                        {t('toolbar.markdownGraph')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('missingLinks')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>⊕</span>
                        {t('toolbar.missingLinks')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('indexDiagnostics')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>!</span>
                        索引诊断
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('workspaces')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>▤</span>
                        {t('toolbar.workspaces')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('readingTimeline')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>◷</span>
                        {t('toolbar.readingTimeline')}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => togglePanel('focusMode')}
                  className={`${styles.toolbarBtn} ${showFocusMode ? styles.toolbarBtnActive : ''}`}
                  aria-label={t('toolbar.focusMode')} data-tooltip={t('toolbar.focusModeTooltip')}
                >
                  🎯
                </button>
                <div className={styles.fontSizeControls} data-guide="font-size">
                  <button
                    onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                    className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                    aria-label={t('toolbar.zoomOut')}
                  >
                    A-
                  </button>
                  <span className={styles.fontSizeDisplay}>
                    {fontSize}
                  </span>
                  <button
                    onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                    className={`${styles.toolbarBtn} ${styles.toolbarBtnSecondary} ${styles.toolbarBtnSmall}`}
                    aria-label={t('toolbar.zoomIn')}
                  >
                    A+
                  </button>
                </div>
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
              {!showFocusMode && !showSource && outlineItems.length >= 3 && (
                <FloatingTOC outlineItems={outlineItems} activeHeadingId={activeHeadingId} onNavigate={handleOutlineClick} />
              )}

              {isRestoringSession ? (
                <div style={{ padding: '20px' }}>
                  <Skeleton lines={20} />
                </div>
              ) : (
                <div key={`content-${activeTabId}`} className="tab-content">
                  {!showSource && isWelcomeTab && (
                    <WelcomeHome
                      recentFileCount={recentFiles.length}
                      readingHistoryCount={readingHistory.length}
                      indexedFileCount={indexedFileCount}
                      isIndexing={isIndexing}
                      indexProgress={indexProgress}
                      currentFolderName={currentFolderName}
                      currentFolderPath={currentFolderPath}
                      onOpenFolder={handleOpenFolder}
                      onOpenRecent={() => openPanel('recent')}
                      onOpenWorkspaces={() => openPanel('workspaces')}
                      onOpenReadingTimeline={() => openPanel('readingTimeline')}
                      onReindex={() => rebuildFolderIndex()}
                    />
                  )}
                  {showSource ? (
                    <SourceView content={activeTab?.content || ''} highlightedLine={highlightedLine} />
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
                        onWikiLinkClick={handleWikiLinkClick}
                      />
                    )
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
                      filePath={secondaryTab.filePath}
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
          {showKnowledgeHealth && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <KnowledgeHealthPanel
                report={knowledgeHealthReport}
                onOpenDetail={handleOpenKnowledgeHealthDetail}
                onOpenFirstIssue={handleOpenFirstKnowledgeIssue}
                onCopyReport={handleCopyKnowledgeHealthReport}
                onClose={() => closePanel('knowledgeHealth')}
              />
            </Suspense>
          )}
          {showDocumentHealth && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <DocumentHealthPanel
                content={activeTab?.content || ''}
                filePath={activeTab?.filePath}
                onIssueSelect={handleJumpToLine}
                onClose={() => closePanel('documentHealth')}
              />
            </Suspense>
          )}
          {showImageInventory && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ImageInventoryPanel
                content={activeTab?.content || ''}
                filePath={activeTab?.filePath}
                onClose={() => closePanel('imageInventory')}
              />
            </Suspense>
          )}
          {showBacklinks && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <BacklinksPanel
                backlinks={backlinks}
                filePath={activeTab?.filePath}
                onOpenFile={openFileAtLine}
                onClose={() => closePanel('backlinks')}
              />
            </Suspense>
          )}
          {showMarkdownGraph && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <MarkdownGraphPanel
                graph={wikiGraph}
                folderPath={currentFolderPath || undefined}
                onOpenFile={openFileAtLine}
                onReindex={() => rebuildFolderIndex()}
                isIndexing={isIndexing}
                indexProgress={indexProgress}
                onCancelIndex={cancelFolderIndex}
                onOpenMissingLink={handleOpenMissingLinkFromGraph}
                onClose={() => closePanel('markdownGraph')}
              />
            </Suspense>
          )}
          {showMissingLinks && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <MissingLinksPanel
                links={missingLinks}
                folderPath={currentFolderPath || undefined}
                focusedTarget={focusedMissingTarget}
                onCreateFile={handleCreateMissingLink}
                onOpenSource={openFileAtLine}
                onClose={() => {
                  setFocusedMissingTarget(null)
                  closePanel('missingLinks')
                }}
              />
            </Suspense>
          )}
          {showIndexDiagnostics && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <IndexDiagnosticsPanel
                folderPath={currentFolderPath}
                skippedItems={indexSkippedItems}
                isIndexing={isIndexing}
                onReindex={() => rebuildFolderIndex()}
                onClear={() => setIndexSkippedItems([])}
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
                onOpenKnowledgeHealth={() => {
                  closePanel('workspaces')
                  openPanel('knowledgeHealth')
                }}
                onOpenMarkdownGraph={() => {
                  closePanel('workspaces')
                  openPanel('markdownGraph')
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
            case 'quick-jump':
              openPanel('quickJump')
              break
            case 'file-info':
              openPanel('fileInfo')
              break
            case 'knowledge-health':
              openPanel('knowledgeHealth')
              break
            case 'document-health':
              openPanel('documentHealth')
              break
            case 'image-inventory':
              openPanel('imageInventory')
              break
            case 'global-search':
              openPanel('globalSearch')
              break
            case 'backlinks':
              openPanel('backlinks')
              break
            case 'markdown-graph':
              openPanel('markdownGraph')
              break
            case 'missing-links':
              openPanel('missingLinks')
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
