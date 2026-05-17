import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { indexFolder, getAllMarkdownFiles, getIndexedFileCount, type IndexProgress, type IndexSkippedItem } from '../utils/searchIndex'
import { clearSavedIndexDiagnostics, loadSavedIndexDiagnostics, saveIndexDiagnostics } from '../utils/indexDiagnostics'
import { getEffectiveIndexPolicy, loadIndexSettings, resetIndexSettings, saveIndexSettings, type IndexSettings } from '../utils/indexSettings'
import type { Workspace } from '../utils/workspaces'

type ShowToast = (message: string, type?: 'error' | 'success') => void

interface UseWorkspaceIndexingOptions {
  currentFolderPath: string | null
  workspaces: Workspace[]
  showWorkspaces: boolean
  showToast: ShowToast
}

export function useWorkspaceIndexing({
  currentFolderPath,
  workspaces,
  showWorkspaces,
  showToast,
}: UseWorkspaceIndexingOptions) {
  const [indexedFileCount, setIndexedFileCount] = useState(0)
  const [workspaceIndexCounts, setWorkspaceIndexCounts] = useState<Record<string, number>>({})
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null)
  const [indexSkippedItems, setIndexSkippedItems] = useState<IndexSkippedItem[]>([])
  const [indexDiagnosticsUpdatedAt, setIndexDiagnosticsUpdatedAt] = useState<number | null>(null)
  const [indexSettings, setIndexSettings] = useState<IndexSettings>(() => loadIndexSettings())
  const indexAbortControllerRef = useRef<AbortController | null>(null)
  const indexPolicy = useMemo(() => getEffectiveIndexPolicy(indexSettings), [indexSettings])

  const refreshIndexedFiles = useCallback(async (folderPath: string | null) => {
    if (!folderPath) {
      setIndexedFileCount(0)
      return
    }
    try {
      const count = await getIndexedFileCount(folderPath)
      setIndexedFileCount(count)
      setWorkspaceIndexCounts(prev => ({ ...prev, [folderPath]: count }))
    } catch (error) {
      console.error('Failed to load indexed files:', error)
      setIndexedFileCount(0)
      setWorkspaceIndexCounts(prev => ({ ...prev, [folderPath]: 0 }))
    }
  }, [])

  const refreshWorkspaceIndexCounts = useCallback(async () => {
    const paths = Array.from(new Set([
      ...workspaces.map(workspace => workspace.folderPath),
      currentFolderPath,
    ].filter((path): path is string => Boolean(path))))

    if (paths.length === 0) {
      setWorkspaceIndexCounts({})
      return
    }

    const entries = await Promise.all(paths.map(async folderPath => {
      try {
        return [folderPath, await getIndexedFileCount(folderPath)] as const
      } catch (error) {
        console.error('Failed to load workspace index count:', error)
        return [folderPath, 0] as const
      }
    }))
    setWorkspaceIndexCounts(Object.fromEntries(entries))
  }, [currentFolderPath, workspaces])

  const rebuildFolderIndex = useCallback(async (
    folderPath = currentFolderPath,
    options: { silent?: boolean; policy?: typeof indexPolicy } = {}
  ) => {
    if (!folderPath) {
      if (!options.silent) {
        showToast('请先打开一个文件夹', 'error')
      }
      return
    }

    indexAbortControllerRef.current?.abort()
    const controller = new AbortController()
    indexAbortControllerRef.current = controller
    setIsIndexing(true)
    setIndexProgress({
      phase: 'scanning',
      discoveredFiles: 0,
      indexedFiles: 0,
      skippedFiles: 0,
      currentPath: folderPath,
    })

    try {
      const activeIndexPolicy = options.policy ?? indexPolicy
      const skippedItems: IndexSkippedItem[] = []
      const persistSkippedItems = (nextItems: IndexSkippedItem[]) => {
        const updatedAt = Date.now()
        setIndexSkippedItems([...nextItems])
        setIndexDiagnosticsUpdatedAt(updatedAt)
        saveIndexDiagnostics(folderPath, nextItems, updatedAt)
      }
      setIndexSkippedItems([])
      setIndexDiagnosticsUpdatedAt(null)
      const allFiles = await getAllMarkdownFiles(folderPath, {
        signal: controller.signal,
        onProgress: progress => setIndexProgress(progress),
        onSkip: item => {
          skippedItems.push(item)
          persistSkippedItems(skippedItems)
        },
        maxFileSizeBytes: activeIndexPolicy.maxFileSizeBytes,
        skipDirectoryNames: activeIndexPolicy.skipDirectoryNames,
      })
      await indexFolder(folderPath, allFiles, {
        signal: controller.signal,
        onProgress: progress => setIndexProgress(progress),
        onSkip: item => {
          skippedItems.push(item)
          persistSkippedItems(skippedItems)
        },
        initialSkippedItems: skippedItems,
      })
      persistSkippedItems(skippedItems)
      await refreshIndexedFiles(folderPath)
      if (!options.silent) {
        showToast(skippedItems.length > 0
          ? `索引已更新：${allFiles.length} 个 Markdown 文件，跳过 ${skippedItems.length} 项`
          : `索引已更新：${allFiles.length} 个 Markdown 文件`)
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setIndexProgress(prev => ({
          phase: 'cancelled',
          discoveredFiles: prev?.discoveredFiles ?? 0,
          indexedFiles: prev?.indexedFiles ?? 0,
          skippedFiles: prev?.skippedFiles ?? 0,
          currentPath: prev?.currentPath,
          skippedItems: prev?.skippedItems,
        }))
        if (!options.silent) {
          showToast('索引已取消')
        }
        return
      }
      console.error('Failed to rebuild index:', error)
      if (!options.silent) {
        showToast(`索引失败：${String(error)}`, 'error')
      }
      throw error
    } finally {
      if (indexAbortControllerRef.current === controller) {
        indexAbortControllerRef.current = null
      }
      setIsIndexing(false)
    }
  }, [currentFolderPath, indexPolicy, refreshIndexedFiles, showToast])

  const cancelFolderIndex = useCallback(() => {
    indexAbortControllerRef.current?.abort()
  }, [])

  const clearIndexDiagnostics = useCallback(() => {
    setIndexSkippedItems([])
    setIndexDiagnosticsUpdatedAt(null)
    if (currentFolderPath) {
      clearSavedIndexDiagnostics(currentFolderPath)
    }
  }, [currentFolderPath])

  const saveIndexSettingsOnly = useCallback((settings: IndexSettings) => {
    const saved = saveIndexSettings(settings)
    setIndexSettings(saved)
    showToast('索引设置已保存，重新扫描后生效')
  }, [showToast])

  const saveIndexSettingsAndReindex = useCallback((settings: IndexSettings) => {
    const saved = saveIndexSettings(settings)
    const savedPolicy = getEffectiveIndexPolicy(saved)
    setIndexSettings(saved)
    showToast('索引设置已保存，开始重新扫描')
    void rebuildFolderIndex(currentFolderPath, { silent: true, policy: savedPolicy }).catch(error => {
      console.error('Failed to rebuild index after settings save:', error)
      showToast(`索引失败：${String(error)}`, 'error')
    })
  }, [currentFolderPath, rebuildFolderIndex, showToast])

  const resetWorkspaceIndexSettings = useCallback(() => {
    const defaults = resetIndexSettings()
    setIndexSettings(defaults)
    showToast('索引设置已恢复默认')
  }, [showToast])

  useEffect(() => {
    void refreshIndexedFiles(currentFolderPath)
  }, [currentFolderPath, refreshIndexedFiles])

  useEffect(() => {
    if (!currentFolderPath) {
      setIndexSkippedItems([])
      setIndexDiagnosticsUpdatedAt(null)
      return
    }
    const saved = loadSavedIndexDiagnostics(currentFolderPath)
    setIndexSkippedItems(saved.skippedItems)
    setIndexDiagnosticsUpdatedAt(saved.updatedAt)
  }, [currentFolderPath])

  useEffect(() => {
    if (showWorkspaces) {
      void refreshWorkspaceIndexCounts()
    }
  }, [refreshWorkspaceIndexCounts, showWorkspaces])

  return {
    indexedFileCount,
    workspaceIndexCounts,
    isIndexing,
    indexProgress,
    indexSkippedItems,
    indexDiagnosticsUpdatedAt,
    indexSettings,
    indexPolicy,
    rebuildFolderIndex,
    cancelFolderIndex,
    clearIndexDiagnostics,
    saveIndexSettingsOnly,
    saveIndexSettingsAndReindex,
    resetWorkspaceIndexSettings,
  }
}
