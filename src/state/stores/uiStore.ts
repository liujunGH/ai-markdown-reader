/**
 * UI 状态 store（v2）
 *
 * 核心改动（决策 4）：
 *  - 18 个面板布尔字段合并为 Record<PanelName, boolean>，消除 switch 映射
 *  - 严格 selector 友好：消费方用 useUIStore(s => s.panels[name]) 单字段订阅
 *  - closeAllPanels 的特殊例外（outline/source/fileSidebar 保持）用集合表达
 *
 * 持久化：仍只持久化 fontSize（面板可见性是会话级）。
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { produce } from 'immer'

/** 面板名（对应可切换显示/隐藏的浮层/面板） */
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
  | 'indexDiagnostics'
  | 'workspaces'
  | 'readingTimeline'
  | 'readingTools'

/** 所有面板名（迭代用） */
export const ALL_PANELS: PanelName[] = [
  'outline', 'search', 'source', 'recent', 'keyboardShortcuts', 'focusMode',
  'quickSwitcher', 'fileSidebar', 'fileInfo', 'filePreview', 'exportPanel',
  'commandPalette', 'globalSearch', 'quickJump', 'indexDiagnostics',
  'workspaces', 'readingTimeline', 'readingTools',
]

/** closeAllPanels 时保持开启的面板（与旧 closeAllPanels 行为一致） */
const PANELS_PERSIST_ON_CLOSE_ALL: ReadonlySet<PanelName> = new Set([
  'outline',
  'source',
  'fileSidebar',
])

/** 默认面板状态 */
const DEFAULT_PANELS: Record<PanelName, boolean> = {
  outline: true,
  search: false,
  source: false,
  recent: false,
  keyboardShortcuts: false,
  focusMode: false,
  quickSwitcher: false,
  fileSidebar: false,
  fileInfo: false,
  filePreview: false,
  exportPanel: false,
  commandPalette: false,
  globalSearch: false,
  quickJump: false,
  indexDiagnostics: false,
  workspaces: false,
  readingTimeline: false,
  readingTools: false,
}

interface UIState {
  /** 面板可见性（selector 友好：useUIStore(s => s.panels.search)） */
  panels: Record<PanelName, boolean>
  /** 字号（持久化） */
  fontSize: number
  /** 分屏视图 */
  isSplitView: boolean
  secondaryTabId: string | null
  /** 高亮行（源码视图跳转用，频繁变化） */
  highlightedLine: number | undefined
}

interface UIActions {
  togglePanel: (name: PanelName) => void
  openPanel: (name: PanelName) => void
  closePanel: (name: PanelName) => void
  /** 关闭所有可关闭面板（outline/source/fileSidebar 保持） */
  closeAllPanels: () => void
  setFontSize: (size: number) => void
  setSplitView: (enabled: boolean, secondaryId?: string | null) => void
  setHighlightedLine: (line: number | undefined) => void
  /** 便捷方法（与旧 setShowSource/setShowOutline 对齐） */
  setShowSource: (show: boolean) => void
  setShowOutline: (show: boolean) => void
}

export type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      panels: { ...DEFAULT_PANELS },
      fontSize: 16,
      isSplitView: false,
      secondaryTabId: null,
      highlightedLine: undefined,

      togglePanel: (name) =>
        set(
          produce((state: UIState) => {
            state.panels[name] = !state.panels[name]
          })
        ),

      openPanel: (name) =>
        set(
          produce((state: UIState) => {
            state.panels[name] = true
          })
        ),

      closePanel: (name) =>
        set(
          produce((state: UIState) => {
            state.panels[name] = false
          })
        ),

      closeAllPanels: () =>
        set(
          produce((state: UIState) => {
            for (const name of ALL_PANELS) {
              if (!PANELS_PERSIST_ON_CLOSE_ALL.has(name)) {
                state.panels[name] = false
              }
            }
          })
        ),

      setFontSize: (size) => set({ fontSize: size }),

      setSplitView: (enabled, secondaryId) =>
        set({ isSplitView: enabled, secondaryTabId: secondaryId ?? null }),

      setHighlightedLine: (line) => set({ highlightedLine: line }),

      setShowSource: (show) =>
        set(
          produce((state: UIState) => {
            state.panels.source = show
          })
        ),

      setShowOutline: (show) =>
        set(
          produce((state: UIState) => {
            state.panels.outline = show
          })
        ),
    }),
    {
      name: 'ui-store-v2',
      storage: createJSONStorage(() => localStorage),
      // 仍只持久化 fontSize（面板可见性是会话级，与旧版一致）
      partialize: (state) => ({ fontSize: state.fontSize }),
    }
  )
)

/** selector 便捷 hook：取单个面板可见性 */
export function usePanelVisible(name: PanelName): boolean {
  return useUIStore((s) => s.panels[name])
}
