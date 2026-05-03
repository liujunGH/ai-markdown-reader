import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { GlobalSearch } from '../../components/GlobalSearch'

vi.mock('../../utils/searchIndex', () => ({
  getIndexedFileCount: vi.fn(async () => 0),
  searchInFolder: vi.fn(async () => []),
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
