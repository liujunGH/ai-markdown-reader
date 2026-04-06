const STORAGE_KEY = 'recent-files'
const MAX_RECENT_FILES = 10

export interface RecentFile {
  name: string
  content: string
  path?: string
  openedAt: number
}

export function getRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function addRecentFile(file: Omit<RecentFile, 'openedAt'>): void {
  const files = getRecentFiles()
  const existing = files.findIndex(f => f.name === file.name)
  if (existing !== -1) {
    files.splice(existing, 1)
  }
  
  files.unshift({
    ...file,
    openedAt: Date.now()
  })
  
  if (files.length > MAX_RECENT_FILES) {
    files.pop()
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
}

export function removeRecentFile(name: string): void {
  const files = getRecentFiles()
  const index = files.findIndex(f => f.name === name)
  if (index !== -1) {
    files.splice(index, 1)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  }
}

export function clearRecentFiles(): void {
  localStorage.removeItem(STORAGE_KEY)
}
