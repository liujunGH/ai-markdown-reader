import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { IndexDiagnosticsPanel } from '../../components/IndexDiagnosticsPanel'

describe('IndexDiagnosticsPanel', () => {
  it('summarizes skipped index items by reason and exposes reindexing', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn()

    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[
          { path: '/docs/node_modules', name: 'node_modules', reason: 'ignored-directory' },
          { path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 2048, maxSize: 1024 },
          { path: '/docs/private.md', name: 'private.md', reason: 'read-error', detail: '权限不足' },
        ]}
        isIndexing={false}
        onReindex={onReindex}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('region', { name: '索引诊断' })).toBeInTheDocument()
    expect(screen.getByText('跳过项')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getAllByText('忽略目录').length).toBeGreaterThan(0)
    expect(screen.getAllByText('文件过大').length).toBeGreaterThan(0)
    expect(screen.getAllByText('读取失败').length).toBeGreaterThan(0)
    expect(screen.getByText('large.md：文件过大（2 KB > 1 KB）')).toBeInTheDocument()
    expect(screen.getByText('/docs/private.md')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新扫描索引' }))

    expect(onReindex).toHaveBeenCalled()
  })

  it('shows a recoverable empty state when there are no skipped items', () => {
    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[]}
        isIndexing={false}
        onReindex={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('没有跳过项')).toBeInTheDocument()
    expect(screen.getByText('最近一次索引没有发现被忽略、过大或读取失败的项目。')).toBeInTheDocument()
  })
})
