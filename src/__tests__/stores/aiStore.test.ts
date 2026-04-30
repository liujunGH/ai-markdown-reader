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
}

beforeEach(() => {
  vi.resetModules()
  setupMocks()
})

describe('aiStore', () => {
  it('initializes with AI panel hidden', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const state = useAIStore.getState()

    expect(state.showAIPanel).toBe(false)
    expect(state.messages).toEqual([])
    expect(state.isLoading).toBe(false)
  })

  it('toggles AI panel visibility', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.toggleAIPanel()
    expect(useAIStore.getState().showAIPanel).toBe(true)

    store.toggleAIPanel()
    expect(useAIStore.getState().showAIPanel).toBe(false)
  })

  it('sets AI panel visibility explicitly', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.setShowAIPanel(true)
    expect(useAIStore.getState().showAIPanel).toBe(true)

    store.setShowAIPanel(false)
    expect(useAIStore.getState().showAIPanel).toBe(false)
  })

  it('adds messages', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.addMessage({ role: 'user', content: 'Hello' })
    let state = useAIStore.getState()
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Hello' })

    store.addMessage({ role: 'assistant', content: 'Hi there!' })
    state = useAIStore.getState()
    expect(state.messages).toHaveLength(2)
    expect(state.messages[1]).toEqual({ role: 'assistant', content: 'Hi there!' })
  })

  it('sets messages array', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    const newMessages = [
      { role: 'user' as const, content: 'Q1' },
      { role: 'assistant' as const, content: 'A1' },
    ]

    store.setMessages(newMessages)
    expect(useAIStore.getState().messages).toEqual(newMessages)

    store.setMessages([])
    expect(useAIStore.getState().messages).toEqual([])
  })

  it('sets loading state', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.setIsLoading(true)
    expect(useAIStore.getState().isLoading).toBe(true)

    store.setIsLoading(false)
    expect(useAIStore.getState().isLoading).toBe(false)
  })

  it('clears messages', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.addMessage({ role: 'user', content: 'Hello' })
    store.addMessage({ role: 'assistant', content: 'Hi' })
    expect(useAIStore.getState().messages).toHaveLength(2)

    store.clearMessages()
    expect(useAIStore.getState().messages).toEqual([])
  })

  it('updates config and persists to localStorage', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    store.updateConfig({ model: 'gpt-4' })
    const state = useAIStore.getState()
    expect(state.config.model).toBe('gpt-4')

    const saved = window.localStorage.getItem('llm-config')
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!)
    expect(parsed.model).toBe('gpt-4')
  })

  it('merges partial config updates', async () => {
    const { useAIStore } = await import('../../stores/aiStore')
    const store = useAIStore.getState()

    const initialConfig = { ...store.config }
    store.updateConfig({ apiKey: 'new-key' })

    const state = useAIStore.getState()
    expect(state.config.apiKey).toBe('new-key')
    expect(state.config.baseURL).toBe(initialConfig.baseURL)
    expect(state.config.model).toBe(initialConfig.model)
  })
})
