import { useCallback, useRef, useState } from 'react'
import { streamChat, type ChatMessage } from '../services/ai'
import { useAIStore } from '../stores/aiStore'
import { useToastStore } from '../stores/toastStore'
import { useTabStore } from '../stores/tabStore'

export interface UseAIChatReturn {
  input: string
  setInput: (value: string) => void
  sendMessage: (content: string) => Promise<void>
  handleSubmit: () => void
  abort: () => void
}

export function useAIChat(): UseAIChatReturn {
  const config = useAIStore((state) => state.config)
  const addMessage = useAIStore((state) => state.addMessage)
  const setMessages = useAIStore((state) => state.setMessages)
  const setIsLoading = useAIStore((state) => state.setIsLoading)
  const { showToast } = useToastStore()
  const activeTab = useTabStore((state) => state.activeTab)
  const canceledRef = useRef(false)
  const [input, setInput] = useState('')

  const abort = useCallback(() => {
    canceledRef.current = true
    setIsLoading(false)
  }, [setIsLoading])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      if (!config.enabled || !config.apiKey) {
        showToast('LLM 未启用或未配置 API Key', 'error')
        return
      }

      canceledRef.current = false

      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      addMessage(userMessage)

      const tab = activeTab()
      const docContext = tab?.content ? tab.content.slice(0, 4000) : ''
      const systemContent = docContext
        ? `You are a helpful reading assistant. The user is reading a Markdown document. Answer questions about the document content.\n\nDocument content (truncated):\n${docContext}`
        : 'You are a helpful reading assistant. The user is reading a Markdown document. Answer questions about the document content.'

      const currentMessages = useAIStore.getState().messages
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemContent },
        ...currentMessages,
      ]

      setIsLoading(true)
      const assistantMessage: ChatMessage = { role: 'assistant', content: '' }
      addMessage(assistantMessage)

      try {
        const stream = streamChat(chatMessages, config)
        let fullContent = ''
        for await (const chunk of stream) {
          if (canceledRef.current) break
          fullContent += chunk
          const stateMessages = useAIStore.getState().messages
          setMessages([
            ...stateMessages.slice(0, -1),
            { role: 'assistant', content: fullContent },
          ])
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '请求失败'
        showToast(errMsg, 'error')
        const stateMessages = useAIStore.getState().messages
        setMessages(stateMessages.slice(0, -1))
      } finally {
        setIsLoading(false)
        canceledRef.current = false
      }
    },
    [config, addMessage, setMessages, setIsLoading, showToast, activeTab]
  )

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    void sendMessage(trimmed)
  }, [input, sendMessage])

  return { input, setInput, sendMessage, handleSubmit, abort }
}
