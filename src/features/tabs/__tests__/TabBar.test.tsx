import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../TabBar'
import { useTabStore } from '../../../state'
import { setContent, clearDocumentCache } from '../../../resources/DocumentCache'

/**
 * TabBar v2 测试。
 *
 * 核心验证（迁移模板）：
 *  - 直接从 tabStore 订阅（不接收 props）
 *  - content preview 从 DocumentCache 取（不在 store）
 *  - 标签操作（选中/关闭/固定）走 store action
 */
beforeEach(() => {
  useTabStore.setState({
    tabs: [],
    activeTabId: '',
    isRestoringSession: false,
    failedRestores: [],
    closedTabs: [],
    maxTabs: 10,
  })
  clearDocumentCache()
})

describe('TabBar v2 — 渲染 store 状态', () => {
  it('渲染所有标签', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    render(<TabBar />)
    expect(screen.getByRole('tab', { name: 'a.md' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'b.md' })).toBeTruthy()
  })

  it('激活标签有 active 样式（aria-selected）', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    render(<TabBar />)
    const activeTab = screen.getByRole('tab', { selected: true })
    expect(activeTab.getAttribute('aria-label')).toBe('b.md') // 最后开的激活
  })
})

describe('TabBar v2 — 标签操作走 store', () => {
  it('点击标签切换激活', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    render(<TabBar />)
    fireEvent.click(screen.getByRole('tab', { name: 'a.md' }))
    expect(useTabStore.getState().activeTabId).toBe(
      useTabStore.getState().tabs.find((t) => t.name === 'a.md')!.id
    )
  })

  it('点击 × 关闭标签', () => {
    useTabStore.getState().openFile('a.md', '/a.md')
    useTabStore.getState().openFile('b.md', '/b.md')
    render(<TabBar />)
    // 关闭按钮含 × 文本（不依赖 i18n title）
    const closeBtns = document.querySelectorAll('button')
    const closeBtn = Array.from(closeBtns).find((b) => b.textContent === '×')!
    fireEvent.click(closeBtn)
    expect(useTabStore.getState().tabs.length).toBe(1)
  })

  it('点击 + 新建标签', () => {
    render(<TabBar />)
    // 新建按钮含 + 文本
    const buttons = document.querySelectorAll('button')
    const newBtn = Array.from(buttons).find((b) => b.textContent === '+')!
    fireEvent.click(newBtn)
    expect(useTabStore.getState().tabs.length).toBe(1)
    expect(useTabStore.getState().tabs[0].name).toBe('欢迎使用.md')
  })
})

describe('TabBar v2 — content preview 从 DocumentCache', () => {
  it('content 不在 store，从 DocumentCache 取（v2 核心差异）', () => {
    const tabId = useTabStore.getState().openFile('a.md', '/a.md')
    setContent(tabId, '# 标题\n第一行\n第二行\n第三行', '/a.md')
    // store 的 TabMeta 无 content 字段
    expect('content' in useTabStore.getState().tabs[0]).toBe(false)
    // DocumentCache 有
    expect(() => render(<TabBar />)).not.toThrow()
  })
})
