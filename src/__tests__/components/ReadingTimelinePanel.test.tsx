import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    const { default: userEvent } = await import('@testing-library/user-event')
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
})
