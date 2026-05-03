import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
        onOpenSuggestion={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const items = screen.getAllByRole('article')
    expect(within(items[0]).getByRole('heading', { name: 'Missing Note' })).toBeInTheDocument()
    expect(items[0]).toHaveAttribute('aria-current', 'true')
  })

  it('shows repair candidates for missing links', async () => {
    const user = userEvent.setup()
    const onOpenSuggestion = vi.fn()

    render(
      <MissingLinksPanel
        links={[
          {
            target: 'Product Roadmap',
            normalizedTarget: 'product roadmap',
            sourceCount: 1,
            references: [{
              sourcePath: '/docs/home.md',
              sourceName: 'home.md',
              line: 2,
              text: '[[Product Roadmap]]',
              displayText: 'Product Roadmap',
            }],
          },
        ]}
        suggestions={{
          'product roadmap': [
            { path: '/docs/product-roadmap.md', label: 'product-roadmap', score: 4 },
          ],
        }}
        onCreateFile={vi.fn()}
        onOpenSource={vi.fn()}
        onOpenSuggestion={onOpenSuggestion}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('可能匹配')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开候选 product-roadmap' }))

    expect(onOpenSuggestion).toHaveBeenCalledWith('/docs/product-roadmap.md')
  })
})
