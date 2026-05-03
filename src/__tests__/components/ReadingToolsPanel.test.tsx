import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReadingToolsPanel } from '../../components/ReadingToolsPanel'
import type { ReaderMark, ReadLaterItem, ReadingLandmark, ReadingLayoutMode, ReadingPreset, ReadingResumePoint } from '../../utils/readingExperience'

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
      onSetLayoutMode: vi.fn(),
      onRemoveMark: vi.fn(),
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

    await user.click(screen.getByRole('button', { name: '双页' }))
    expect(handlers.onSetLayoutMode).toHaveBeenCalledWith('columns' satisfies ReadingLayoutMode)
  })
})
