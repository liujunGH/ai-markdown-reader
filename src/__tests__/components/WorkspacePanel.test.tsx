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
})
