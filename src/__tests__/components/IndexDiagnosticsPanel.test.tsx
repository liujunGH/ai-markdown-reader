import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { IndexDiagnosticsPanel } from '../../components/IndexDiagnosticsPanel'

describe('IndexDiagnosticsPanel', () => {
  it('summarizes skipped index items by reason and exposes reindexing', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn()
    const onClear = vi.fn()
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    window.electronAPI = {
      showInFolder: vi.fn(async () => {}),
    } as unknown as Window['electronAPI']

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
        onClear={onClear}
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

    await user.click(screen.getByRole('button', { name: '只看文件过大' }))
    expect(screen.getByText('large.md：文件过大（2 KB > 1 KB）')).toBeInTheDocument()
    expect(screen.queryByText('private.md：读取失败（权限不足）')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制路径 large.md' }))
    expect(writeText).toHaveBeenCalledWith('/docs/large.md')

    await user.click(screen.getByRole('button', { name: '在 Finder 中显示 large.md' }))
    expect(window.electronAPI!.showInFolder).toHaveBeenCalledWith('/docs/large.md')

    await user.click(screen.getByRole('button', { name: '清空诊断' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('shows a recoverable empty state when there are no skipped items', () => {
    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[]}
        isIndexing={false}
        onReindex={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('没有跳过项')).toBeInTheDocument()
    expect(screen.getByText('最近一次索引没有发现被忽略、过大或读取失败的项目。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空诊断' })).toBeDisabled()
  })
})
