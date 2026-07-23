import { describe, expect, it, beforeEach } from 'vitest'
import { useTabStore } from '../stores/tabStore'

/**
 * tabStore v2 测试。
 *
 * 核心验证（对应决策 2/4）：
 *  - Tab 只存元数据，不含 content（content 在 DocumentCache）
 *  - openFile 同路径复用、超限淘汰、建标签后激活
 *  - closeTab 后激活标签正确切换
 *  - pin/unpin 位置调整
 */
beforeEach(() => {
  // 重置 store 到初始状态
  useTabStore.setState({
    tabs: [],
    activeTabId: '',
    isRestoringSession: false,
    failedRestores: [],
    closedTabs: [],
    maxTabs: 10,
  })
  localStorage.clear()
})

describe('tabStore — newTab/closeTab', () => {
  it('newTab 建欢迎标签并激活', () => {
    useTabStore.getState().newTab()
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs.length).toBe(1)
    expect(tabs[0].name).toBe('欢迎使用.md')
    expect(activeTabId).toBe(tabs[0].id)
    // content 不在 store（contentStatus 标记就绪，实际 content 在 DocumentCache）
    expect(tabs[0].contentStatus).toBe('ready')
  })

  it('closeTab 后激活切换到相邻标签', () => {
    useTabStore.getState().newTab()
    useTabStore.getState().newTab()
    const { tabs } = useTabStore.getState()
    useTabStore.getState().closeTab(tabs[0].id)
    const after = useTabStore.getState()
    expect(after.tabs.length).toBe(1)
    expect(after.activeTabId).toBe(tabs[1].id)
  })

  it('closeTab 进入 closedTabs 供恢复', () => {
    useTabStore.getState().newTab()
    const tabId = useTabStore.getState().tabs[0].id
    useTabStore.getState().closeTab(tabId)
    expect(useTabStore.getState().closedTabs.length).toBe(1)
  })
})

describe('tabStore — openFile', () => {
  it('打开文件建标签并标记 pending（按需回源）', () => {
    const id = useTabStore.getState().openFile('a.md', '/path/a.md', 100, 1000)
    const tab = useTabStore.getState().tabs[0]
    expect(id).toBeTruthy()
    expect(tab.filePath).toBe('/path/a.md')
    expect(tab.contentStatus).toBe('pending') // content 待从 DocumentCache 回源
    expect('content' in tab).toBe(false) // v2: content 不在 store（移到 DocumentCache）
  })

  it('同路径文件复用已有标签（不新建）', () => {
    useTabStore.getState().openFile('a.md', '/path/a.md', 100, 1000)
    useTabStore.getState().openFile('a-renamed.md', '/path/a.md', 200, 2000)
    const { tabs } = useTabStore.getState()
    expect(tabs.length).toBe(1)
    expect(tabs[0].name).toBe('a-renamed.md')
    expect(tabs[0].size).toBe(200)
  })

  it('达到 maxTabs 上限时淘汰非固定非激活标签', () => {
    useTabStore.setState({ maxTabs: 2 })
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    useTabStore.getState().openFile('c.md', '/c.md') // 应淘汰 a
    const { tabs } = useTabStore.getState()
    expect(tabs.length).toBe(2)
    expect(tabs.find((t) => t.filePath === '/a.md')).toBeUndefined()
  })
})

describe('tabStore — pin/unpin', () => {
  it('pinTab 移到顶部', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    useTabStore.getState().openFile('c.md', '/c.md')
    // 固定 c（当前在最后）
    const cTab = useTabStore.getState().tabs.find((t) => t.filePath === '/c.md')!
    useTabStore.getState().pinTab(cTab.id)
    const tabs = useTabStore.getState().tabs
    expect(tabs[0].id).toBe(cTab.id)
    expect(tabs[0].isPinned).toBe(true)
  })

  it('固定标签不被淘汰', () => {
    useTabStore.setState({ maxTabs: 2 })
    useTabStore.getState().openFile('a.md', '/a.md')
    const aTab = useTabStore.getState().tabs[0]
    useTabStore.getState().pinTab(aTab.id)
    useTabStore.getState().openFile('b.md', '/b.md')
    // 把激活切回 a，这样 b 成为"非固定非激活"的淘汰候选
    useTabStore.getState().selectTab(aTab.id)
    useTabStore.getState().openFile('c.md', '/c.md')
    // a 已固定，应淘汰 b（非固定非激活）
    const tabs = useTabStore.getState().tabs
    expect(tabs.find((t) => t.filePath === '/a.md')).toBeDefined()
    expect(tabs.find((t) => t.filePath === '/b.md')).toBeUndefined()
  })
})

describe('tabStore — closeOtherTabs', () => {
  it('关闭其它标签时推入 closedTabs 供恢复', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    useTabStore.getState().openFile('c.md', '/c.md')
    const keepId = useTabStore.getState().tabs[1].id // 保留 b
    useTabStore.getState().closeOtherTabs(keepId)
    const { tabs, closedTabs, activeTabId } = useTabStore.getState()
    expect(tabs.length).toBe(1) // 只剩 b
    expect(tabs[0].id).toBe(keepId)
    expect(closedTabs.length).toBe(2) // a、c 推入 closedTabs
    expect(activeTabId).toBe(keepId)
  })
})

describe('tabStore — restoreTab', () => {
  it('从 closedTabs 恢复标签', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    const aId = useTabStore.getState().tabs[0].id
    useTabStore.getState().closeTab(aId)
    expect(useTabStore.getState().tabs.length).toBe(0)
    useTabStore.getState().restoreTab()
    expect(useTabStore.getState().tabs.length).toBe(1)
    expect(useTabStore.getState().activeTabId).toBe(useTabStore.getState().tabs[0].id)
  })
})
