import { describe, it, expect, vi, beforeEach } from 'vitest'

class LocalStorageMock {
  store: Record<string, string> = {}
  getItem(key: string) {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string) {
    this.store[key] = value
  }
  removeItem(key: string) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

const setupMocks = () => {
  Object.defineProperty(window, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true,
  })
  Object.defineProperty(window, 'electronAPI', {
    value: undefined,
    writable: true,
  })
}

beforeEach(() => {
  vi.resetModules()
  setupMocks()
})

describe('tabStore', () => {
  it('creates a new welcome tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()

    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('欢迎使用.md')
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('selects a tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    const firstTab = useTabStore.getState().tabs[0]

    store.newTab()
    const secondTab = useTabStore.getState().tabs[1]

    store.selectTab(firstTab.id)
    expect(useTabStore.getState().activeTabId).toBe(firstTab.id)

    store.selectTab(secondTab.id)
    expect(useTabStore.getState().activeTabId).toBe(secondTab.id)
  })

  it('returns active tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    const tab = useTabStore.getState().tabs[0]

    expect(store.activeTab()?.id).toBe(tab.id)
  })

  it('closes a tab and switches active tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    store.newTab()
    const [firstTab, secondTab] = useTabStore.getState().tabs

    store.closeTab(firstTab.id)
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(secondTab.id)
  })

  it('closes active tab and falls back to adjacent tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    store.newTab()
    store.newTab()
    const [firstTab, secondTab, thirdTab] = useTabStore.getState().tabs

    store.selectTab(secondTab.id)
    store.closeTab(secondTab.id)

    const state = useTabStore.getState()
    expect(state.tabs.map((t) => t.id)).toEqual([firstTab.id, thirdTab.id])
    expect(state.activeTabId).toBe(thirdTab.id)
  })

  it('creates welcome tab when closing the last tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    const tab = useTabStore.getState().tabs[0]

    store.closeTab(tab.id)
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('欢迎使用.md')
  })

  it('stores closed tab for restoration', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.newTab()
    const tab = useTabStore.getState().tabs[0]

    store.closeTab(tab.id)
    const state = useTabStore.getState()
    expect(state.closedTabs).toHaveLength(1)
    expect(state.closedTabs[0].id).toBe(tab.id)
  })

  it('restores a closed tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content1', 'file1.md')
    store.openFile('content2', 'file2.md')
    const firstTab = useTabStore.getState().tabs[0]

    store.closeTab(firstTab.id)
    expect(useTabStore.getState().closedTabs).toHaveLength(1)

    store.restoreTab()
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(2)
    expect(state.tabs.some((t) => t.name === 'file1.md')).toBe(true)
    expect(state.activeTabId).toBe(firstTab.id)
    expect(state.closedTabs).toHaveLength(0)
  })

  it('does not restore duplicate tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content', 'test.md', '/path/test.md')
    const originalTab = useTabStore.getState().tabs[0]
    store.closeTab(originalTab.id)

    // Re-open the same file (a welcome tab was auto-created after close)
    store.openFile('content', 'test.md', '/path/test.md')
    const reopenedTab = useTabStore.getState().tabs.find((t) => t.name === 'test.md')!

    // Restore should just select the existing tab, not add a duplicate
    store.restoreTab()
    const state = useTabStore.getState()
    const fileTabs = state.tabs.filter((t) => t.name === 'test.md')
    expect(fileTabs).toHaveLength(1)
    expect(state.activeTabId).toBe(reopenedTab.id)
  })

  it('closes all tabs except welcome', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content1', 'file1.md')
    store.openFile('content2', 'file2.md')

    store.closeAllTabs()
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('欢迎使用.md')
  })

  it('closes other tabs', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content1', 'file1.md')
    store.openFile('content2', 'file2.md')
    store.openFile('content3', 'file3.md')
    const [, secondTab] = useTabStore.getState().tabs

    store.closeOtherTabs(secondTab.id)
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].id).toBe(secondTab.id)
    expect(state.activeTabId).toBe(secondTab.id)
  })

  it('opens a file as a new tab', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('file content', 'readme.md', '/docs/readme.md', 1024, 1234567890)
    const state = useTabStore.getState()

    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('readme.md')
    expect(state.tabs[0].content).toBe('file content')
    expect(state.tabs[0].filePath).toBe('/docs/readme.md')
    expect(state.tabs[0].size).toBe(1024)
    expect(state.tabs[0].lastModified).toBe(1234567890)
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('activates existing tab when opening same file', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content', 'readme.md', '/docs/readme.md')
    const firstTab = useTabStore.getState().tabs[0]

    store.openFile('new content', 'readme.md', '/docs/readme.md')
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(firstTab.id)
  })

  it('updates tab content by file path', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('old content', 'readme.md', '/docs/readme.md')
    store.updateTabContent('/docs/readme.md', 'updated content', 'readme-updated.md')

    const state = useTabStore.getState()
    expect(state.tabs[0].content).toBe('updated content')
    expect(state.tabs[0].name).toBe('readme-updated.md')
  })

  it('pins and unpins tabs', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content1', 'file1.md')
    store.openFile('content2', 'file2.md')
    const [firstTab] = useTabStore.getState().tabs

    store.pinTab(firstTab.id)
    let state = useTabStore.getState()
    expect(state.tabs[0].isPinned).toBe(true)

    store.unpinTab(firstTab.id)
    state = useTabStore.getState()
    expect(state.tabs[0].isPinned).toBe(false)
  })

  it('reorders tabs keeping pinned tabs first', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('c1', 'a.md')
    store.openFile('c2', 'b.md')
    store.openFile('c3', 'c.md')
    const [tabA] = useTabStore.getState().tabs

    store.pinTab(tabA.id)
    store.reorderTabs(2, 0) // move c.md to index 0

    const state = useTabStore.getState()
    // pinned tabs should stay first
    expect(state.tabs[0].id).toBe(tabA.id)
  })

  it('sets tab color', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    store.openFile('content', 'file.md')
    const tab = useTabStore.getState().tabs[0]

    store.setTabColor(tab.id, 'red')
    const state = useTabStore.getState()
    expect(state.tabs[0].color).toBe('red')
  })

  it('respects max tabs limit', async () => {
    const { useTabStore } = await import('../../stores/tabStore')
    const store = useTabStore.getState()

    // default maxTabs is 10
    for (let i = 0; i < 12; i++) {
      store.openFile(`content${i}`, `file${i}.md`)
    }

    const state = useTabStore.getState()
    expect(state.tabs.length).toBeLessThanOrEqual(10)
  })

  it('opens empty recent files', async () => {
    const readFile = vi.fn(async () => ({ success: true, content: '' }))
    const removeRecentFile = vi.fn(async () => undefined)
    const registerWindowFiles = vi.fn(async () => undefined)

    Object.defineProperty(window, 'electronAPI', {
      value: {
        readFile,
        removeRecentFile,
        registerWindowFiles,
      },
      writable: true,
    })

    const { useTabStore } = await import('../../stores/tabStore')
    const opened = await useTabStore.getState().openRecentFile({
      name: 'empty.md',
      filePath: '/docs/empty.md',
      openedAt: Date.now(),
    })

    const state = useTabStore.getState()
    expect(opened).toBe(true)
    expect(state.tabs[0].name).toBe('empty.md')
    expect(state.tabs[0].content).toBe('')
    expect(removeRecentFile).not.toHaveBeenCalled()
  })

  it('reports and removes missing files from restored session', async () => {
    const readFile = vi.fn(async (filePath: string) => {
      if (filePath === '/docs/valid.md') {
        return { success: true, content: 'valid content' }
      }
      return { success: false, error: 'ENOENT' }
    })
    const removeRecentFile = vi.fn(async () => undefined)
    const registerWindowFiles = vi.fn(async () => undefined)

    Object.defineProperty(window, 'electronAPI', {
      value: {
        readFile,
        removeRecentFile,
        registerWindowFiles,
      },
      writable: true,
    })

    window.localStorage.setItem('session-tabs', JSON.stringify([
      { id: 'tab-valid', name: 'valid.md', filePath: '/docs/valid.md', isPinned: true },
      { id: 'tab-missing', name: 'missing.md', filePath: '/docs/missing.md' },
    ]))
    window.localStorage.setItem('session-active-tab', 'tab-valid')

    const { useTabStore } = await import('../../stores/tabStore')
    await useTabStore.getState().restoreSession()

    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].id).toBe('tab-valid')
    expect(state.tabs[0].content).toBe('valid content')
    expect(state.tabs[0].isPinned).toBe(true)
    expect(state.activeTabId).toBe('tab-valid')
    expect(state.failedRestores).toEqual(['/docs/missing.md'])
    expect(removeRecentFile).toHaveBeenCalledWith('/docs/missing.md')

    const storedTabs = JSON.parse(window.localStorage.getItem('session-tabs') || '[]')
    expect(storedTabs).toHaveLength(1)
    expect(storedTabs[0].filePath).toBe('/docs/valid.md')
  })
})
