import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MissingLinksPanel } from '../../components/MissingLinksPanel'

describe('MissingLinksPanel', () => {
  it('highlights the requested missing link and puts it first', () => {
    render(
      <MissingLinksPanel
        links={[
          {
            target: 'Other',
            normalizedTarget: 'other',
            sourceCount: 1,
            references: [{
              sourcePath: '/docs/a.md',
              sourceName: 'a.md',
              line: 3,
              text: '[[Other]]',
              displayText: 'Other',
            }],
          },
          {
            target: 'Missing Note',
            normalizedTarget: 'missing note',
            sourceCount: 1,
            references: [{
              sourcePath: '/docs/home.md',
              sourceName: 'home.md',
              line: 18,
              text: '[[Missing Note]]',
              displayText: 'Missing Note',
            }],
          },
        ]}
        focusedTarget="Missing Note"
        onCreateFile={vi.fn()}
        onOpenSource={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const items = screen.getAllByRole('article')
    expect(within(items[0]).getByRole('heading', { name: 'Missing Note' })).toBeInTheDocument()
    expect(items[0]).toHaveAttribute('aria-current', 'true')
  })
})
