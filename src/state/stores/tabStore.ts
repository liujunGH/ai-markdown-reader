/**
 * 标签状态 store（v2）
 *
 * 核心改动（决策 2/4）：Tab 只存元数据，content 移到 DocumentCache（LRU 资源层）。
 *  - 旧 tabStore 把每个标签的完整 content（单文件上限 50MB）塞进 Zustand state，
 *    10 个大文档 = 数百 MB 全在响应式状态树
 *  - 新 store 状态树永远很小（只有元数据），内存有硬上限（DocumentCache LRU）
 *
 * 持久化统一为单一机制（zustand persist），去掉旧代码的双持久化
 * （session-tabs 手动快照 + persist）。
 *
 * 模块级 subscribe 的 IPC 副作用（registerWindowFiles / addRecentFile）保留，
 * 因为它们是跨进程一致性的必要耦合，但用显式的 effect 形式。
 */
import { create } from 'zustand'
import { produce } from 'immer'
import type { TabColor, TabContentStatus } from '../../types/Tab'
import type { RecentFile } from '../../../shared'
import { DEFAULT_MAX_TABS } from '../../../shared'

/** Tab 元数据（不含 content —— content 在 DocumentCache） */
export interface TabMeta {
  id: string
  name: string
  filePath?: string
  isPinned?: boolean
  size?: number
  lastModified?: number
  color?: TabColor
  /** content 在 DocumentCache 的就绪状态 */
  contentStatus?: TabContentStatus
  contentError?: string
}

/** 持久化的 Tab（更精简，恢复时用） */
interface StoredTabMeta {
  id: string
  name: string
  filePath?: string
  isPinned?: boolean
  size?: number
  lastModified?: number
  color?: TabColor
}

const SESSION_TABS_KEY = 'session-tabs'
const SESSION_ACTIVE_TAB_KEY = 'session-active-tab'
const MAX_CLOSED_TABS = 10

interface TabState {
  tabs: TabMeta[]
  activeTabId: string
  isRestoringSession: boolean
  failedRestores: string[]
  closedTabs: TabMeta[]
  maxTabs: number
}

interface TabActions {
  activeTab: () => TabMeta | undefined
  newTab: () => void
  selectTab: (id: string) => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  pinTab: (id: string) => void
  unpinTab: (id: string) => void
  setTabColor: (id: string, color: TabColor) => void
  restoreTab: () => void
  /** 打开文件（content 不传入，按需从 DocumentCache 回源） */
  openFile: (name: string, filePath: string, size?: number, lastModified?: number) => string
  openRecentFile: (file: RecentFile) => Promise<string | null>
  setContentStatus: (id: string, status: TabContentStatus, error?: string) => void
  setTabName: (id: string, name: string) => void
  restoreSession: () => Promise<void>
  clearFailedRestores: () => void
}

export type TabStore = TabState & TabActions

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function getWelcomeTab(): TabMeta {
  return {
    id: generateTabId(),
    name: '欢迎使用.md',
    contentStatus: 'ready',
  }
}

/** 从 localStorage 读持久化的会话（兼容旧 session-tabs 格式） */
function readStoredSession(): { tabs: StoredTabMeta[]; activeTabId: string } {
  try {
    const raw = localStorage.getItem(SESSION_TABS_KEY)
    const activeId = localStorage.getItem(SESSION_ACTIVE_TAB_KEY) || ''
    if (!raw) return { tabs: [], activeTabId: activeId }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { tabs: parsed as StoredTabMeta[], activeTabId: activeId }
    }
  } catch {
    // 损坏的存储，忽略
  }
  return { tabs: [], activeTabId: '' }
}

function writeStoredSession(tabs: TabMeta[], activeTabId: string): void {
  try {
    const stored: StoredTabMeta[] = tabs.map((t) => ({
      id: t.id,
      name: t.name,
      filePath: t.filePath,
      isPinned: t.isPinned,
      size: t.size,
      lastModified: t.lastModified,
      color: t.color,
    }))
    localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(stored))
    localStorage.setItem(SESSION_ACTIVE_TAB_KEY, activeTabId)
  } catch {
    // 配额满或不可用，静默
  }
}

export const useTabStore = create<TabStore>()((set, get) => ({
      tabs: [],
      activeTabId: '',
      isRestoringSession: false,
      failedRestores: [],
      closedTabs: [],
      maxTabs: DEFAULT_MAX_TABS,

      activeTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find((t) => t.id === activeTabId)
      },

      newTab: () =>
        set(
          produce((state: TabState) => {
            if (state.tabs.length >= state.maxTabs) return
            const tab = getWelcomeTab()
            state.tabs.push(tab)
            state.activeTabId = tab.id
          })
        ),

      selectTab: (id) =>
        set(
          produce((state: TabState) => {
            if (state.tabs.some((t) => t.id === id)) {
              state.activeTabId = id
            }
          })
        ),

      closeTab: (id) =>
        set(
          produce((state: TabState) => {
            const idx = state.tabs.findIndex((t) => t.id === id)
            if (idx === -1) return
            const [closed] = state.tabs.splice(idx, 1)
            if (closed) {
              // 轻量化后入 closedTabs（content 已不在 store，无需额外处理）
              state.closedTabs.unshift(closed)
              if (state.closedTabs.length > MAX_CLOSED_TABS) {
                state.closedTabs.length = MAX_CLOSED_TABS
              }
            }
            // 切换激活标签
            if (state.activeTabId === id) {
              state.activeTabId = state.tabs[idx]?.id || state.tabs[idx - 1]?.id || ''
            }
          })
        ),

      closeOtherTabs: (id) =>
        set(
          produce((state: TabState) => {
            // 被关的标签（去固定）推入 closedTabs 供恢复（与旧版一致）
            const closed = state.tabs.filter((t) => t.id !== id && !t.isPinned)
            state.tabs = state.tabs.filter((t) => t.id === id || t.isPinned)
            for (const c of closed) {
              state.closedTabs.unshift(c)
            }
            if (state.closedTabs.length > MAX_CLOSED_TABS) {
              state.closedTabs.length = MAX_CLOSED_TABS
            }
            state.activeTabId = id
          })
        ),

      closeAllTabs: () =>
        set(
          produce((state: TabState) => {
            const welcome = getWelcomeTab()
            state.tabs = [welcome]
            state.activeTabId = welcome.id
          })
        ),

      reorderTabs: (fromIndex, toIndex) =>
        set(
          produce((state: TabState) => {
            if (fromIndex < 0 || fromIndex >= state.tabs.length) return
            if (toIndex < 0 || toIndex >= state.tabs.length) return
            const [moved] = state.tabs.splice(fromIndex, 1)
            state.tabs.splice(toIndex, 0, moved)
          })
        ),

      pinTab: (id) =>
        set(
          produce((state: TabState) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (tab) {
              tab.isPinned = true
              // 固定标签移到顶部
              state.tabs = state.tabs.filter((t) => t.id !== id)
              const firstUnpinned = state.tabs.findIndex((t) => !t.isPinned)
              if (firstUnpinned === -1) state.tabs.push(tab)
              else state.tabs.splice(firstUnpinned, 0, tab)
            }
          })
        ),

      unpinTab: (id) =>
        set(
          produce((state: TabState) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (tab) {
              tab.isPinned = false
              // 移到固定标签之后
              state.tabs = state.tabs.filter((t) => t.id !== id)
              const firstUnpinned = state.tabs.findIndex((t) => !t.isPinned)
              if (firstUnpinned === -1) state.tabs.push(tab)
              else state.tabs.splice(firstUnpinned, 0, tab)
            }
          })
        ),

      setTabColor: (id, color) =>
        set(
          produce((state: TabState) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (tab) tab.color = color === 'none' ? undefined : color
          })
        ),

      restoreTab: () =>
        set(
          produce((state: TabState) => {
            if (state.closedTabs.length === 0) return
            const tab = state.closedTabs.shift()!
            // 已存在同名同路径则仅激活
            const existing = state.tabs.find(
              (t) => t.name === tab.name && t.filePath === tab.filePath
            )
            if (existing) {
              state.activeTabId = existing.id
              return
            }
            if (state.tabs.length >= state.maxTabs) {
              // 淘汰最旧非激活非固定
              const victimIdx = state.tabs.findIndex((t) => !t.isPinned && t.id !== state.activeTabId)
              if (victimIdx !== -1) state.tabs.splice(victimIdx, 1)
            }
            // 恢复的文件标签需要重新回源 content
            if (tab.filePath) tab.contentStatus = 'pending'
            state.tabs.push(tab)
            state.activeTabId = tab.id
          })
        ),

      openFile: (name, filePath, size, lastModified) => {
        let newTabId = ''
        set(
          produce((state: TabState) => {
            // 同路径未修改标签复用
            const existing = state.tabs.find((t) => t.filePath === filePath)
            if (existing) {
              existing.name = name
              if (size !== undefined) existing.size = size
              if (lastModified !== undefined) existing.lastModified = lastModified
              existing.contentStatus = 'pending'
              state.activeTabId = existing.id
              newTabId = existing.id
              return
            }
            if (state.tabs.length >= state.maxTabs) {
              const victimIdx = state.tabs.findIndex((t) => !t.isPinned && t.id !== state.activeTabId)
              if (victimIdx !== -1) state.tabs.splice(victimIdx, 1)
            }
            const tab: TabMeta = {
              id: generateTabId(),
              name,
              filePath,
              size,
              lastModified,
              contentStatus: 'pending',
            }
            state.tabs.push(tab)
            state.activeTabId = tab.id
            newTabId = tab.id
          })
        )
        return newTabId
      },

      openRecentFile: async (file) => {
        // content 按需回源，这里只建标签
        return get().openFile(file.name, file.filePath)
      },

      setContentStatus: (id, status, error) =>
        set(
          produce((state: TabState) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (tab) {
              tab.contentStatus = status
              tab.contentError = error
            }
          })
        ),

      setTabName: (id, name) =>
        set(
          produce((state: TabState) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (tab) tab.name = name
          })
        ),

      restoreSession: async () => {
        const { tabs: stored, activeTabId } = readStoredSession()
        if (stored.length === 0) {
          // 无会话，建欢迎页
          const welcome = getWelcomeTab()
          set({ tabs: [welcome], activeTabId: welcome.id, isRestoringSession: false })
          return
        }
        set(
          produce((state: TabState) => {
            state.isRestoringSession = true
            state.tabs = stored.map((t) => ({
              ...t,
              // 文件标签标记 pending，激活时按需回源
              contentStatus: t.filePath ? 'pending' : 'ready',
            }))
            state.activeTabId = activeTabId && stored.some((t) => t.id === activeTabId) ? activeTabId : stored[0].id
          })
        )
        set({ isRestoringSession: false })

        // 主动回源激活标签 content（确保恢复后文档能渲染）
        // useDocument 也会做这件事，但显式调用避免时序依赖
        const activeId = activeTabId && stored.some((t) => t.id === activeTabId) ? activeTabId : stored[0].id
        const activeStored = stored.find((t) => t.id === activeId)
        if (activeStored?.filePath) {
          try {
            const { setContent } = await import('../../resources/DocumentCache')
            const api = window.electronAPI
            if (api) {
              const result = await api.readFile(activeStored.filePath)
              if (result.success && result.content !== undefined) {
                setContent(activeId, result.content, activeStored.filePath)
                get().setContentStatus(activeId, 'ready')
              } else {
                get().setContentStatus(activeId, 'error', result.error)
              }
            }
          } catch {
            // 回源失败不影响应用启动，useDocument 会显示错误状态
          }
        }
      },

      clearFailedRestores: () =>
        set(
          produce((state: TabState) => {
            state.failedRestores = []
          })
        ),
    })
)

// ============================================================
// 会话快照副作用：tabs/activeTabId 变化时持久化 + 通知主进程
// 保留旧 tabStore 的跨进程一致性耦合（registerWindowFiles/addRecentFile）
// ============================================================
let sideEffectInstalled = false
export function installTabSideEffects(): void {
  if (sideEffectInstalled) return
  sideEffectInstalled = true

  let lastSnapshot = ''
  useTabStore.subscribe((state, prev) => {
    if (state.isRestoringSession) return
    // tabs 或 activeTabId 变化才处理
    if (state.tabs === prev.tabs && state.activeTabId === prev.activeTabId) return

    // 1. 持久化会话快照（tabs 或 activeTabId 任一变化都写）
    writeStoredSession(state.tabs, state.activeTabId)

    // 2. 仅 tabs 变化时通知主进程当前窗口文件（activeTabId 变化但文件列表不变则不重复调）
    if (state.tabs !== prev.tabs) {
      const filePaths = state.tabs.map((t) => t.filePath).filter(Boolean) as string[]
      if (window.electronAPI?.registerWindowFiles) {
        void window.electronAPI.registerWindowFiles(filePaths)
      }
    }

    // 3. 激活标签变化时加最近文件（去重避免频繁写：同文件+同修改时间不重复加）
    if (state.activeTabId !== prev.activeTabId) {
      const active = state.tabs.find((t) => t.id === state.activeTabId)
      const snapshotKey = `${active?.filePath}|${active?.lastModified}`
      if (active?.filePath && snapshotKey !== lastSnapshot) {
        lastSnapshot = snapshotKey
        if (window.electronAPI?.addRecentFile) {
          void window.electronAPI.addRecentFile({ name: active.name, filePath: active.filePath })
        }
      }
    }
  })
}
