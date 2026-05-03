import { getStorageItem, setStorageItem } from './storage'

const WORKSPACES_KEY = 'workspaces'
const WORKSPACE_SESSION_PREFIX = 'workspace-session-'

export interface Workspace {
  id: string
  name: string
  folderPath: string
  updatedAt: number
  isPinned?: boolean
}

export interface WorkspaceTabSnapshot {
  name: string
  filePath?: string
  content?: string
  isPinned?: boolean
}

export interface WorkspaceSessionSnapshot {
  tabs: WorkspaceTabSnapshot[]
  activeFilePath?: string
  updatedAt: number
}

function workspaceId(folderPath: string): string {
  return encodeURIComponent(folderPath)
}

function sessionKey(id: string): `workspace-session-${string}` {
  return `${WORKSPACE_SESSION_PREFIX}${id}` as const
}

export function getWorkspaces(): Workspace[] {
  try {
    return JSON.parse(getStorageItem(WORKSPACES_KEY) || '[]').map((workspace: Workspace) => ({
      ...workspace,
      isPinned: Boolean(workspace.isPinned),
    }))
  } catch {
    return []
  }
}

export function sortWorkspaces(workspaces: Workspace[]): Workspace[] {
  return [...workspaces].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
}

export function saveWorkspace(name: string, folderPath: string): Workspace {
  const existing = getWorkspaces().find(item => item.folderPath === folderPath)
  const workspace: Workspace = {
    id: workspaceId(folderPath),
    name,
    folderPath,
    updatedAt: Date.now(),
    isPinned: Boolean(existing?.isPinned),
  }
  const next = sortWorkspaces([workspace, ...getWorkspaces().filter(item => item.id !== workspace.id)]).slice(0, 12)
  setStorageItem(WORKSPACES_KEY, JSON.stringify(next))
  return workspace
}

export function removeWorkspace(id: string): void {
  setStorageItem(WORKSPACES_KEY, JSON.stringify(getWorkspaces().filter(item => item.id !== id)))
}

export function renameWorkspace(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  const next = getWorkspaces().map(workspace => (
    workspace.id === id
      ? { ...workspace, name: trimmed, updatedAt: Date.now() }
      : workspace
  ))
  setStorageItem(WORKSPACES_KEY, JSON.stringify(sortWorkspaces(next)))
}

export function toggleWorkspacePinned(id: string): void {
  const next = getWorkspaces().map(workspace => (
    workspace.id === id
      ? { ...workspace, isPinned: !workspace.isPinned, updatedAt: Date.now() }
      : workspace
  ))
  setStorageItem(WORKSPACES_KEY, JSON.stringify(sortWorkspaces(next)))
}

export function removeWorkspaces(ids: string[]): void {
  const idSet = new Set(ids)
  setStorageItem(WORKSPACES_KEY, JSON.stringify(getWorkspaces().filter(item => !idSet.has(item.id))))
}

export function saveWorkspaceSession(workspaceIdValue: string, snapshot: WorkspaceSessionSnapshot): void {
  setStorageItem(sessionKey(workspaceIdValue), JSON.stringify(snapshot))
}

export function getWorkspaceSession(workspaceIdValue: string): WorkspaceSessionSnapshot | null {
  try {
    const stored = getStorageItem(sessionKey(workspaceIdValue))
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
