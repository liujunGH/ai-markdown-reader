import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { GlobalSearch } from '../../components/GlobalSearch'
import { getIndexedFileCount } from '../../utils/searchIndex'

vi.mock('../../utils/searchIndex', () => ({
  getIndexedFileCount: vi.fn(async () => 0),
  searchInFolder: vi.fn(async () => []),
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getIndexedFileCount).mockResolvedValue(0)
  })

  it('explains that search needs an index when the current folder has no indexed files', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn()

    render(
      <GlobalSearch
        isOpen
        folderPath="/docs"
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
        onReindex={onReindex}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('尚未建立索引')).toBeInTheDocument()
    })
    expect(screen.getByText('全文搜索、反链和图谱都需要先扫描当前文件夹。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '立即重建索引' }))

    expect(onReindex).toHaveBeenCalled()
  })

  it('confirms when a manual reindex finishes and refreshes search state', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getIndexedFileCount)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3)

    render(
      <GlobalSearch
        isOpen
        folderPath="/docs"
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
        onReindex={onReindex}
      />
    )

    await screen.findByText('尚未建立索引')
    await user.click(screen.getByRole('button', { name: '立即重建索引' }))

    expect(await screen.findByText('索引已完成，已刷新搜索结果')).toBeInTheDocument()
    expect(screen.getByText('已索引 3 个文件')).toBeInTheDocument()
  })

  it('locks all reindex actions while a manual reindex is running', async () => {
    const user = userEvent.setup()
    let resolveReindex: () => void = () => {}
    const onReindex = vi.fn(() => new Promise<void>(resolve => { resolveReindex = resolve }))

    render(
      <GlobalSearch
        isOpen
        folderPath="/docs"
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
        onReindex={onReindex}
      />
    )

    await screen.findByText('尚未建立索引')
    await user.click(screen.getByRole('button', { name: '立即重建索引' }))
    await user.click(screen.getByRole('button', { name: '正在重建索引...' }))

    expect(screen.getByRole('button', { name: '正在重建索引...' })).toBeDisabled()
    expect(onReindex).toHaveBeenCalledTimes(1)

    resolveReindex()
    expect(await screen.findByText('索引已完成，已刷新搜索结果')).toBeInTheDocument()
  })

  it('shows a local cancel acknowledgement and clears stale reindex notices when indexing restarts', async () => {
    const user = userEvent.setup()
    const onCancelIndex = vi.fn()
    const { rerender } = render(
      <GlobalSearch
        isOpen
        folderPath="/docs"
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
        onReindex={vi.fn()}
      />
    )

    await screen.findByText('尚未建立索引')
    rerender(
      <GlobalSearch
        isOpen
        folderPath="/docs"
        onClose={vi.fn()}
        onOpenFile={vi.fn()}
        onReindex={vi.fn()}
        isIndexing
        indexProgress={{ phase: 'indexing', discoveredFiles: 8, indexedFiles: 2, skippedFiles: 1, currentPath: '/docs/a.md' }}
        onCancelIndex={onCancelIndex}
      />
    )

    expect(screen.queryByText('尚未建立索引')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(onCancelIndex).toHaveBeenCalled()
    expect(screen.getByText('已请求取消索引，正在停止...')).toBeInTheDocument()
  })
})
