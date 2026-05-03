import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MarkdownGraphPanel } from '../../components/MarkdownGraphPanel'

describe('MarkdownGraphPanel', () => {
  it('focuses a node and exposes incoming and outgoing navigation', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()

    render(
      <MarkdownGraphPanel
        graph={{
          nodes: [
            { id: 'home', label: 'Home', filePath: '/docs/home.md', incoming: 1, outgoing: 1 },
            { id: 'source', label: 'Source', filePath: '/docs/source.md', incoming: 0, outgoing: 1 },
            { id: 'target', label: 'Target', filePath: '/docs/target.md', incoming: 1, outgoing: 0 },
          ],
          edges: [
            { from: 'source', to: 'home', line: 8 },
            { from: 'home', to: 'target', line: 12 },
          ],
          orphanNodes: [],
        }}
        onOpenFile={onOpenFile}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '聚焦节点 Home' }))

    expect(screen.getByRole('region', { name: '节点关系 Home' })).toBeInTheDocument()
    expect(screen.getByText('入链')).toBeInTheDocument()
    expect(screen.getByText('出链')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开来源 Source 行 8' }))
    expect(onOpenFile).toHaveBeenCalledWith('/docs/source.md', 8)

    await user.click(screen.getByRole('button', { name: '打开目标 Target 行 12' }))
    expect(onOpenFile).toHaveBeenCalledWith('/docs/target.md', 12)
  })
})
