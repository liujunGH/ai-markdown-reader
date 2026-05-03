import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReadingTimelinePanel } from '../../components/ReadingTimelinePanel'

describe('ReadingTimelinePanel', () => {
  it('renders fractional reading progress as a percentage', () => {
    render(
      <ReadingTimelinePanel
        items={[{
          filePath: '/docs/a.md',
          name: 'a.md',
          progress: 0.5,
          line: 12,
          updatedAt: Date.now(),
        }]}
        onOpenFile={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('行 12')).toBeInTheDocument()
  })

  it('passes the stored scroll position when opening an item', async () => {
    const onOpenFile = vi.fn()

    render(
      <ReadingTimelinePanel
        items={[{
          filePath: '/docs/a.md',
          name: 'a.md',
          progress: 0.5,
          line: 12,
          scrollTop: 480,
          updatedAt: Date.now(),
        }]}
        onOpenFile={onOpenFile}
        onClose={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /a.md/ }))

    expect(onOpenFile).toHaveBeenCalledWith('/docs/a.md', 12, 480)
  })

  it('filters reading history by query and unfinished status', async () => {
    const user = userEvent.setup()
    render(
      <ReadingTimelinePanel
        items={[
          { filePath: '/docs/a.md', name: 'Guide.md', progress: 0.5, updatedAt: Date.now() },
          { filePath: '/docs/b.md', name: 'Done.md', progress: 1, updatedAt: Date.now() },
        ]}
        onOpenFile={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '未读完' }))

    expect(screen.getByText('Guide.md')).toBeInTheDocument()
    expect(screen.queryByText('Done.md')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜索阅读记录'), 'guide')

    expect(screen.getByText('Guide.md')).toBeInTheDocument()
  })
})
