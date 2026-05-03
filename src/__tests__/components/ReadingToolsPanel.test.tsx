import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReadingToolsPanel } from '../../components/ReadingToolsPanel'
import type { AnnotationOverview, ChapterCompletion, ChapterReadingAction, FocusTimer, ReaderMark, ReadingAccessibilitySettings, ReadingSnapshot, ReadingStatusCard, ChapterProgress, ReadingStats, ReadLaterItem, ReadingLandmark, ReadingLayoutMode, ReadingPreset, ReadingResumePoint } from '../../utils/readingExperience'

const marks: ReaderMark[] = [
  { id: 'h1', filePath: '/docs/a.md', fileName: 'a.md', text: 'Important text', kind: 'highlight', color: 'yellow', line: 3, createdAt: 100 },
  { id: 'e1', filePath: '/docs/a.md', fileName: 'a.md', text: 'Quoted text', kind: 'excerpt', color: 'blue', note: 'Nice', createdAt: 90 },
]

const queue: ReadLaterItem[] = [
  { id: 'q1', filePath: '/docs/a.md', fileName: 'a.md', heading: 'Intro', status: 'unread', createdAt: 100, updatedAt: 100 },
]

const resumePoint: ReadingResumePoint = {
  filePath: '/docs/a.md',
  fileName: 'a.md',
  heading: 'Intro',
  line: 12,
  scrollTop: 480,
  progress: 0.4,
  progressPercent: 40,
  label: 'Intro · 40%',
  updatedAt: 100,
}

const presets: ReadingPreset[] = [
  { id: 'default', name: '普通', fontSize: 16, lineHeight: 1.65, lineWidth: 720, showOutline: true, columns: false },
  { id: 'longform', name: '长文', fontSize: 18, lineHeight: 1.85, lineWidth: 760, showOutline: true, columns: false },
]

const landmarks: ReadingLandmark[] = [
  { id: 'heading-1', type: 'heading', label: 'Intro', line: 1 },
  { id: 'image-4', type: 'image', label: 'Cover', line: 4 },
]

const stats: ReadingStats = {
  totalMinutes: 42,
  todayMinutes: 8,
  totalWords: 3600,
  documentsRead: 3,
  sessionCount: 5,
}

const chapterProgress: ChapterProgress = {
  currentHeading: 'Intro',
  currentIndex: 1,
  totalChapters: 4,
  percent: 62,
  lineStart: 1,
  lineEnd: 30,
}

const focusTimer: FocusTimer = { minutes: 25, startedAt: 100, endsAt: 1500100 }
const accessibility: ReadingAccessibilitySettings = {
  lineHeight: 1.8,
  letterSpacing: 0.02,
  paragraphSpacing: 1.2,
  reduceMotion: true,
  ttsRate: 1.2,
  highContrastHighlights: true,
}
const chapterCompletions: ChapterCompletion[] = [
  { id: 'c1', filePath: '/docs/a.md', heading: 'Intro', line: 1, completedAt: 100 },
]
const annotationOverview: AnnotationOverview = {
  summary: { highlights: 1, excerpts: 1, completedChapters: 1 },
  items: [
    { id: 'h1', kind: 'highlight', label: 'Important text', badge: '高亮 · #重点', filePath: '/docs/a.md', line: 3, createdAt: 100 },
    { id: 'c1', kind: 'chapter', label: 'Intro', badge: '章节完成', filePath: '/docs/a.md', line: 1, createdAt: 90 },
  ],
}
const statusCard: ReadingStatusCard = {
  filePath: '/docs/a.md',
  fileName: 'a.md',
  progressPercent: 40,
  highlightCount: 1,
  excerptCount: 1,
  completedChapterCount: 1,
  lastReadLabel: '刚刚阅读',
}
const chapterActions: ChapterReadingAction[] = [
  { id: 'chapter-1', heading: 'Intro', line: 1, completed: true, index: 1, total: 2 },
  { id: 'chapter-2', heading: 'Next', line: 30, completed: false, index: 2, total: 2 },
]
const snapshots: ReadingSnapshot[] = [
  { id: 's1', filePath: '/docs/a.md', fileName: 'a.md', heading: 'Intro', progress: 0.4, progressPercent: 40, scrollTop: 480, fontSize: 16, theme: 'sepia', layoutMode: 'single', createdAt: 100 },
]

describe('ReadingToolsPanel', () => {
  it('renders reader sections and calls handlers', async () => {
    const user = userEvent.setup()
    const handlers = {
      onAddHighlight: vi.fn(),
      onAddExcerpt: vi.fn(),
      onAddReadLater: vi.fn(),
      onOpenReadLater: vi.fn(),
      onUpdateReadLaterStatus: vi.fn(),
      onResume: vi.fn(),
      onApplyPreset: vi.fn(),
      onJumpToLandmark: vi.fn(),
      onJumpToMark: vi.fn(),
      onSetLayoutMode: vi.fn(),
      onRemoveMark: vi.fn(),
      onExportAnnotations: vi.fn(),
      onUpdateMarkMetadata: vi.fn(),
      onToggleChapterCompletion: vi.fn(),
      onStartFocusTimer: vi.fn(),
      onStopFocusTimer: vi.fn(),
      onOpenMediaGallery: vi.fn(),
      onSyncComparison: vi.fn(),
      onUpdateAccessibility: vi.fn(),
      onOpenAnnotation: vi.fn(),
      onOpenChapter: vi.fn(),
      onCreateSnapshot: vi.fn(),
      onRestoreSnapshot: vi.fn(),
      onClose: vi.fn(),
    }

    render(
      <ReadingToolsPanel
        fileName="a.md"
        selectedText="Important text"
        marks={marks}
        readLaterItems={queue}
        resumePoint={resumePoint}
        presets={presets}
        activePresetId="default"
        landmarks={landmarks}
        layoutMode="single"
        panelMode="sidebar"
        readingStats={stats}
        chapterProgress={chapterProgress}
        chapterCompletions={chapterCompletions}
        focusTimer={focusTimer}
        accessibility={accessibility}
        annotationOverview={annotationOverview}
        statusCard={statusCard}
        chapterActions={chapterActions}
        snapshots={snapshots}
        activeSessionMinutes={6}
        {...handlers}
      />
    )

    expect(screen.getByText('阅读工具')).toBeInTheDocument()
    expect(screen.getByText('标注 / 高亮')).toBeInTheDocument()
    expect(screen.getByText('稍后读')).toBeInTheDocument()
    expect(screen.getByText('继续阅读')).toBeInTheDocument()
    expect(screen.getByText('阅读预设')).toBeInTheDocument()
    expect(screen.getByText('快速导航')).toBeInTheDocument()
    expect(screen.getByText('摘录')).toBeInTheDocument()
    expect(screen.getByText('分栏阅读')).toBeInTheDocument()
    expect(screen.getByText('章节进度')).toBeInTheDocument()
    expect(screen.getByText('阅读会话')).toBeInTheDocument()
    expect(screen.getByText('阅读统计')).toBeInTheDocument()
    expect(screen.getByText('批注导出')).toBeInTheDocument()
    expect(screen.getByText('颜色与标签')).toBeInTheDocument()
    expect(screen.getByText('章节完成')).toBeInTheDocument()
    expect(screen.getByText('防打扰')).toBeInTheDocument()
    expect(screen.getByText('图片/表格')).toBeInTheDocument()
    expect(screen.getByText('对比阅读')).toBeInTheDocument()
    expect(screen.getByText('无障碍')).toBeInTheDocument()
    expect(screen.getByText('阅读状态卡')).toBeInTheDocument()
    expect(screen.getByText('批注总览')).toBeInTheDocument()
    expect(screen.getByText('长文章节模式')).toBeInTheDocument()
    expect(screen.getByText('阅读快照')).toBeInTheDocument()
    expect(screen.getByLabelText('阅读工具侧栏')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存高亮' }))
    expect(handlers.onAddHighlight).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '保存摘录' }))
    expect(handlers.onAddExcerpt).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '加入稍后读' }))
    expect(handlers.onAddReadLater).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '打开 a.md' }))
    expect(handlers.onOpenReadLater).toHaveBeenCalledWith(queue[0])

    await user.click(screen.getByRole('button', { name: '标记已读' }))
    expect(handlers.onUpdateReadLaterStatus).toHaveBeenCalledWith('q1', 'done')

    await user.click(screen.getByRole('button', { name: '从上次位置继续' }))
    expect(handlers.onResume).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '长文' }))
    expect(handlers.onApplyPreset).toHaveBeenCalledWith(presets[1])

    await user.click(screen.getByRole('button', { name: '跳到 Intro' }))
    expect(handlers.onJumpToLandmark).toHaveBeenCalledWith(landmarks[0])

    await user.click(screen.getByRole('button', { name: '跳到高亮 Important text' }))
    expect(handlers.onJumpToMark).toHaveBeenCalledWith(marks[0])

    await user.click(screen.getByRole('button', { name: '双页' }))
    expect(handlers.onSetLayoutMode).toHaveBeenCalledWith('columns' satisfies ReadingLayoutMode)

    await user.click(screen.getByRole('button', { name: '导出批注' }))
    expect(handlers.onExportAnnotations).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '重点' }))
    expect(handlers.onUpdateMarkMetadata).toHaveBeenCalledWith('h1', expect.objectContaining({ tag: '重点' }))

    await user.click(screen.getByRole('button', { name: '切换当前章节完成' }))
    expect(handlers.onToggleChapterCompletion).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '开始 25 分钟' }))
    expect(handlers.onStartFocusTimer).toHaveBeenCalledWith(25)

    await user.click(screen.getByRole('button', { name: '打开图片/表格导航' }))
    expect(handlers.onOpenMediaGallery).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '同步对比位置' }))
    expect(handlers.onSyncComparison).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '提高朗读速度' }))
    expect(handlers.onUpdateAccessibility).toHaveBeenCalledWith(expect.objectContaining({ ttsRate: 1.3 }))

    await user.click(screen.getByRole('button', { name: '切换减少动画' }))
    expect(handlers.onUpdateAccessibility).toHaveBeenCalledWith(expect.objectContaining({ reduceMotion: false }))

    await user.click(screen.getByRole('button', { name: '打开批注 Important text' }))
    expect(handlers.onOpenAnnotation).toHaveBeenCalledWith(annotationOverview.items[0])

    await user.click(screen.getByRole('button', { name: '跳到章节 Next' }))
    expect(handlers.onOpenChapter).toHaveBeenCalledWith(chapterActions[1])

    await user.click(screen.getByRole('button', { name: '保存阅读快照' }))
    expect(handlers.onCreateSnapshot).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /恢复快照 Intro/ }))
    expect(handlers.onRestoreSnapshot).toHaveBeenCalledWith(snapshots[0])
  })
})
