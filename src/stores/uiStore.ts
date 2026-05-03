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
  | 'documentHealth'
  | 'knowledgeHealth'
  | 'imageInventory'
  | 'backlinks'
  | 'markdownGraph'
  | 'missingLinks'
  | 'workspaces'
  | 'readingTimeline'

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
  showDocumentHealth: boolean
  showKnowledgeHealth: boolean
  showImageInventory: boolean
  showBacklinks: boolean
  showMarkdownGraph: boolean
  showMissingLinks: boolean
  showWorkspaces: boolean
  showReadingTimeline: boolean
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
    case 'documentHealth': return { showDocumentHealth: value }
    case 'knowledgeHealth': return { showKnowledgeHealth: value }
    case 'imageInventory': return { showImageInventory: value }
    case 'backlinks': return { showBacklinks: value }
    case 'markdownGraph': return { showMarkdownGraph: value }
    case 'missingLinks': return { showMissingLinks: value }
    case 'workspaces': return { showWorkspaces: value }
    case 'readingTimeline': return { showReadingTimeline: value }
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
    case 'documentHealth': return state.showDocumentHealth
    case 'knowledgeHealth': return state.showKnowledgeHealth
    case 'imageInventory': return state.showImageInventory
    case 'backlinks': return state.showBacklinks
    case 'markdownGraph': return state.showMarkdownGraph
    case 'missingLinks': return state.showMissingLinks
    case 'workspaces': return state.showWorkspaces
    case 'readingTimeline': return state.showReadingTimeline
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
      showDocumentHealth: false,
      showKnowledgeHealth: false,
      showImageInventory: false,
      showBacklinks: false,
      showMarkdownGraph: false,
      showMissingLinks: false,
      showWorkspaces: false,
      showReadingTimeline: false,
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
        showFileInfo: false,
        showFilePreview: false,
        showRecent: false,
        showDocumentHealth: false,
        showKnowledgeHealth: false,
        showImageInventory: false,
        showBacklinks: false,
        showMarkdownGraph: false,
        showMissingLinks: false,
        showWorkspaces: false,
        showReadingTimeline: false,
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
