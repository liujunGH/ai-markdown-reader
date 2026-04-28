import { useState, useCallback } from 'react'

const MAX_DRAG_FILE_SIZE = 5 * 1024 * 1024 // 5MB for drag-and-drop

export interface UseDragAndDropReturn {
  isDraggingOver: boolean
  dragProps: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

export function useDragAndDrop(
  onFileOpen: (content: string, name: string, filePath: string) => void,
  onError?: (message: string) => void
): UseDragAndDropReturn {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (
      (e.relatedTarget as Node) === null ||
      !document.contains(e.relatedTarget as Node)
    ) {
      setIsDraggingOver(false)
    }
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(false)

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        return
      }

      // Check file size for drag-and-drop (browser-side check before reading)
      if (file.size > MAX_DRAG_FILE_SIZE) {
        onError?.(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，建议用其他编辑器打开`)
        return
      }

      if (window.electronAPI && (file as any).path) {
        const result = await window.electronAPI.readFile((file as any).path)
        if (result.success && result.content !== undefined) {
          onFileOpen(result.content, file.name, (file as any).path)
        } else {
          onError?.(result.error || '读取文件失败')
        }
      } else {
        const fileContent = await file.text()
        onFileOpen(fileContent, file.name, '')
      }
    },
    [onFileOpen, onError]
  )

  return {
    isDraggingOver,
    dragProps: {
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
    },
  }
}
