import { useState, useEffect, useCallback } from 'react'

interface SelectionInfo {
  text: string
  x: number
  y: number
  visible: boolean
}

export function useTextSelection(containerRef?: React.RefObject<HTMLElement | null>): SelectionInfo {
  const [selection, setSelection] = useState<SelectionInfo>({
    text: '',
    x: 0,
    y: 0,
    visible: false,
  })

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection((prev) => ({ ...prev, visible: false }))
      return
    }

    const text = sel.toString().trim()
    if (text.length < 2) {
      setSelection((prev) => ({ ...prev, visible: false }))
      return
    }

    // If containerRef is provided, check if selection is inside container
    if (containerRef?.current) {
      const range = sel.getRangeAt(0)
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setSelection((prev) => ({ ...prev, visible: false }))
        return
      }
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelection({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      visible: true,
    })
  }, [containerRef])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-ai-float-btn]')) {
        setSelection((prev) => ({ ...prev, visible: false }))
      }
    })
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  return selection
}
