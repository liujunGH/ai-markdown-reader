import { useState, useCallback, useRef } from 'react'
import { semanticSearch, indexFolder, SearchResult } from '../services/semanticIndex'
import { useToastStore } from '../stores/toastStore'
import { getEmbedder, ProgressCallback } from '../services/embedding'

export interface SemanticSearchState {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  isIndexing: boolean
  isModelLoading: boolean
  modelLoadingProgress: string
  indexedCount: number
  totalFiles: number
  currentFile: string
  error: string | null
  search: () => Promise<void>
  indexFolder: (folderPath: string) => Promise<void>
}

export function useSemanticSearch(): SemanticSearchState {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState('')
  const [indexedCount, setIndexedCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((state) => state.showToast)
  const abortRef = useRef(false)

  const handleEmbeddingProgress: ProgressCallback = useCallback((progress) => {
    if (progress.status === 'progress' && progress.file) {
      setModelLoadingProgress(`下载模型中: ${progress.file} (${Math.round((progress.progress ?? 0) * 100)}%)`)
    } else if (progress.status === 'done') {
      setModelLoadingProgress('模型加载完成')
    } else if (progress.status === 'initiate' && progress.file) {
      setModelLoadingProgress(`开始下载: ${progress.file}`)
    } else {
      setModelLoadingProgress(`模型加载中: ${progress.status}`)
    }
  }, [])

  const search = useCallback(async () => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setError(null)
    setIsLoading(true)
    setIsModelLoading(false)

    try {
      // Pre-warm embedder if needed
      setIsModelLoading(true)
      await getEmbedder(handleEmbeddingProgress)
      setIsModelLoading(false)

      const searchResults = await semanticSearch(query.trim(), 10)
      setResults(searchResults)
    } catch (err) {
      const message = err instanceof Error ? err.message : '搜索失败'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
      setIsModelLoading(false)
    }
  }, [query, showToast, handleEmbeddingProgress])

  const indexFolderCallback = useCallback(async (folderPath: string) => {
    if (!folderPath) {
      showToast('请先打开一个文件夹', 'error')
      return
    }

    setError(null)
    setIsIndexing(true)
    setIndexedCount(0)
    setTotalFiles(0)
    setCurrentFile('')
    setIsModelLoading(false)
    abortRef.current = false

    try {
      // Pre-warm embedder if needed
      setIsModelLoading(true)
      await getEmbedder(handleEmbeddingProgress)
      setIsModelLoading(false)

      await indexFolder(
        folderPath,
        (indexed, total, filePath) => {
          if (abortRef.current) return
          setIndexedCount(indexed)
          setTotalFiles(total)
          setCurrentFile(filePath)
        },
        handleEmbeddingProgress
      )

      if (!abortRef.current) {
        showToast('语义索引构建完成', 'success')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '索引构建失败'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsIndexing(false)
      setIsModelLoading(false)
    }
  }, [showToast, handleEmbeddingProgress])

  return {
    query,
    setQuery,
    results,
    isLoading,
    isIndexing,
    isModelLoading,
    modelLoadingProgress,
    indexedCount,
    totalFiles,
    currentFile,
    error,
    search,
    indexFolder: indexFolderCallback,
  }
}
