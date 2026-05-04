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
import { getStorageItem, setStorageItem, removeStorageItem, getSessionItem, setSessionItem } from './utils/storage'
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
const ReadingToolsPanel = React.lazy(() => import('./components/ReadingToolsPanel').then(m => ({ default: m.ReadingToolsPanel })))
const ReadingMediaPanel = React.lazy(() => import('./components/ReadingMediaPanel').then(m => ({ default: m.ReadingMediaPanel })))
const MaintenanceQueuePanel = React.lazy(() => import('./components/MaintenanceQueuePanel').then(m => ({ default: m.MaintenanceQueuePanel })))
const ReleasePreflightPanel = React.lazy(() => import('./components/ReleasePreflightPanel').then(m => ({ default: m.ReleasePreflightPanel })))
const WorkspaceDashboardPanel = React.lazy(() => import('./components/WorkspaceDashboardPanel').then(m => ({ default: m.WorkspaceDashboardPanel })))
const ActionWorkbenchPanel = React.lazy(() => import('./components/ActionWorkbenchPanel').then(m => ({ default: m.ActionWorkbenchPanel })))

import { UpdateNotification } from './components/UpdateNotification'
import { indexFolder, getAllMarkdownFiles, getIndexedFiles, getIndexedFileCount, FileIndex, IndexProgress, IndexSkippedItem } from './utils/searchIndex'
import { useUIStore, useTabStore, useFileStore, useToastStore } from './stores'
import { EXAMPLE_MARKDOWN, EXAMPLE_MARKDOWN_NAME } from './data/exampleMarkdown'
import { buildWikiGraph, findBacklinks, findMissingWikiLinks, resolveWikiTargetFile, suggestMissingWikiLinkTargets } from './utils/wikiGraph'
import { analyzeDocumentHealth } from './utils/documentHealth'
import { analyzeMarkdownImages } from './utils/imageInventory'
import { buildKnowledgeHealthReport, formatKnowledgeHealthMarkdown, KnowledgeHealthCard } from './utils/knowledgeHealth'
import { buildMaintenanceTasks, formatMaintenanceTasksMarkdown, type MaintenanceTask } from './utils/maintenanceTasks'
import { buildReleasePreflightReport, formatReleasePreflightMarkdown } from './utils/releasePreflight'
import { buildExecutableFixSuggestions, buildImageAssetPlan, buildLinkRenamePreview, buildReadingAssistant, buildReleasePackageChecks, buildWorkspaceDashboard, type DashboardSection, type ExecutableFixSuggestion } from './utils/workspaceEnhancements'
import {
  applyImageLocalizationReplacements,
  applyRenamePlanToContent,
  buildArchiveReport,
  buildDocumentTemplates,
  buildImageLocalizationPlan,
  buildRenamePlan,
  findUnlinkedMentions,
  renderDocumentTemplate,
  renderTemplateFileName,
  type DocumentTemplate,
  type UnlinkedMention,
} from './utils/workspaceActions'
import {
  buildBatchMovePlan,
  buildImageAssetAudit,
  buildOperationPreview,
  buildReleaseAutomationPlan,
  buildStaticSiteExportPlan,
  buildWorkspaceHome,
  createOperationSnapshot,
  formatOperationPreviewMarkdown,
  type OperationSnapshot,
} from './utils/safetyAutomation'
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
const HAS_SEEN_INSPECTION_TOOLS_KEY = 'has-seen-inspection-tools'
const PACKAGE_HISTORY_KEY = 'package-history'
const OPERATION_SNAPSHOTS_KEY = 'operation-snapshots'
const RELEASE_AUTOMATION_VERSION = '1.5.6'
const READER_MARKS_KEY = 'reader-marks'
const READER_QUEUE_KEY = 'reader-queue'
const READER_PRESET_KEY = 'reader-preset'
const READER_LAYOUT_KEY = 'reader-layout'
const READER_SESSIONS_KEY = 'reader-sessions'
const READER_CHAPTERS_KEY = 'reader-chapters'
const READER_ACCESSIBILITY_KEY = 'reader-accessibility'
const READER_FOCUS_TIMER_KEY = 'reader-focus-timer'
const READER_SNAPSHOTS_KEY = 'reader-snapshots'

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

function loadOperationSnapshots(): OperationSnapshot[] {
  try {
    const stored = getStorageItem(OPERATION_SNAPSHOTS_KEY, '[]')
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveOperationSnapshot(snapshot: OperationSnapshot): void {
  const snapshots = [snapshot, ...loadOperationSnapshots()].slice(0, 8)
  setStorageItem(OPERATION_SNAPSHOTS_KEY, JSON.stringify(snapshots))
}

function replaceOperationSnapshots(snapshots: OperationSnapshot[]): void {
  setStorageItem(OPERATION_SNAPSHOTS_KEY, JSON.stringify(snapshots.slice(0, 8)))
}

function formatStaticSitePlanMarkdown(outputDir: string, pages: Array<{ sourcePath: string; outputPath: string; title: string }>): string {
  return [
    '# 静态站点导出计划',
    '',
    `- 输出目录：${outputDir}`,
    `- 页面数量：${pages.length}`,
    '',
    ...pages.slice(0, 80).map(page => `- ${page.title}: ${page.sourcePath} -> ${page.outputPath}`),
  ].join('\n')
}

function formatBatchMovePlanMarkdown(targetDir: string, operations: Array<{ from: string; to: string }>, affectedLinks: number): string {
  return [
    '# 批量移动/重命名计划',
    '',
    `- 目标目录：${targetDir}`,
    `- 文件数量：${operations.length}`,
    `- 需关注链接：${affectedLinks}`,
    '',
    ...operations.slice(0, 80).map(operation => `- ${operation.from} -> ${operation.to}`),
  ].join('\n')
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

function markdownFileNameForTarget(target: string): string {
  const withoutAnchor = target.trim().split('#')[0].replace(/^\.?\//, '')
  if (!withoutAnchor) return 'Untitled.md'
  if (/\.(md|markdown)$/i.test(withoutAnchor)) return withoutAnchor
  return `${withoutAnchor}.md`
}

function AppInner() {
  const { t } = useTranslation()
  const { theme, accentColor, toggleTheme, setTheme } = useTheme()

  // ── Stores ──
  const {
    showOutline, showSearch, showSource, showRecent, showKeyboardShortcuts,
    showFocusMode, showQuickSwitcher, showFileSidebar, showFileInfo, showFilePreview,
    showExportPanel, showCommandPalette, showGlobalSearch, showQuickJump,
    showDocumentHealth, showKnowledgeHealth, showImageInventory, showBacklinks, showMarkdownGraph, showMissingLinks, showIndexDiagnostics, showWorkspaces, showReadingTimeline, showReadingTools, showMaintenanceQueue, showReleasePreflight, showWorkspaceDashboard, showActionWorkbench,
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
  const [focusedMissingTarget, setFocusedMissingTarget] = useState<string | null>(null)
  const hasRestoredLastFolderRef = useRef(false)
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
  const wikiGraph = useMemo(() => buildWikiGraph(indexedFiles), [indexedFiles])
  const backlinks = useMemo(() => (
    activeTab?.filePath ? findBacklinks(indexedFiles, activeTab.filePath, activeTab.name) : []
  ), [activeTab?.filePath, activeTab?.name, indexedFiles])
  const missingLinks = useMemo(() => findMissingWikiLinks(indexedFiles), [indexedFiles])
  const missingLinkSuggestions = useMemo(() => Object.fromEntries(
    missingLinks.map(link => [link.normalizedTarget, suggestMissingWikiLinkTargets(indexedFiles, link.target)])
  ), [indexedFiles, missingLinks])
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
    indexSkippedCount: indexSkippedItems.length,
  }), [activeDocumentHealth.summary.errors, activeDocumentHealth.summary.totalIssues, activeImageInventory, indexSkippedItems.length, indexedFiles.length, missingLinks, wikiGraph.orphanNodes.length])
  const maintenanceTasks = useMemo(() => buildMaintenanceTasks({
    missingLinks,
    images: activeImageInventory,
    indexSkippedItems,
    documentIssues: activeDocumentHealth.issues,
  }), [activeDocumentHealth.issues, activeImageInventory, indexSkippedItems, missingLinks])
  const executableFixes = useMemo(() => buildExecutableFixSuggestions(maintenanceTasks), [maintenanceTasks])
  const releasePreflightReport = useMemo(() => buildReleasePreflightReport({
    healthScore: knowledgeHealthReport.score,
    healthStatus: knowledgeHealthReport.status,
    maintenanceTaskCount: maintenanceTasks.length,
    maintenanceErrorCount: maintenanceTasks.filter(task => task.severity === 'error').length,
    indexedFileCount,
    indexSkippedCount: indexSkippedItems.length,
  }), [indexedFileCount, indexSkippedItems.length, knowledgeHealthReport.score, knowledgeHealthReport.status, maintenanceTasks])
  const imageAssetPlan = useMemo(() => buildImageAssetPlan(activeImageInventory), [activeImageInventory])
  const linkRenamePreview = useMemo(() => (
    activeTab?.filePath
      ? buildLinkRenamePreview(indexedFiles, activeTab.filePath, join(dirname(activeTab.filePath), `${basename(activeTab.filePath).replace(/\.(md|markdown)$/i, '')}-renamed.md`))
      : buildLinkRenamePreview(indexedFiles, 'Old.md', 'New.md')
  ), [activeTab?.filePath, indexedFiles])
  const documentTemplates = useMemo(() => buildDocumentTemplates(), [])
  const actionRenamePlan = useMemo(() => (
    activeTab?.filePath
      ? buildRenamePlan(indexedFiles, activeTab.filePath, join(dirname(activeTab.filePath), `${basename(activeTab.filePath).replace(/\.(md|markdown)$/i, '')}-renamed.md`))
      : buildRenamePlan(indexedFiles, 'Old.md', 'New.md')
  ), [activeTab?.filePath, indexedFiles])
  const imageLocalizationPlan = useMemo(() => (
    activeTab?.filePath ? buildImageLocalizationPlan(activeTab.filePath, activeImageInventory) : buildImageLocalizationPlan('Untitled.md', activeImageInventory)
  ), [activeImageInventory, activeTab?.filePath])
  const activeIndexedFile = useMemo(() => (
    activeTab?.filePath ? indexedFiles.find(file => file.path === activeTab.filePath) || { path: activeTab.filePath, name: activeTab.name, content: activeTab.content } : null
  ), [activeTab?.content, activeTab?.filePath, activeTab?.name, indexedFiles])
  const unlinkedMentions = useMemo(() => (
    activeIndexedFile ? findUnlinkedMentions(indexedFiles, activeIndexedFile) : []
  ), [activeIndexedFile, indexedFiles])
  const readingAssistant = useMemo(() => buildReadingAssistant({
    activeFilePath: activeTab?.filePath || null,
    activeFileName: activeTab?.name || '',
    readingHistory,
    readLaterCount: Number(getStorageItem('read-later-count', '0') || 0),
  }), [activeTab?.filePath, activeTab?.name, readingHistory])
  const releasePackageChecks = useMemo(() => buildReleasePackageChecks({
    preflightStatus: releasePreflightReport.status,
    version: '1.5.4',
    hasBuildOutput: true,
    packageHistoryCount: Number(getStorageItem(PACKAGE_HISTORY_KEY, '0') || 0),
  }), [releasePreflightReport.status])
  const workspaceDashboard = useMemo(() => buildWorkspaceDashboard({
    healthScore: knowledgeHealthReport.score,
    maintenanceTasks,
    imagePlan: imageAssetPlan,
    readingAssistant,
    releaseChecks: releasePackageChecks,
    linkRenamePreview,
  }), [imageAssetPlan, knowledgeHealthReport.score, linkRenamePreview, maintenanceTasks, readingAssistant, releasePackageChecks])
  const archiveReport = useMemo(() => buildArchiveReport({
    files: indexedFiles,
    healthScore: knowledgeHealthReport.score,
    maintenanceTaskCount: maintenanceTasks.length,
    remoteImageCount: imageAssetPlan.summary.remote,
    missingLinkCount: missingLinks.length,
  }), [imageAssetPlan.summary.remote, indexedFiles, knowledgeHealthReport.score, maintenanceTasks.length, missingLinks.length])
  const operationPreview = useMemo(() => buildOperationPreview({
    id: 'rename-links-preview',
    title: '重命名链接安全预览',
    changes: actionRenamePlan.changedFiles.map(file => {
      const indexedFile = indexedFiles.find(item => item.path === file.path)
      const before = indexedFile?.content || ''
      return {
        path: file.path,
        before,
        after: applyRenamePlanToContent(before, actionRenamePlan),
      }
    }).filter(change => change.before !== change.after),
  }), [actionRenamePlan, indexedFiles])
  const imageAudit = useMemo(() => buildImageAssetAudit({
    files: indexedFiles,
    imageFiles: activeImageInventory.map(image => image.resolvedPath).filter((path): path is string => Boolean(path)),
    duplicateGroups: [],
    remoteImageCount: imageAssetPlan.summary.remote,
  }), [activeImageInventory, imageAssetPlan.summary.remote, indexedFiles])
  const batchMovePlan = useMemo(() => buildBatchMovePlan(
    indexedFiles,
    currentFolderPath ? join(currentFolderPath, 'archive') : 'archive',
  ), [currentFolderPath, indexedFiles])
  const workspaceHomeCards = useMemo(() => buildWorkspaceHome({
    recentFileName: readingHistory[0]?.name || activeTab?.name || '未打开文件',
    healthScore: knowledgeHealthReport.score,
    taskCount: maintenanceTasks.length,
    modifiedCount: indexedFiles.length,
    unlinkedMentionCount: unlinkedMentions.length,
  }).cards, [activeTab?.name, indexedFiles.length, knowledgeHealthReport.score, maintenanceTasks.length, readingHistory, unlinkedMentions.length])
  const staticSitePlan = useMemo(() => buildStaticSiteExportPlan(
    indexedFiles,
    currentFolderPath ? join(currentFolderPath, 'site') : 'site',
  ), [currentFolderPath, indexedFiles])
  const releaseAutomationPlan = useMemo(() => buildReleaseAutomationPlan(
    RELEASE_AUTOMATION_VERSION,
    `docs/releases/v${RELEASE_AUTOMATION_VERSION}.md`,
  ), [])
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

  const scheduleFolderIndex = useCallback((folderPath: string) => {
    void rebuildFolderIndex(folderPath, { silent: true }).catch(error => {
      console.error('Background folder indexing failed:', error)
    })
  }, [rebuildFolderIndex])

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

  const handleCopyMaintenanceTasks = useCallback(() => {
    void navigator.clipboard?.writeText(formatMaintenanceTasksMarkdown(maintenanceTasks))
    showToast('待处理清单已复制')
  }, [maintenanceTasks, showToast])

  const handleCopyReleasePreflightReport = useCallback(() => {
    void navigator.clipboard?.writeText(formatReleasePreflightMarkdown(releasePreflightReport))
    showToast('发布前检查报告已复制')
  }, [releasePreflightReport, showToast])

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

  const handleOpenMaintenanceTask = useCallback((task: MaintenanceTask) => {
    closePanel('maintenanceQueue')
    if (task.kind === 'document-issue' && task.line) {
      handleJumpToLine(task.line)
      return
    }
    if (task.kind === 'missing-link') openPanel('missingLinks')
    if (task.kind === 'image-issue') openPanel('imageInventory')
    if (task.kind === 'index-skip') openPanel('indexDiagnostics')
  }, [closePanel, handleJumpToLine, openPanel])

  const handleOpenDashboardSection = useCallback((sectionId: DashboardSection['id']) => {
    closePanel('workspaceDashboard')
    if (sectionId === 'quality') openPanel('knowledgeHealth')
    if (sectionId === 'fixes') openPanel('actionWorkbench')
    if (sectionId === 'links') openPanel('actionWorkbench')
    if (sectionId === 'images') openPanel('actionWorkbench')
    if (sectionId === 'reading') openPanel('readingTimeline')
    if (sectionId === 'release') openPanel('releasePreflight')
  }, [closePanel, openPanel])

  const handleExecuteFix = useCallback((fix: ExecutableFixSuggestion) => {
    const task = maintenanceTasks.find(item => item.id === fix.taskId)
    if (fix.action === 'create-missing-doc') {
      const link = missingLinks.find(item => `missing-link:${item.normalizedTarget}` === fix.taskId)
      if (link) {
        void handleCreateMissingLink(link.target)
      } else {
        showToast('未找到对应缺失链接', 'error')
      }
      return
    }
    if (fix.action === 'localize-remote-image') {
      void handleLocalizeImages()
      return
    }
    if (task) {
      handleOpenMaintenanceTask(task)
      return
    }
    openPanel('maintenanceQueue')
  }, [handleCreateMissingLink, handleOpenMaintenanceTask, maintenanceTasks, missingLinks, openPanel, showToast])

  const handleApplyRenamePlan = useCallback(async () => {
    if (!window.electronAPI || actionRenamePlan.changedFiles.length === 0) {
      showToast('没有需要更新的链接')
      return
    }
    if (operationPreview.changes.length > 0) {
      saveOperationSnapshot(createOperationSnapshot(operationPreview))
    }
    let updated = 0
    for (const file of actionRenamePlan.changedFiles) {
      const result = await window.electronAPI.readFile(file.path)
      if (!result.success || result.content === undefined) continue
      const nextContent = applyRenamePlanToContent(result.content, actionRenamePlan)
      const write = await window.electronAPI.updateMarkdownFile(file.path, nextContent)
      if (write.success) {
        updateTabContent(file.path, nextContent, file.name)
        updated += 1
      }
    }
    if (currentFolderPath) scheduleFolderIndex(currentFolderPath)
    showToast(updated > 0 ? `已更新 ${updated} 个文件的链接` : '没有文件被更新')
  }, [actionRenamePlan, currentFolderPath, operationPreview, scheduleFolderIndex, showToast, updateTabContent])

  const handleLocalizeImages = useCallback(async () => {
    if (!window.electronAPI || !activeTab?.filePath || imageLocalizationPlan.items.length === 0) {
      showToast('当前文档没有可本地化的网络图片')
      return
    }
    let downloaded = 0
    for (const item of imageLocalizationPlan.items) {
      const result = await window.electronAPI.downloadRemoteImage(item.src, item.assetPath)
      if (result.success) downloaded += 1
    }
    if (downloaded === 0) {
      showToast('图片下载失败', 'error')
      return
    }
    const nextContent = applyImageLocalizationReplacements(activeTab.content, imageLocalizationPlan)
    const write = await window.electronAPI.updateMarkdownFile(activeTab.filePath, nextContent)
    if (!write.success) {
      showToast(write.error || '图片链接更新失败', 'error')
      return
    }
    updateTabContent(activeTab.filePath, nextContent, activeTab.name)
    if (currentFolderPath) scheduleFolderIndex(currentFolderPath)
    showToast(`已本地化 ${downloaded} 张图片`)
  }, [activeTab?.content, activeTab?.filePath, activeTab?.name, currentFolderPath, imageLocalizationPlan, scheduleFolderIndex, showToast, updateTabContent])

  const handleCreateFromTemplate = useCallback(async (template: DocumentTemplate) => {
    if (!window.electronAPI || !currentFolderPath) {
      showToast('请先打开一个文件夹', 'error')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const title = window.prompt('新文档标题', template.name) || template.name
    const context = { title, date: today, folderName: currentFolderName || basename(currentFolderPath) || currentFolderPath }
    const fileName = renderTemplateFileName(template, context)
    const filePath = join(currentFolderPath, fileName)
    const result = await window.electronAPI.writeFile(filePath, renderDocumentTemplate(template, context))
    if (!result.success) {
      showToast(result.error || '创建模板文档失败', 'error')
      return
    }
    await openFileAtLine(filePath)
    scheduleFolderIndex(currentFolderPath)
    showToast(`已创建 ${basename(filePath)}`)
  }, [currentFolderName, currentFolderPath, openFileAtLine, scheduleFolderIndex, showToast])

  const handleOpenUnlinkedMention = useCallback((mention: UnlinkedMention) => {
    void openFileAtLine(mention.targetPath)
  }, [openFileAtLine])

  const handleCopyArchiveReport = useCallback(() => {
    void navigator.clipboard?.writeText(archiveReport)
    showToast('归档报告已复制')
  }, [archiveReport, showToast])

  const handleCopyOperationPreview = useCallback(() => {
    void navigator.clipboard?.writeText(formatOperationPreviewMarkdown(operationPreview))
    showToast(operationPreview.changes.length > 0 ? 'diff 预览已复制' : '当前没有可预览的变更')
  }, [operationPreview, showToast])

  const handleUndoLastOperation = useCallback(async () => {
    if (!window.electronAPI) {
      showToast('当前环境不支持撤销写入', 'error')
      return
    }
    const [snapshot, ...rest] = loadOperationSnapshots()
    if (!snapshot) {
      showToast('没有可撤销的操作')
      return
    }
    let restored = 0
    for (const file of snapshot.files) {
      const result = await window.electronAPI.updateMarkdownFile(file.path, file.content)
      if (result.success) {
        updateTabContent(file.path, file.content, basename(file.path))
        restored += 1
      }
    }
    replaceOperationSnapshots(rest)
    if (currentFolderPath) scheduleFolderIndex(currentFolderPath)
    showToast(restored > 0 ? `已撤销 ${restored} 个文件` : '没有文件被撤销')
  }, [currentFolderPath, scheduleFolderIndex, showToast, updateTabContent])

  const handleCopyBatchMovePlan = useCallback(() => {
    void navigator.clipboard?.writeText(formatBatchMovePlanMarkdown(
      batchMovePlan.targetDir,
      batchMovePlan.operations,
      batchMovePlan.affectedLinks,
    ))
    showToast('批量整理计划已复制')
  }, [batchMovePlan, showToast])

  const handleCopyStaticSitePlan = useCallback(() => {
    void navigator.clipboard?.writeText(formatStaticSitePlanMarkdown(staticSitePlan.outputDir, staticSitePlan.pages))
    showToast('静态站点计划已复制')
  }, [showToast, staticSitePlan])

  const handleCopyReleaseCommands = useCallback(() => {
    void navigator.clipboard?.writeText(releaseAutomationPlan.commands.join('\n'))
    showToast('Release 命令已复制')
  }, [releaseAutomationPlan.commands, showToast])

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
                    className={`${styles.toolbarBtn} ${showKnowledgeHealth || showDocumentHealth || showImageInventory || showIndexDiagnostics || showReadingTools || showMaintenanceQueue || showReleasePreflight || showWorkspaceDashboard || showActionWorkbench ? styles.toolbarBtnActive : ''}`}
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
                          openPanel('workspaceDashboard')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>▦</span>
                        运营仪表盘
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('actionWorkbench')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>▧</span>
                        增强操作台
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
                          openPanel('maintenanceQueue')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>□</span>
                        待处理队列
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('releasePreflight')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>◇</span>
                        发布前检查
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
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          openPanel('readingTools')
                          setShowToolsMenu(false)
                        }}
                      >
                        <span>◫</span>
                        阅读工具
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
                    <SourceView
                      content={activeTab?.content || ''}
                      highlightedLine={highlightedLine}
                      editable={Boolean(activeTab?.filePath)}
                      onSave={saveSourceEdit}
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
                suggestions={missingLinkSuggestions}
                onCreateFile={handleCreateMissingLink}
                onOpenSource={openFileAtLine}
                onOpenSuggestion={path => openFileAtLine(path)}
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
          {showMaintenanceQueue && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <MaintenanceQueuePanel
                tasks={maintenanceTasks}
                onOpenTask={handleOpenMaintenanceTask}
                onCopyTasks={handleCopyMaintenanceTasks}
                onClose={() => closePanel('maintenanceQueue')}
              />
            </Suspense>
          )}
          {showReleasePreflight && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ReleasePreflightPanel
                report={releasePreflightReport}
                onOpenMaintenance={() => {
                  closePanel('releasePreflight')
                  openPanel('maintenanceQueue')
                }}
                onCopyReport={handleCopyReleasePreflightReport}
                onClose={() => closePanel('releasePreflight')}
              />
            </Suspense>
          )}
          {showWorkspaceDashboard && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <WorkspaceDashboardPanel
                dashboard={workspaceDashboard}
                onOpenSection={handleOpenDashboardSection}
                onClose={() => closePanel('workspaceDashboard')}
              />
            </Suspense>
          )}
          {showActionWorkbench && (
            <Suspense fallback={<div style={{ padding: 20 }}><Skeleton lines={6} /></div>}>
              <ActionWorkbenchPanel
                fixes={executableFixes}
                templates={documentTemplates}
                renamePlan={actionRenamePlan}
                imagePlan={imageLocalizationPlan}
                unlinkedMentions={unlinkedMentions}
                archiveReport={archiveReport}
                operationPreview={operationPreview}
                imageAudit={imageAudit}
                batchMovePlan={batchMovePlan}
                workspaceHomeCards={workspaceHomeCards}
                staticSitePlan={staticSitePlan}
                releasePlan={releaseAutomationPlan}
                onExecuteFix={handleExecuteFix}
                onApplyRename={handleApplyRenamePlan}
                onLocalizeImages={handleLocalizeImages}
                onCreateFromTemplate={handleCreateFromTemplate}
                onOpenMention={handleOpenUnlinkedMention}
                onCopyArchive={handleCopyArchiveReport}
                onCopyPreview={handleCopyOperationPreview}
                onUndoLast={handleUndoLastOperation}
                onCopyBatchMove={handleCopyBatchMovePlan}
                onCopyStaticSite={handleCopyStaticSitePlan}
                onCopyReleaseCommands={handleCopyReleaseCommands}
                onClose={() => closePanel('actionWorkbench')}
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
            case 'reading-tools':
              openPanel('readingTools')
              break
            case 'maintenance-queue':
              openPanel('maintenanceQueue')
              break
            case 'release-preflight':
              openPanel('releasePreflight')
              break
            case 'workspace-dashboard':
              openPanel('workspaceDashboard')
              break
            case 'action-workbench':
              openPanel('actionWorkbench')
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
