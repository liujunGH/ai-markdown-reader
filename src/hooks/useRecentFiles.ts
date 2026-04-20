import { useState, useCallback, useEffect } from 'react'

export interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

export interface UseRecentFilesReturn {
  recentFiles: RecentFile[]
  loadRecentFiles: () => Promise<void>
  addRecentFile: (name: string, filePath: string) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>
  clearRecentFiles: () => Promise<void>
}

export function useRecentFiles(): UseRecentFilesReturn {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  const loadRecentFiles = useCallback(async () => {
    if (window.electronAPI) {
      const files = await window.electronAPI.getRecentFiles()
      setRecentFiles(files)
    }
  }, [])

  const addRecentFile = useCallback(async (name: string, filePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.addRecentFile({ name, filePath })
      const files = await window.electronAPI.getRecentFiles()
      setRecentFiles(files)
    }
  }, [])

  const removeRecentFile = useCallback(async (filePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.removeRecentFile(filePath)
      const files = await window.electronAPI.getRecentFiles()
      setRecentFiles(files)
    }
  }, [])

  const clearRecentFiles = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearRecentFiles()
      setRecentFiles([])
    }
  }, [])

  useEffect(() => {
    loadRecentFiles()
  }, [loadRecentFiles])

  return {
    recentFiles,
    loadRecentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  }
}
