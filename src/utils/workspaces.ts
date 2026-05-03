import { getStorageItem, setStorageItem } from './storage'

const WORKSPACES_KEY = 'workspaces'
const WORKSPACE_SESSION_PREFIX = 'workspace-session-'

export interface Workspace {
  id: string
  name: string
  folderPath: string
  updatedAt: number
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
    return JSON.parse(getStorageItem(WORKSPACES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveWorkspace(name: string, folderPath: string): Workspace {
  const workspace: Workspace = { id: workspaceId(folderPath), name, folderPath, updatedAt: Date.now() }
  const next = [workspace, ...getWorkspaces().filter(item => item.id !== workspace.id)].slice(0, 12)
  setStorageItem(WORKSPACES_KEY, JSON.stringify(next))
  return workspace
}

export function removeWorkspace(id: string): void {
  setStorageItem(WORKSPACES_KEY, JSON.stringify(getWorkspaces().filter(item => item.id !== id)))
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
