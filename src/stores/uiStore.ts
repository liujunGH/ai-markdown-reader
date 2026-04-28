import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PanelName =
  | 'outline'
  | 'search'
  | 'source'
  | 'recent'
  | 'keyboardShortcuts'
  | 'focusMode'
  | 'quickSwitcher'
  | 'fileSidebar'
  | 'fileInfo'
  | 'filePreview'
  | 'exportPanel'
  | 'commandPalette'
  | 'globalSearch'
  | 'quickJump'
  | 'readingStats'
  | 'customStyle'
  | 'diagnostics'

interface UIState {
  showOutline: boolean
  showSearch: boolean
  showSource: boolean
  showRecent: boolean
  showKeyboardShortcuts: boolean
  showFocusMode: boolean
  showQuickSwitcher: boolean
  showFileSidebar: boolean
  showFileInfo: boolean
  showFilePreview: boolean
  showExportPanel: boolean
  showCommandPalette: boolean
  showGlobalSearch: boolean
  showQuickJump: boolean
  showReadingStats: boolean
  showCustomStyle: boolean
  showDiagnostics: boolean
  fontSize: number
  isSplitView: boolean
  secondaryTabId: string | null
  highlightedLine: number | undefined
}

interface UIActions {
  togglePanel: (name: PanelName) => void
  openPanel: (name: PanelName) => void
  closePanel: (name: PanelName) => void
  closeAllPanels: () => void
  setFontSize: (size: number) => void
  setSplitView: (enabled: boolean, secondaryId?: string | null) => void
  setHighlightedLine: (line: number | undefined) => void
  setShowSource: (show: boolean) => void
  setShowOutline: (show: boolean) => void
}

export type UIStore = UIState & UIActions

function panelSetter(_state: UIState, name: PanelName, value: boolean): Partial<UIState> {
  switch (name) {
    case 'outline': return { showOutline: value }
    case 'search': return { showSearch: value }
    case 'source': return { showSource: value }
    case 'recent': return { showRecent: value }
    case 'keyboardShortcuts': return { showKeyboardShortcuts: value }
    case 'focusMode': return { showFocusMode: value }
    case 'quickSwitcher': return { showQuickSwitcher: value }
    case 'fileSidebar': return { showFileSidebar: value }
    case 'fileInfo': return { showFileInfo: value }
    case 'filePreview': return { showFilePreview: value }
    case 'exportPanel': return { showExportPanel: value }
    case 'commandPalette': return { showCommandPalette: value }
    case 'globalSearch': return { showGlobalSearch: value }
    case 'quickJump': return { showQuickJump: value }
    case 'readingStats': return { showReadingStats: value }
    case 'customStyle': return { showCustomStyle: value }
    case 'diagnostics': return { showDiagnostics: value }
    default:
      return {}
  }
}

function getPanelValue(state: UIState, name: PanelName): boolean {
  switch (name) {
    case 'outline': return state.showOutline
    case 'search': return state.showSearch
    case 'source': return state.showSource
    case 'recent': return state.showRecent
    case 'keyboardShortcuts': return state.showKeyboardShortcuts
    case 'focusMode': return state.showFocusMode
    case 'quickSwitcher': return state.showQuickSwitcher
    case 'fileSidebar': return state.showFileSidebar
    case 'fileInfo': return state.showFileInfo
    case 'filePreview': return state.showFilePreview
    case 'exportPanel': return state.showExportPanel
    case 'commandPalette': return state.showCommandPalette
    case 'globalSearch': return state.showGlobalSearch
    case 'quickJump': return state.showQuickJump
    case 'readingStats': return state.showReadingStats
    case 'customStyle': return state.showCustomStyle
    case 'diagnostics': return state.showDiagnostics
    default:
      return false
  }
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      showOutline: true,
      showSearch: false,
      showSource: false,
      showRecent: false,
      showKeyboardShortcuts: false,
      showFocusMode: false,
      showQuickSwitcher: false,
      showFileSidebar: false,
      showFileInfo: false,
      showFilePreview: false,
      showExportPanel: false,
      showCommandPalette: false,
      showGlobalSearch: false,
      showQuickJump: false,
      showReadingStats: false,
      showCustomStyle: false,
      showDiagnostics: false,
      fontSize: 16,
      isSplitView: false,
      secondaryTabId: null,
      highlightedLine: undefined,

      togglePanel: (name) => {
        const state = get()
        set(panelSetter(state, name, !getPanelValue(state, name)))
      },
      openPanel: (name) => set(panelSetter(get(), name, true)),
      closePanel: (name) => set(panelSetter(get(), name, false)),
      closeAllPanels: () => set({
        showSearch: false,
        showKeyboardShortcuts: false,
        showFocusMode: false,
        showQuickSwitcher: false,
        showExportPanel: false,
        showCommandPalette: false,
        showQuickJump: false,
        showGlobalSearch: false,
        showReadingStats: false,
        showCustomStyle: false,
        showDiagnostics: false,
        showFileInfo: false,
        showFilePreview: false,
        showRecent: false,
      }),
      setFontSize: (size) => set({ fontSize: size }),
      setSplitView: (enabled, secondaryId = null) => set({ isSplitView: enabled, secondaryTabId: secondaryId }),
      setHighlightedLine: (line) => set({ highlightedLine: line }),
      setShowSource: (show) => set({ showSource: show }),
      setShowOutline: (show) => set({ showOutline: show }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ fontSize: state.fontSize }),
    }
  )
)
