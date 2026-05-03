import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { RecentFilesPage } from '../../components/RecentFilesPage'

describe('RecentFilesPage', () => {
  it('shows recovery actions when there are no recent files', async () => {
    const user = userEvent.setup()
    const onOpenFolder = vi.fn()
    const onOpenWorkspaces = vi.fn()
    const onOpenReadingTimeline = vi.fn()

    render(
      <RecentFilesPage
        files={[]}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
        onClose={vi.fn()}
        onOpenFolder={onOpenFolder}
        onOpenWorkspaces={onOpenWorkspaces}
        onOpenReadingTimeline={onOpenReadingTimeline}
      />
    )

    await user.click(screen.getByRole('button', { name: '打开文件夹开始' }))
    await user.click(screen.getByRole('button', { name: '管理工作区' }))
    await user.click(screen.getByRole('button', { name: '打开阅读时间线' }))

    expect(onOpenFolder).toHaveBeenCalled()
    expect(onOpenWorkspaces).toHaveBeenCalled()
    expect(onOpenReadingTimeline).toHaveBeenCalled()
  })

  it('keeps search-empty state focused on the query', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <RecentFilesPage
        files={[{ name: 'Guide.md', filePath: '/docs/Guide.md', openedAt: Date.now() }]}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
        onClose={vi.fn()}
        onOpenFolder={vi.fn()}
        onOpenWorkspaces={vi.fn()}
        onOpenReadingTimeline={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('搜索文件名或路径...'), 'missing')

    expect(screen.getByText('未找到匹配的文件')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开文件夹开始' })).not.toBeInTheDocument()
    expect(consoleError.mock.calls.some(call => String(call[0]).includes('validateDOMNesting'))).toBe(false)

    consoleError.mockRestore()
  })
})
