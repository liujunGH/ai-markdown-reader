import { useState, useCallback, useMemo } from 'react'

export interface UseScrollHistoryReturn {
  push: (position: number) => void
  back: () => number | null
  forward: () => number | null
  canGoBack: boolean
  canGoForward: boolean
  clear: () => void
}

export function useScrollHistory(maxSize = 50): UseScrollHistoryReturn {
  const [history, setHistory] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const push = useCallback((position: number) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(position)
      if (newHistory.length > maxSize) newHistory.shift()
      return newHistory
    })
    setCurrentIndex(prev => Math.min(prev + 1, maxSize - 1))
  }, [currentIndex, maxSize])

  const back = useCallback(() => {
    if (currentIndex <= 0) return null
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  const forward = useCallback(() => {
    if (currentIndex >= history.length - 1) return null
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  const clear = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  return useMemo(() => ({
    push,
    back,
    forward,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < history.length - 1,
    clear
  }), [push, back, forward, clear, currentIndex, history.length])
}
