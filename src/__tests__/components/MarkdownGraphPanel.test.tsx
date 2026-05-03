import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MarkdownGraphPanel } from '../../components/MarkdownGraphPanel'

describe('MarkdownGraphPanel', () => {
  it('explains an empty indexed graph and offers reindexing', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn()

    render(
      <MarkdownGraphPanel
        graph={{ nodes: [], edges: [], orphanNodes: [] }}
        folderPath="/docs"
        onOpenFile={vi.fn()}
        onReindex={onReindex}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('当前索引为空')).toBeInTheDocument()
    expect(screen.getByText('搜索、反链和图谱都依赖索引，点击重建后会重新扫描这个文件夹。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重建索引' }))

    expect(onReindex).toHaveBeenCalled()
  })

  it('shows a local error when reindexing from the graph fails', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn().mockRejectedValue(new Error('磁盘不可读'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(
        <MarkdownGraphPanel
          graph={{ nodes: [], edges: [], orphanNodes: [] }}
          folderPath="/docs"
          onOpenFile={vi.fn()}
          onReindex={onReindex}
          onClose={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: '重建索引' }))

      expect(await screen.findByText('索引失败：磁盘不可读')).toBeInTheDocument()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('locks graph reindexing while a manual reindex is running', async () => {
    const user = userEvent.setup()
    let resolveReindex: () => void = () => {}
    const onReindex = vi.fn(() => new Promise<void>(resolve => { resolveReindex = resolve }))

    render(
      <MarkdownGraphPanel
        graph={{ nodes: [], edges: [], orphanNodes: [] }}
        folderPath="/docs"
        onOpenFile={vi.fn()}
        onReindex={onReindex}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '重建索引' }))
    await user.click(screen.getByRole('button', { name: '正在重建索引...' }))

    expect(screen.getByRole('button', { name: '正在重建索引...' })).toBeDisabled()
    expect(onReindex).toHaveBeenCalledTimes(1)

    resolveReindex()
    expect(await screen.findByText('索引已完成，图谱会自动刷新')).toBeInTheDocument()
  })

  it('acknowledges cancel requests from the graph panel', async () => {
    const user = userEvent.setup()
    const onCancelIndex = vi.fn()

    render(
      <MarkdownGraphPanel
        graph={{ nodes: [], edges: [], orphanNodes: [] }}
        folderPath="/docs"
        onOpenFile={vi.fn()}
        onReindex={vi.fn()}
        onClose={vi.fn()}
        isIndexing
        indexProgress={{ phase: 'indexing', discoveredFiles: 10, indexedFiles: 4, skippedFiles: 1, currentPath: '/docs/a.md' }}
        onCancelIndex={onCancelIndex}
      />
    )

    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(onCancelIndex).toHaveBeenCalled()
    expect(screen.getByText('已请求取消索引，正在停止...')).toBeInTheDocument()
  })

  it('shows the latest skipped item while graph indexing is running', () => {
    render(
      <MarkdownGraphPanel
        graph={{ nodes: [], edges: [], orphanNodes: [] }}
        folderPath="/docs"
        onOpenFile={vi.fn()}
        onReindex={vi.fn()}
        onClose={vi.fn()}
        isIndexing
        indexProgress={{
          phase: 'indexing',
          discoveredFiles: 10,
          indexedFiles: 4,
          skippedFiles: 1,
          currentPath: '/docs/bad.md',
          skippedItems: [{ path: '/docs/bad.md', name: 'bad.md', reason: 'read-error', detail: '权限不足' }],
        }}
      />
    )

    expect(screen.getByText('最近跳过：bad.md：读取失败（权限不足）')).toBeInTheDocument()
  })

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

  it('opens missing link details for unresolved graph nodes', async () => {
    const user = userEvent.setup()
    const onOpenMissingLink = vi.fn()

    render(
      <MarkdownGraphPanel
        graph={{
          nodes: [
            { id: 'home', label: 'Home', filePath: '/docs/home.md', incoming: 0, outgoing: 1 },
            { id: 'missing-note', label: 'Missing Note', incoming: 1, outgoing: 0 },
          ],
          edges: [
            { from: 'home', to: 'missing-note', line: 18 },
          ],
          orphanNodes: [],
        }}
        onOpenFile={vi.fn()}
        onOpenMissingLink={onOpenMissingLink}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '聚焦节点 Missing Note' }))
    await user.click(screen.getByRole('button', { name: '查看缺失链接 Missing Note' }))

    expect(onOpenMissingLink).toHaveBeenCalledWith('Missing Note')
  })
})
