import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReadingMediaPanel } from '../../components/ReadingMediaPanel'
import type { ReadingMediaItem } from '../../utils/readingExperience'

const media: ReadingMediaItem[] = [
  { id: 'image-1', type: 'image', label: 'Cover', line: 3, src: './cover.png', alt: 'Cover' },
  { id: 'table-1', type: 'table', label: '表格 · 行 8', line: 8, markdown: '| A | B |\n|---|---|\n| 1 | 2 |', csv: 'A,B\n1,2' },
]

describe('ReadingMediaPanel', () => {
  it('browses images and opens tables in fullscreen reading mode', async () => {
    const user = userEvent.setup()
    const handlers = {
      onJumpToLine: vi.fn(),
      onCopy: vi.fn(),
      onClose: vi.fn(),
    }

    render(<ReadingMediaPanel items={media} activeId="image-1" {...handlers} />)

    expect(screen.getByText('图片序列')).toBeInTheDocument()
    expect(screen.getByAltText('Cover')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一项' }))
    expect(screen.getByText('表格全屏阅读')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制 CSV' }))
    expect(handlers.onCopy).toHaveBeenCalledWith('A,B\n1,2', 'CSV 已复制')

    await user.click(screen.getByRole('button', { name: '定位正文' }))
    expect(handlers.onJumpToLine).toHaveBeenCalledWith(8)
  })
})
