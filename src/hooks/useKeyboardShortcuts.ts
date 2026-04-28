import { useEffect } from 'react'
import { useUIStore, useTabStore } from '../stores'

export function useKeyboardShortcuts(
  scrollHistory: { back: () => number | null; forward: () => number | null },
  handleCloseSearch: () => void,
  updateFileSetting: (key: string, value: unknown) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement
      const isInput = target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)

      // Input guard: skip all shortcuts except Escape when in an input
      if (isInput && e.key !== 'Escape') {
        return
      }

      const { tabs, activeTabId, activeTab, newTab, closeTab, selectTab } = useTabStore.getState()
      const {
        fontSize, showSource, showSearch, showKeyboardShortcuts, showFocusMode,
        showQuickSwitcher, showExportPanel, showCommandPalette, showQuickJump,
        showGlobalSearch, showReadingStats, showCustomStyle, openPanel, closePanel,
        togglePanel, setFontSize, setShowSource
      } = useUIStore.getState()

      const activeTabFilePath = activeTab()?.filePath

      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        newTab()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        if (currentIndex !== -1) {
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length
          selectTab(tabs[nextIndex].id)
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        openPanel('search')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        togglePanel('globalSearch')
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const newSize = Math.min(fontSize + 2, 32)
        setFontSize(newSize)
        if (activeTabFilePath) updateFileSetting('fontSize', newSize)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        const newSize = Math.max(fontSize - 2, 12)
        setFontSize(newSize)
        if (activeTabFilePath) updateFileSetting('fontSize', newSize)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        const next = !showSource
        setShowSource(next)
        if (activeTabFilePath) updateFileSetting('showSource', next)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        openPanel('exportPanel')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        const { tabs: currentTabs, activeTabId: currentActiveId } = useTabStore.getState()
        const { isSplitView, setSplitView } = useUIStore.getState()
        if (isSplitView) {
          setSplitView(false, null)
        } else {
          const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId)
          const secondary = currentTabs[currentIndex + 1] || currentTabs[currentIndex - 1]
          if (secondary && secondary.id !== currentActiveId) {
            setSplitView(true, secondary.id)
          } else if (currentTabs[0] && currentTabs[0].id !== currentActiveId) {
            setSplitView(true, currentTabs[0].id)
          } else {
            setSplitView(true, null)
          }
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        window.print()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        openPanel('quickSwitcher')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        togglePanel('focusMode')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        openPanel('keyboardShortcuts')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        openPanel('quickJump')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        openPanel('commandPalette')
        return
      }
      if (e.key === 'F1') {
        e.preventDefault()
        openPanel('keyboardShortcuts')
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
          closePanel('commandPalette')
        } else if (showReadingStats) {
          closePanel('readingStats')
        } else if (showCustomStyle) {
          closePanel('customStyle')
        } else if (showQuickJump) {
          closePanel('quickJump')
        } else if (showGlobalSearch) {
          closePanel('globalSearch')
        } else if (showSearch) {
          handleCloseSearch()
        } else if (showKeyboardShortcuts) {
          closePanel('keyboardShortcuts')
        } else if (showFocusMode) {
          closePanel('focusMode')
        } else if (showQuickSwitcher) {
          closePanel('quickSwitcher')
        } else if (showExportPanel) {
          closePanel('exportPanel')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollHistory, handleCloseSearch, updateFileSetting])
}
