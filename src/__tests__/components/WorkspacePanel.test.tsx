import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { WorkspacePanel } from '../../components/WorkspacePanel'

const baseWorkspace = {
  id: 'docs',
  name: 'Docs',
  folderPath: '/Users/me/docs',
  updatedAt: Date.now(),
}

describe('WorkspacePanel', () => {
  it('offers pin, rename, remove, and cleanup actions', async () => {
    const user = userEvent.setup()
    const onTogglePin = vi.fn()
    const onRename = vi.fn()
    const onRemove = vi.fn()
    const onCleanInvalid = vi.fn()

    render(
      <WorkspacePanel
        workspaces={[baseWorkspace]}
        currentFolderPath="/Users/me/docs"
        currentFolderName="docs"
        onSaveCurrent={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onRemoveWorkspace={onRemove}
        onTogglePinned={onTogglePin}
        onRenameWorkspace={onRename}
        onCleanInvalidWorkspaces={onCleanInvalid}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '置顶工作区 Docs' }))
    expect(onTogglePin).toHaveBeenCalledWith('docs')

    vi.spyOn(window, 'prompt').mockReturnValue('Research')
    await user.click(screen.getByRole('button', { name: '重命名工作区 Docs' }))
    expect(onRename).toHaveBeenCalledWith('docs', 'Research')

    await user.click(screen.getByRole('button', { name: '清理失效工作区' }))
    expect(onCleanInvalid).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '移除工作区 Docs' }))
    expect(onRemove).toHaveBeenCalledWith('docs')
  })

  it('surfaces current workspace quick actions', async () => {
    const user = userEvent.setup()
    const onOpenGlobalSearch = vi.fn()
    const onOpenReadingTimeline = vi.fn()

    render(
      <WorkspacePanel
        workspaces={[baseWorkspace]}
        currentFolderPath="/Users/me/docs"
        currentFolderName="docs"
        onSaveCurrent={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
        onTogglePinned={vi.fn()}
        onRenameWorkspace={vi.fn()}
        onCleanInvalidWorkspaces={vi.fn()}
        onOpenGlobalSearch={onOpenGlobalSearch}
        onOpenReadingTimeline={onOpenReadingTimeline}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '搜索当前工作区' }))
    await user.click(screen.getByRole('button', { name: '打开阅读时间线' }))

    expect(onOpenGlobalSearch).toHaveBeenCalled()
    expect(onOpenReadingTimeline).toHaveBeenCalled()
  })

  it('shows index status for the current workspace and saved workspaces', () => {
    render(
      <WorkspacePanel
        workspaces={[baseWorkspace, {
          id: 'research',
          name: 'Research',
          folderPath: '/Users/me/research',
          updatedAt: Date.now() - 60000,
        }]}
        currentFolderPath="/Users/me/docs"
        currentFolderName="docs"
        workspaceIndexCounts={{
          '/Users/me/docs': 12,
          '/Users/me/research': 3,
        }}
        isIndexing={false}
        onSaveCurrent={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
        onTogglePinned={vi.fn()}
        onRenameWorkspace={vi.fn()}
        onCleanInvalidWorkspaces={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('当前索引：12 个文件')).toBeInTheDocument()
    expect(screen.getByText('索引 12')).toBeInTheDocument()
    expect(screen.getByText('索引 3')).toBeInTheDocument()
  })

  it('marks the current workspace index as refreshing while indexing', () => {
    render(
      <WorkspacePanel
        workspaces={[baseWorkspace]}
        currentFolderPath="/Users/me/docs"
        currentFolderName="docs"
        workspaceIndexCounts={{ '/Users/me/docs': 12 }}
        isIndexing
        onSaveCurrent={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
        onTogglePinned={vi.fn()}
        onRenameWorkspace={vi.fn()}
        onCleanInvalidWorkspaces={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('当前索引：更新中')).toBeInTheDocument()
  })

  it('disables workspace-dependent quick actions without an open folder', () => {
    render(
      <WorkspacePanel
        workspaces={[]}
        currentFolderPath={null}
        currentFolderName=""
        onSaveCurrent={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
        onTogglePinned={vi.fn()}
        onRenameWorkspace={vi.fn()}
        onCleanInvalidWorkspaces={vi.fn()}
        onOpenGlobalSearch={vi.fn()}
        onOpenReadingTimeline={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '搜索当前工作区' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '打开阅读时间线' })).toBeEnabled()
  })
})
