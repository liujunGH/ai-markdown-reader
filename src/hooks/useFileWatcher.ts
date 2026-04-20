import { useState, useCallback, useEffect, useRef } from 'react'
import { Tab } from '../types/Tab'
import { basename } from '../utils/path'

export interface UseFileWatcherReturn {
  changedFilePath: string | null
  handleReloadChangedFile: () => Promise<void>
  watchFiles: (tabs: Tab[]) => void
  ignoreChange: () => void
}

export function useFileWatcher(
  onReload?: (filePath: string, content: string, name: string) => void
): UseFileWatcherReturn {
  const [changedFilePath, setChangedFilePath] = useState<string | null>(null)

  const prevTabsRef = useRef<Tab[]>([])

  const watchFiles = useCallback((tabs: Tab[]) => {
    if (!window.electronAPI) return
    const prevPaths = new Set(prevTabsRef.current.map(t => t.filePath).filter((fp): fp is string => !!fp))
    const currentPaths = new Set(tabs.map(t => t.filePath).filter((fp): fp is string => !!fp))
    // Unwatch files that are no longer open
    prevPaths.forEach(filePath => {
      if (!currentPaths.has(filePath)) {
        window.electronAPI!.unwatchFile(filePath)
      }
    })
    // Watch new files
    tabs.forEach(tab => {
      if (tab.filePath && !prevPaths.has(tab.filePath)) {
        window.electronAPI!.watchFile(tab.filePath)
      }
    })
    prevTabsRef.current = tabs
  }, [])

  const handleReloadChangedFile = useCallback(async () => {
    if (!changedFilePath || !window.electronAPI) return
    const result = await window.electronAPI.readFile(changedFilePath)
    if (result.success && result.content !== undefined) {
      const name = basename(changedFilePath) || '未知文件.md'
      onReload?.(changedFilePath, result.content, name)
    }
    setChangedFilePath(null)
  }, [changedFilePath, onReload])

  const ignoreChange = useCallback(() => {
    setChangedFilePath(null)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    const listener = (filePath: string) => {
      setChangedFilePath(filePath)
    }
    window.electronAPI.onFileChanged(listener)
    return () => {
      window.electronAPI!.offFileChanged(listener)
    }
  }, [])

  return {
    changedFilePath,
    handleReloadChangedFile,
    watchFiles,
    ignoreChange,
  }
}
