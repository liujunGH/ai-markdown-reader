import { useState, useCallback } from 'react'

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
  onFileOpen: (content: string, name: string, filePath: string) => void
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

      if (window.electronAPI && (file as any).path) {
        const result = await window.electronAPI.readFile((file as any).path)
        if (result.success && result.content !== undefined) {
          onFileOpen(result.content, file.name, (file as any).path)
        } else {
          console.error(result.error || '读取文件失败')
        }
      } else {
        const fileContent = await file.text()
        onFileOpen(fileContent, file.name, '')
      }
    },
    [onFileOpen]
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
