/**
 * 阅读状态 store（v2）
 *
 * 从 App.tsx 抽出 15 个散落的阅读 useState（marks/readLater/sessions/chapters/
 * snapshots/focusTimer/accessibility/preset/layout/progress 等）。
 *
 * 持久化：阶段 3 暂保留 localStorage（与旧版 setStorageItem 行为一致）。
 * 阶段 5 迁移到主进程 SQLite（reading_marks/sessions/chapters/snapshots/... 表），
 * 届时此 store 的 action 改为调 dbExec/dbQuery，本地状态只做缓存。
 *
 * 派生数据（activeReaderMarks/readingStats/chapterProgress 等）不放进 store，
 * 由消费方 useMemo 计算（与旧版 App.tsx 的 useMemo 模式一致），避免 store 过重。
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { produce } from 'immer'
import type {
  ReaderMark,
  ReadLaterItem,
  ReadingSession,
  ChapterCompletion,
  ReadingSnapshot,
  FocusTimer,
  ReadingAccessibilitySettings,
  ReadingPreset,
  ReadingLayoutMode,
} from '../../utils/readingExperience'

interface ReadingState {
  // 持久化到 localStorage 的阅读数据
  readerMarks: ReaderMark[]
  readLaterItems: ReadLaterItem[]
  readingSessions: ReadingSession[]
  chapterCompletions: ChapterCompletion[]
  readingSnapshots: ReadingSnapshot[]
  focusTimer: FocusTimer | null
  accessibility: ReadingAccessibilitySettings
  activePresetId: ReadingPreset['id']
  layoutMode: ReadingLayoutMode

  // 会话内状态（不持久化）
  currentReadingLine: number
  currentReadingProgress: number // 0-1
  activeSessionMinutes: number
  selectedReaderText: string
}

interface ReadingActions {
  setReaderMarks: (marks: ReaderMark[]) => void
  addReaderMark: (mark: ReaderMark) => void
  removeReaderMark: (id: string) => void
  setReadLaterItems: (items: ReadLaterItem[]) => void
  addReadLaterItem: (item: ReadLaterItem) => void
  setReadingSessions: (sessions: ReadingSession[]) => void
  addReadingSession: (session: ReadingSession) => void
  setChapterCompletions: (items: ChapterCompletion[]) => void
  toggleChapterCompletion: (filePath: string, heading: string, line: number) => void
  setReadingSnapshots: (items: ReadingSnapshot[]) => void
  addReadingSnapshot: (snapshot: ReadingSnapshot) => void
  setFocusTimer: (timer: FocusTimer | null) => void
  setAccessibility: (settings: ReadingAccessibilitySettings) => void
  setActivePresetId: (id: ReadingPreset['id']) => void
  setLayoutMode: (mode: ReadingLayoutMode) => void

  // 会话内状态 setter
  setCurrentReadingLine: (line: number) => void
  setCurrentReadingProgress: (progress: number) => void
  setActiveSessionMinutes: (minutes: number) => void
  setSelectedReaderText: (text: string) => void
}

export type ReadingStore = ReadingState & ReadingActions

/** 默认无障碍设置（与旧版 normalizeAccessibilitySettings 默认一致） */
const DEFAULT_ACCESSIBILITY: ReadingAccessibilitySettings = {
  lineHeight: 1.65,
  letterSpacing: 0,
  paragraphSpacing: 1,
  reduceMotion: false,
  ttsRate: 1,
  highContrastHighlights: false,
}

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set) => ({
  readerMarks: [],
  readLaterItems: [],
  readingSessions: [],
  chapterCompletions: [],
  readingSnapshots: [],
  focusTimer: null,
  accessibility: { ...DEFAULT_ACCESSIBILITY },
  activePresetId: 'default',
  layoutMode: 'single',

  currentReadingLine: 0,
  currentReadingProgress: 0,
  activeSessionMinutes: 0,
  selectedReaderText: '',

  setReaderMarks: (marks) => set({ readerMarks: marks }),
  addReaderMark: (mark) =>
    set(
      produce((state: ReadingState) => {
        state.readerMarks.unshift(mark)
      })
    ),
  removeReaderMark: (id) =>
    set(
      produce((state: ReadingState) => {
        state.readerMarks = state.readerMarks.filter((m) => m.id !== id)
      })
    ),

  setReadLaterItems: (items) => set({ readLaterItems: items }),
  addReadLaterItem: (item) =>
    set(
      produce((state: ReadingState) => {
        state.readLaterItems.unshift(item)
      })
    ),

  setReadingSessions: (sessions) => set({ readingSessions: sessions }),
  addReadingSession: (session) =>
    set(
      produce((state: ReadingState) => {
        state.readingSessions.unshift(session)
      })
    ),

  setChapterCompletions: (items) => set({ chapterCompletions: items }),
  toggleChapterCompletion: (filePath, heading, line) =>
    set(
      produce((state: ReadingState) => {
        // 确定性 id（稳定，跨会话幂等，与旧版 hashText 策略对齐）
        const id = `ch-${filePath}:${heading}:${line}`.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 120)
        const existing = state.chapterCompletions.find((c) => c.id === id)
        if (existing) {
          // 已存在：移除（取消完成）
          state.chapterCompletions = state.chapterCompletions.filter((c) => c.id !== id)
        } else {
          // 不存在：标记完成（completedAt 存在即表示完成）
          state.chapterCompletions.unshift({
            id,
            filePath,
            heading,
            line,
            completedAt: Date.now(),
          })
          // 上限 300，防膨胀（与旧版 readingExperience.ts 一致）
          if (state.chapterCompletions.length > 300) {
            state.chapterCompletions.length = 300
          }
        }
      })
    ),

  setReadingSnapshots: (items) => set({ readingSnapshots: items }),
  addReadingSnapshot: (snapshot) =>
    set(
      produce((state: ReadingState) => {
        state.readingSnapshots.unshift(snapshot)
      })
    ),

  setFocusTimer: (timer) => set({ focusTimer: timer }),
  setAccessibility: (settings) => set({ accessibility: settings }),
  setActivePresetId: (id) => set({ activePresetId: id }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),

  setCurrentReadingLine: (line) => set({ currentReadingLine: line }),
  setCurrentReadingProgress: (progress) => set({ currentReadingProgress: progress }),
  setActiveSessionMinutes: (minutes) => set({ activeSessionMinutes: minutes }),
  setSelectedReaderText: (text) => set({ selectedReaderText: text }),
    }),
    {
      name: 'reading-store-v2',
      storage: createJSONStorage(() => localStorage),
      // 持久化阅读数据字段；会话内状态（currentReadingLine/Progress/minutes/selectedText）不持久化
      partialize: (state) => ({
        readerMarks: state.readerMarks,
        readLaterItems: state.readLaterItems,
        readingSessions: state.readingSessions,
        chapterCompletions: state.chapterCompletions,
        readingSnapshots: state.readingSnapshots,
        focusTimer: state.focusTimer,
        accessibility: state.accessibility,
        activePresetId: state.activePresetId,
        layoutMode: state.layoutMode,
      }),
    }
  )
)
