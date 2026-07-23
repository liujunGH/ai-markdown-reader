import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocumentActions } from '../useDocumentActions'
import { useTabStore } from '../../state'
import { getContent, clearDocumentCache } from '../../resources/DocumentCache'

/**
 * useDocumentActions 端到端链路测试。
 *
 * 验证 v2 文档显示链路：
 *  openDocumentWithContent → 建标签（新 tabStore 无 content）+ content 进 DocumentCache
 *  openDocumentByPath → readFile → 建标签 + content 进 DocumentCache
 *  openExample → 示例文档建标签
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
  // 清 DocumentCache
  clearDocumentCache()
  // mock electronAPI（addRecentFile / readFile / pathBasename）
  ;(global as any).window = (global as any).window || {}
  ;(window as any).electronAPI = {
    pathBasename: (p: string) => p.split('/').pop() || p,
    addRecentFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue({ success: true, content: '# 从磁盘读的内容' }),
  }
})

describe('useDocumentActions — openDocumentWithContent', () => {
  it('建标签 + content 进 DocumentCache + 标 ready', () => {
    const { result } = renderHook(() => useDocumentActions())
    let tabId = ''
    act(() => {
      tabId = result.current.openDocumentWithContent('# 标题\n正文', 'a.md', '/path/a.md')
    })
    expect(tabId).toBeTruthy()
    const tab = useTabStore.getState().tabs[0]
    expect(tab.filePath).toBe('/path/a.md')
    expect(tab.name).toBe('a.md')
    expect(tab.contentStatus).toBe('ready')
    // content 在 DocumentCache（不在 store）
    expect(getContent(tabId)).toBe('# 标题\n正文')
    expect('content' in tab).toBe(false)
  })

  it('无 filePath 的文档也可建标签（示例/临时）', () => {
    const { result } = renderHook(() => useDocumentActions())
    let tabId = ''
    act(() => {
      tabId = result.current.openDocumentWithContent('内容', '临时.md')
    })
    expect(tabId).toBeTruthy()
    expect(getContent(tabId)).toBe('内容')
    expect(useTabStore.getState().tabs[0].filePath).toBe('')
  })
})

describe('useDocumentActions — openDocumentByPath', () => {
  it('读 content 成功 → 建标签 + content 进 DocumentCache', async () => {
    const { result } = renderHook(() => useDocumentActions())
    let tabId: string | null = ''
    await act(async () => {
      tabId = await result.current.openDocumentByPath('/docs/x.md')
    })
    expect(tabId).toBeTruthy()
    expect(window.electronAPI!.readFile).toHaveBeenCalledWith('/docs/x.md')
    expect(getContent(tabId!)).toBe('# 从磁盘读的内容')
    expect(useTabStore.getState().tabs[0].name).toBe('x.md')
  })

  it('读失败 → 建标签标 error', async () => {
    ;(window as any).electronAPI.readFile = vi
      .fn()
      .mockResolvedValue({ success: false, error: '文件不存在' })
    const { result } = renderHook(() => useDocumentActions())
    let tabId: string | null = ''
    await act(async () => {
      tabId = await result.current.openDocumentByPath('/missing.md')
    })
    expect(tabId).toBeTruthy()
    expect(useTabStore.getState().tabs[0].contentStatus).toBe('error')
  })
})

describe('useDocumentActions — openExample', () => {
  it('建示例文档标签', () => {
    const { result } = renderHook(() => useDocumentActions())
    act(() => {
      result.current.openExample()
    })
    const tab = useTabStore.getState().tabs[0]
    expect(tab).toBeTruthy()
    // 示例文档有内容（在 DocumentCache）
    expect(getContent(tab.id)).toBeTruthy()
  })
})
