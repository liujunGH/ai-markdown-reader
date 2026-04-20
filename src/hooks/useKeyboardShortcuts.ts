import { useEffect, useRef } from 'react'
import { Tab } from '../types/Tab'

export function useKeyboardShortcuts(options: {
  activeTabId: string
  tabs: Tab[]
  fontSize: number
  showSource: boolean
  activeTabFilePath?: string
  showSearch: boolean
  showKeyboardShortcuts: boolean
  showFocusMode: boolean
  showQuickSwitcher: boolean
  showExportPanel: boolean
  showCommandPalette: boolean
  showQuickJump: boolean
  showGlobalSearch: boolean
  showReadingStats: boolean
  showCustomStyle: boolean
  handleNewTab: () => void
  handleTabClose: (id: string) => void
  handleTabSelect: (id: string) => void
  handleCloseSearch: () => void
  toggleSplitView: () => void
  updateFileSetting: (key: string, value: unknown) => void
  scrollHistory: { back: () => number | null; forward: () => number | null }
  setters: {
    setShowSearch: (v: boolean) => void
    setShowGlobalSearch: (v: boolean | ((p: boolean) => boolean)) => void
    setShowExportPanel: (v: boolean) => void
    setShowQuickSwitcher: (v: boolean) => void
    setShowFocusMode: (v: boolean | ((p: boolean) => boolean)) => void
    setShowKeyboardShortcuts: (v: boolean) => void
    setShowQuickJump: (v: boolean) => void
    setShowCommandPalette: (v: boolean) => void
    setShowReadingStats: (v: boolean) => void
    setShowCustomStyle: (v: boolean) => void
    setFontSize: (v: number | ((p: number) => number)) => void
    setShowSource: (v: boolean | ((p: boolean) => boolean)) => void
  }
}) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        activeTabId, tabs, fontSize, showSource, activeTabFilePath,
        showSearch, showKeyboardShortcuts, showFocusMode, showQuickSwitcher,
        showExportPanel, showCommandPalette, showQuickJump, showGlobalSearch,
        showReadingStats, showCustomStyle,
        handleNewTab, handleTabClose, handleTabSelect, handleCloseSearch,
        toggleSplitView, updateFileSetting, scrollHistory,
        setters
      } = optionsRef.current

      const target = document.activeElement as HTMLElement
      const isInput = target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)

      // Input guard: skip all shortcuts except Escape when in an input
      if (isInput && e.key !== 'Escape') {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        handleNewTab()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) handleTabClose(activeTabId)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        if (currentIndex !== -1) {
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length
          handleTabSelect(tabs[nextIndex].id)
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setters.setShowSearch(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setters.setShowGlobalSearch(prev => !prev)
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const newSize = Math.min(fontSize + 2, 32)
        setters.setFontSize(newSize)
        if (activeTabFilePath) updateFileSetting('fontSize', newSize)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        const newSize = Math.max(fontSize - 2, 12)
        setters.setFontSize(newSize)
        if (activeTabFilePath) updateFileSetting('fontSize', newSize)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        const next = !showSource
        setters.setShowSource(next)
        if (activeTabFilePath) updateFileSetting('showSource', next)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setters.setShowExportPanel(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleSplitView()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        window.print()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        setters.setShowQuickSwitcher(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setters.setShowFocusMode(prev => !prev)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setters.setShowKeyboardShortcuts(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setters.setShowQuickJump(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setters.setShowCommandPalette(true)
        return
      }
      if (e.key === 'F1') {
        e.preventDefault()
        setters.setShowKeyboardShortcuts(true)
        return
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
        return
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        const pos = scrollHistory.back()
        if (pos !== null) {
          const main = document.querySelector('main')
          if (main) main.scrollTop = pos
        }
        return
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        const pos = scrollHistory.forward()
        if (pos !== null) {
          const main = document.querySelector('main')
          if (main) main.scrollTop = pos
        }
        return
      }
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setters.setShowCommandPalette(false)
        } else if (showReadingStats) {
          setters.setShowReadingStats(false)
        } else if (showCustomStyle) {
          setters.setShowCustomStyle(false)
        } else if (showQuickJump) {
          setters.setShowQuickJump(false)
        } else if (showGlobalSearch) {
          setters.setShowGlobalSearch(false)
        } else if (showSearch) {
          handleCloseSearch()
        } else if (showKeyboardShortcuts) {
          setters.setShowKeyboardShortcuts(false)
        } else if (showFocusMode) {
          setters.setShowFocusMode(false)
        } else if (showQuickSwitcher) {
          setters.setShowQuickSwitcher(false)
        } else if (showExportPanel) {
          setters.setShowExportPanel(false)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
