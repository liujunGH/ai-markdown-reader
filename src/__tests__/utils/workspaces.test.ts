import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWorkspaceSession,
  getWorkspaces,
  removeWorkspace,
  renameWorkspace,
  saveWorkspace,
  saveWorkspaceSession,
  sortWorkspaces,
  toggleWorkspacePinned,
} from '../../utils/workspaces'

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

  it('pins workspaces and keeps pinned items before recent items', () => {
    const first = saveWorkspace('Alpha', '/Users/me/alpha')
    vi.setSystemTime(new Date('2026-05-03T00:01:00Z'))
    const second = saveWorkspace('Beta', '/Users/me/beta')

    toggleWorkspacePinned(first.id)

    expect(sortWorkspaces(getWorkspaces())).toEqual([
      expect.objectContaining({ id: first.id, isPinned: true }),
      expect.objectContaining({ id: second.id, isPinned: false }),
    ])
  })

  it('renames workspaces without changing their folder path', () => {
    const workspace = saveWorkspace('Docs', '/Users/me/docs')

    renameWorkspace(workspace.id, 'Knowledge Base')

    expect(getWorkspaces()).toEqual([
      expect.objectContaining({
        id: workspace.id,
        name: 'Knowledge Base',
        folderPath: '/Users/me/docs',
      }),
    ])
  })
})
