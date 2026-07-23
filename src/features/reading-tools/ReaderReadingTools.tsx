/**
 * ReaderReadingTools v2 —— 阅读工具面板容器（复用现有 ReadingToolsPanel）
 *
 * ReadingToolsPanel 是纯展示（68 个 props）。v2 容器用 useReadingSelectors
 * 取派生数据 + readingStore action 构造回调，传给现有组件。
 */
import { useCallback } from 'react'
import { ReadingToolsPanel } from '../../components/ReadingToolsPanel'
import { useReadingStore, useUIStore, useTabStore } from '../../state'
import { useReadingSelectors } from './useReadingSelectors'
import type {
  ReaderMark,
  ReadLaterItem,
  ReadLaterStatus,
  ReadingPreset,
  ReadingLandmark,
  ReadingLayoutMode,
  ReadingAccessibilitySettings,
  ReadingSnapshot,
  AnnotationOverviewItem,
  ChapterCompletion,
} from '../../utils/readingExperience'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ReaderReadingTools() {
  const isOpen = useUIStore((s) => s.panels.readingTools)
  const closePanel = useUIStore((s) => s.closePanel)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const setShowOutline = useUIStore((s) => s.setShowOutline)
  const fontSize = useUIStore((s) => s.fontSize)
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const filePath = activeTab?.filePath ?? ''

  const selectors = useReadingSelectors()

  const addReaderMark = useReadingStore((s) => s.addReaderMark)
  const removeReaderMark = useReadingStore((s) => s.removeReaderMark)
  const setReaderMarks = useReadingStore((s) => s.setReaderMarks)
  const addReadLaterItem = useReadingStore((s) => s.addReadLaterItem)
  const setLayoutMode = useReadingStore((s) => s.setLayoutMode)
  const toggleChapterCompletion = useReadingStore((s) => s.toggleChapterCompletion)
  const setFocusTimer = useReadingStore((s) => s.setFocusTimer)
  const setAccessibility = useReadingStore((s) => s.setAccessibility)
  const setActivePresetId = useReadingStore((s) => s.setActivePresetId)
  const addReadingSnapshot = useReadingStore((s) => s.addReadingSnapshot)
  const setSelectedReaderText = useReadingStore((s) => s.setSelectedReaderText)

  const handleAddHighlight = useCallback(() => {
    const text = selectors.selectedText.trim()
    if (text.length < 2) return
    addReaderMark({
      id: generateId('mark'),
      filePath,
      kind: 'highlight',
      text,
      color: 'yellow',
      createdAt: Date.now(),
    } as ReaderMark)
    setSelectedReaderText('')
  }, [selectors.selectedText, addReaderMark, filePath, setSelectedReaderText])

  const handleAddExcerpt = useCallback(() => {
    const text = selectors.selectedText.trim()
    if (!text) return
    addReaderMark({
      id: generateId('excerpt'),
      filePath,
      kind: 'excerpt',
      text,
      createdAt: Date.now(),
    } as ReaderMark)
    setSelectedReaderText('')
  }, [selectors.selectedText, addReaderMark, filePath, setSelectedReaderText])

  const handleAddReadLater = useCallback(() => {
    const now = Date.now()
    addReadLaterItem({
      id: generateId('rl'),
      filePath,
      fileName: selectors.fileName,
      status: 'unread',
      createdAt: now,
      updatedAt: now,
    } as ReadLaterItem)
  }, [addReadLaterItem, filePath, selectors.fileName])

  const handleApplyPreset = useCallback(
    (preset: ReadingPreset) => {
      setActivePresetId(preset.id)
      setFontSize(preset.fontSize)
      setShowOutline(preset.showOutline)
    },
    [setActivePresetId, setFontSize, setShowOutline]
  )

  const handleCreateSnapshot = useCallback(() => {
    const now = Date.now()
    addReadingSnapshot({
      id: generateId('snap'),
      filePath,
      fileName: selectors.fileName,
      progress: selectors.chapterProgress?.percent ?? 0,
      progressPercent: Math.round((selectors.chapterProgress?.percent ?? 0) * 100),
      scrollTop: 0,
      fontSize,
      theme: 'light',
      layoutMode: selectors.layoutMode,
      createdAt: now,
    } as ReadingSnapshot)
  }, [addReadingSnapshot, filePath, selectors.fileName, selectors.chapterProgress, selectors.layoutMode, fontSize])

  const handleExportAnnotations = useCallback(() => {
    const lines: string[] = [`# ${selectors.fileName} - 标注导出`, '']
    const highlights = selectors.marks.filter((m: ReaderMark) => m.kind === 'highlight')
    const excerpts = selectors.marks.filter((m: ReaderMark) => m.kind === 'excerpt')
    if (highlights.length > 0) {
      lines.push('## 高亮')
      highlights.forEach((m: ReaderMark) => lines.push(`- ${m.text}`))
      lines.push('')
    }
    if (excerpts.length > 0) {
      lines.push('## 摘录')
      excerpts.forEach((m: ReaderMark) => lines.push(`- ${m.text}`))
      lines.push('')
    }
    if (selectors.chapterCompletions.length > 0) {
      lines.push('## 已完成章节')
      selectors.chapterCompletions.forEach((c: ChapterCompletion) => lines.push(`- ${c.heading}`))
    }
    void navigator.clipboard.writeText(lines.join('\n'))
  }, [selectors])

  const handleUpdateReadLaterStatus = useCallback((id: string, status: ReadLaterStatus) => {
    useReadingStore.setState((state) => ({
      readLaterItems: state.readLaterItems.map((it: ReadLaterItem) =>
        it.id === id ? { ...it, status, updatedAt: Date.now() } : it
      ),
    }))
  }, [])

  if (!isOpen) return null

  return (
    <ReadingToolsPanel
      {...selectors}
      onAddHighlight={handleAddHighlight}
      onAddExcerpt={handleAddExcerpt}
      onAddReadLater={handleAddReadLater}
      onOpenReadLater={(_item: ReadLaterItem) => { /* 阶段后续 */ }}
      onUpdateReadLaterStatus={handleUpdateReadLaterStatus}
      onResume={() => { /* 阶段后续 */ }}
      onApplyPreset={handleApplyPreset}
      onJumpToLandmark={(_l: ReadingLandmark) => { /* 阶段后续 */ }}
      onJumpToMark={(_m: ReaderMark) => { /* 阶段后续 */ }}
      onSetLayoutMode={(mode: ReadingLayoutMode) => setLayoutMode(mode)}
      onRemoveMark={removeReaderMark}
      onExportAnnotations={handleExportAnnotations}
      onUpdateMarkMetadata={(id, metadata) => {
        setReaderMarks(
          useReadingStore.getState().readerMarks.map((m: ReaderMark) =>
            m.id === id ? { ...m, ...metadata } : m
          )
        )
      }}
      onToggleChapterCompletion={() => {
        const cp = selectors.chapterProgress
        if (cp) toggleChapterCompletion(filePath, cp.currentHeading, cp.lineStart)
      }}
      onStartFocusTimer={(minutes: number) => {
        setFocusTimer({
          minutes,
          startedAt: Date.now(),
          endsAt: Date.now() + minutes * 60000,
        })
      }}
      onStopFocusTimer={() => setFocusTimer(null)}
      onOpenMediaGallery={() => { /* 阶段后续 */ }}
      onSyncComparison={() => { /* 阶段后续 */ }}
      onUpdateAccessibility={(settings: Partial<ReadingAccessibilitySettings>) =>
        setAccessibility({ ...useReadingStore.getState().accessibility, ...settings })
      }
      onOpenAnnotation={(_item: AnnotationOverviewItem) => { /* 阶段后续 */ }}
      onOpenChapter={(_chapter) => { /* 阶段后续 */ }}
      onCreateSnapshot={handleCreateSnapshot}
      onRestoreSnapshot={(_snapshot: ReadingSnapshot) => { /* 阶段后续 */ }}
      onClose={() => closePanel('readingTools')}
    />
  )
}
