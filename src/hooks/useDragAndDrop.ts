import { useState, useEffect } from 'react'

const MAX_DRAG_FILE_SIZE = 5 * 1024 * 1024 // 5MB for drag-and-drop

export interface UseDragAndDropReturn {
  isDraggingOver: boolean
}

export function useDragAndDrop(
  onFileOpen: (content: string, name: string, filePath: string) => void,
  onError?: (message: string) => void
): UseDragAndDropReturn {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  useEffect(() => {
    let dragCounter = 0
    let isFileDrag = false

    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return
      isFileDrag = true
      dragCounter += 1
      if (dragCounter === 1) {
        setIsDraggingOver(true)
      }
    }

    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag) return
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const onDragLeave = (_e: DragEvent) => {
      if (!isFileDrag) return
      dragCounter -= 1
      if (dragCounter <= 0) {
        dragCounter = 0
        isFileDrag = false
        setIsDraggingOver(false)
      }
    }

    const onDrop = async (e: DragEvent) => {
      if (!isFileDrag) return
      e.preventDefault()
      dragCounter = 0
      isFileDrag = false
      setIsDraggingOver(false)

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        onError?.('仅支持 .md 和 .markdown 文件')
        return
      }

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
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFileOpen, onError])

  return { isDraggingOver }
}
