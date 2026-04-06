const STORAGE_KEY = 'recent-files'

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
  
  if (files.length > 10) {
    files.pop()
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
}

export function clearRecentFiles(): void {
  localStorage.removeItem(STORAGE_KEY)
}
