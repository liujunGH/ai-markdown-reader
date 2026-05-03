import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWorkspaceSession, getWorkspaces, removeWorkspace, saveWorkspace, saveWorkspaceSession } from '../../utils/workspaces'

describe('workspaces', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-03T00:00:00Z'))
  })

  it('saves, updates, and removes workspaces', () => {
    const workspace = saveWorkspace('Docs', '/Users/me/docs')
    saveWorkspace('Docs Renamed', '/Users/me/docs')

    expect(getWorkspaces()).toEqual([
      expect.objectContaining({ id: workspace.id, name: 'Docs Renamed', folderPath: '/Users/me/docs' }),
    ])

    removeWorkspace(workspace.id)
    expect(getWorkspaces()).toEqual([])
  })

  it('persists workspace sessions by id', () => {
    const workspace = saveWorkspace('Docs', '/Users/me/docs')
    saveWorkspaceSession(workspace.id, {
      tabs: [{ name: 'a.md', filePath: '/Users/me/docs/a.md' }],
      activeFilePath: '/Users/me/docs/a.md',
      updatedAt: Date.now(),
    })

    expect(getWorkspaceSession(workspace.id)).toEqual(
      expect.objectContaining({
        tabs: [expect.objectContaining({ name: 'a.md' })],
        activeFilePath: '/Users/me/docs/a.md',
      })
    )
  })
})
