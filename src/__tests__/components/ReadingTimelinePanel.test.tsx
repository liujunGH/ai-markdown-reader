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
})
