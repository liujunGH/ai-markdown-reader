import { create } from 'zustand'
import { LLMConfig, getLLMConfig, saveLLMConfig } from '../services/ai'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIState {
  showAIPanel: boolean
  config: LLMConfig
  messages: ChatMessage[]
  isLoading: boolean
}

interface AIActions {
  toggleAIPanel: () => void
  setShowAIPanel: (show: boolean) => void
  updateConfig: (config: Partial<LLMConfig>) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setIsLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAIStore = create<AIState & AIActions>((set) => ({
  showAIPanel: false,
  config: getLLMConfig(),
  messages: [],
  isLoading: false,

  toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
  setShowAIPanel: (show) => set({ showAIPanel: show }),
  updateConfig: (config) =>
    set((state) => {
      const next = { ...state.config, ...config }
      saveLLMConfig(next)
      return { config: next }
    }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}))
