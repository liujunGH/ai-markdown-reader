/**
 * useReadingSelectors —— 阅读工具派生数据集中计算
 *
 * 取代旧 App.tsx 里散落的 15+ useMemo（325-378 行）。所有派生数据从
 * readingStore + DocumentCache（content）集中算出。
 *
 * 派生函数复用 readingExperience.ts 的纯 builder（行为与旧版一致）。
 */
import { useMemo } from 'react'
import { useReadingStore, useTabStore } from '../../state'
import { getContent } from '../../resources/DocumentCache'
import {
  getDefaultReadingPresets,
  buildReadingLandmarks,
  buildReadingStats,
  buildChapterProgress,
  buildAnnotationOverview,
  buildReadingStatusCard,
  buildResumePoint,
  type ReaderMark,
  type ChapterCompletion,
  type ReadLaterItem,
  type ReadingSnapshot,
  type ReadingSession,
  type FocusTimer,
  type ReadingAccessibilitySettings,
  type ReadingPreset,
  type ReadingLandmark,
  type ReadingStats,
  type ChapterProgress,
  type AnnotationOverview,
  type ReadingStatusCard,
  type ReadingResumePoint,
  type ReadingLayoutMode,
} from '../../utils/readingExperience'

export interface ReadingSelectors {
  presets: ReadingPreset[]
  activePresetId: ReadingPreset['id']
  marks: ReaderMark[]
  chapterCompletions: ChapterCompletion[]
  readLaterItems: ReadLaterItem[]
  snapshots: ReadingSnapshot[]
  resumePoint: ReadingResumePoint | null
  landmarks: ReadingLandmark[]
  annotationOverview: AnnotationOverview
  statusCard: ReadingStatusCard | null
  readingStats: ReadingStats
  chapterProgress: ChapterProgress | null
  activeSessionMinutes: number
  layoutMode: ReadingLayoutMode
  focusTimer: FocusTimer | null
  accessibility: ReadingAccessibilitySettings
  selectedText: string
  fileName: string
}

export function useReadingSelectors(): ReadingSelectors {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))

  const readerMarks = useReadingStore((s) => s.readerMarks)
  const chapterCompletions = useReadingStore((s) => s.chapterCompletions)
  const readLaterItems = useReadingStore((s) => s.readLaterItems)
  const snapshots = useReadingStore((s) => s.readingSnapshots)
  const sessions = useReadingStore((s) => s.readingSessions)
  const activeSessionMinutes = useReadingStore((s) => s.activeSessionMinutes)
  const currentReadingLine = useReadingStore((s) => s.currentReadingLine)
  const currentReadingProgress = useReadingStore((s) => s.currentReadingProgress)
  const layoutMode = useReadingStore((s) => s.layoutMode)
  const focusTimer = useReadingStore((s) => s.focusTimer)
  const accessibility = useReadingStore((s) => s.accessibility)
  const activePresetId = useReadingStore((s) => s.activePresetId)
  const selectedText = useReadingStore((s) => s.selectedReaderText)

  const filePath = activeTab?.filePath ?? ''
  const fileName = activeTab?.name ?? ''

  // content 从 DocumentCache 取（不在 tabStore）
  const content = useMemo(() => getContent(activeTabId) ?? '', [activeTabId])

  const presets = useMemo(() => getDefaultReadingPresets(), [])

  const marks = useMemo(
    () => readerMarks.filter((m: ReaderMark) => m.filePath === filePath),
    [readerMarks, filePath]
  )
  const activeChapterCompletions = useMemo(
    () => chapterCompletions.filter((c: ChapterCompletion) => c.filePath === filePath),
    [chapterCompletions, filePath]
  )
  const activeSnapshots = useMemo(
    () => snapshots.filter((s: ReadingSnapshot) => s.filePath === filePath),
    [snapshots, filePath]
  )

  const resumePoint = useMemo(
    () =>
      buildResumePoint({
        filePath,
        fileName,
        content,
        progress: currentReadingProgress,
        scrollTop: 0,
      }),
    [filePath, fileName, content, currentReadingProgress]
  )

  const landmarks = useMemo(() => buildReadingLandmarks(content), [content])
  const annotationOverview = useMemo(
    () => buildAnnotationOverview(marks, activeChapterCompletions),
    [marks, activeChapterCompletions]
  )

  const statusCard = useMemo(
    () =>
      buildReadingStatusCard({
        filePath,
        fileName,
        marks,
        chapterCompletions: activeChapterCompletions,
        progress: currentReadingProgress,
        historyUpdatedAt: Date.now(),
      }),
    [filePath, fileName, marks, activeChapterCompletions, currentReadingProgress]
  )

  const readingStats = useMemo(() => buildReadingStats(sessions as ReadingSession[]), [sessions])
  const chapterProgress = useMemo(
    () => buildChapterProgress(content, currentReadingLine),
    [content, currentReadingLine]
  )

  return {
    presets,
    activePresetId,
    marks,
    chapterCompletions: activeChapterCompletions,
    readLaterItems,
    snapshots: activeSnapshots,
    resumePoint,
    landmarks,
    annotationOverview,
    statusCard,
    readingStats,
    chapterProgress,
    activeSessionMinutes,
    layoutMode,
    focusTimer,
    accessibility,
    selectedText,
    fileName,
  }
}
