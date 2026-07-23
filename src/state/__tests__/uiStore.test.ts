import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUIStore, usePanelVisible, ALL_PANELS } from '../stores/uiStore'

/**
 * uiStore v2 测试。
 *
 * 核心验证（对应决策 4）：
 *  - 18 个面板用 Record<PanelName, boolean>，selector 友好
 *  - toggle/open/close 正确切换
 *  - closeAllPanels 保留 outline/source/fileSidebar
 *  - usePanelVisible 单字段订阅
 */
beforeEach(() => {
  useUIStore.setState({
    panels: {
      outline: true, search: false, source: false, recent: false,
      keyboardShortcuts: false, focusMode: false, quickSwitcher: false,
      fileSidebar: false, fileInfo: false, filePreview: false, exportPanel: false,
      commandPalette: false, globalSearch: false, quickJump: false,
      indexDiagnostics: false, workspaces: false, readingTimeline: false,
      readingTools: false,
    },
    fontSize: 16,
    isSplitView: false,
    secondaryTabId: null,
    highlightedLine: undefined,
  })
})

describe('uiStore — 面板切换', () => {
  it('togglePanel 翻转可见性', () => {
    act(() => useUIStore.getState().togglePanel('search'))
    expect(useUIStore.getState().panels.search).toBe(true)
    act(() => useUIStore.getState().togglePanel('search'))
    expect(useUIStore.getState().panels.search).toBe(false)
  })

  it('openPanel/closePanel', () => {
    act(() => useUIStore.getState().openPanel('globalSearch'))
    expect(useUIStore.getState().panels.globalSearch).toBe(true)
    act(() => useUIStore.getState().closePanel('globalSearch'))
    expect(useUIStore.getState().panels.globalSearch).toBe(false)
  })
})

describe('uiStore — closeAllPanels 保留项', () => {
  it('关闭所有可关闭面板，但保留 outline/source/fileSidebar', () => {
    // 先全部打开
    act(() => {
      for (const p of ALL_PANELS) useUIStore.getState().openPanel(p)
    })
    act(() => useUIStore.getState().closeAllPanels())
    const panels = useUIStore.getState().panels
    // 保留项仍开
    expect(panels.outline).toBe(true)
    expect(panels.source).toBe(true)
    expect(panels.fileSidebar).toBe(true)
    // 其余关闭
    expect(panels.search).toBe(false)
    expect(panels.focusMode).toBe(false)
    expect(panels.globalSearch).toBe(false)
  })
})

describe('uiStore — selector 友好', () => {
  it('usePanelVisible 单字段订阅', () => {
    const { result } = renderHook(() => usePanelVisible('search'))
    expect(result.current).toBe(false)
    act(() => useUIStore.getState().openPanel('search'))
    expect(result.current).toBe(true)
  })
})

describe('uiStore — 其它状态', () => {
  it('setFontSize', () => {
    act(() => useUIStore.getState().setFontSize(20))
    expect(useUIStore.getState().fontSize).toBe(20)
  })

  it('setSplitView', () => {
    act(() => useUIStore.getState().setSplitView(true, 'tab-2'))
    expect(useUIStore.getState().isSplitView).toBe(true)
    expect(useUIStore.getState().secondaryTabId).toBe('tab-2')
  })

  it('setHighlightedLine', () => {
    act(() => useUIStore.getState().setHighlightedLine(42))
    expect(useUIStore.getState().highlightedLine).toBe(42)
  })

  it('setShowSource/setShowOutline 便捷方法', () => {
    act(() => useUIStore.getState().setShowSource(true))
    expect(useUIStore.getState().panels.source).toBe(true)
    act(() => useUIStore.getState().setShowOutline(false))
    expect(useUIStore.getState().panels.outline).toBe(false)
  })
})
