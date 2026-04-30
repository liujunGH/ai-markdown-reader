import { useCallback, useEffect, useRef, useState } from 'react'
import { useAIStore } from '../../stores/aiStore'
import { useAIChat } from '../../hooks/useAIChat'
import { ChatMessage } from './ChatMessage'
import { AIConfigModal } from './AIConfigModal'
import styles from './AIPanel.module.css'

const MIN_WIDTH = 320
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 380

export function AIPanel() {
  const showAIPanel = useAIStore((state) => state.showAIPanel)
  const messages = useAIStore((state) => state.messages)
  const isLoading = useAIStore((state) => state.isLoading)
  const clearMessages = useAIStore((state) => state.clearMessages)
  const setShowAIPanel = useAIStore((state) => state.setShowAIPanel)
  const config = useAIStore((state) => state.config)
  const { input, setInput, handleSubmit, abort } = useAIChat()
  const [showConfig, setShowConfig] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = width
    },
    [width]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + delta)
      )
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!showAIPanel) return null

  const isConfigured = config.enabled && config.apiKey

  return (
    <>
      <div
        className={`${styles.panel} ${isResizing ? styles.panelResizing : ''}`}
        style={{ width }}
      >
        <div className={styles.resizer} onMouseDown={handleMouseDown} />
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>🤖 AI 助手</span>
          <div className={styles.panelActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setShowConfig(true)}
              title="设置"
              type="button"
            >
              ⚙️
            </button>
            <button
              className={styles.iconBtn}
              onClick={clearMessages}
              title="清空对话"
              type="button"
            >
              🗑️
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowAIPanel(false)}
              title="关闭"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <div className={styles.emptyText}>
                {isConfigured
                  ? '开始与 AI 助手对话，询问关于当前文档的问题'
                  : 'AI 助手未启用，请点击 ⚙️ 进行配置'}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div
              className={`${styles.messageRow} ${styles.messageRowAssistant}`}
            >
              <div
                className={`${styles.bubble} ${styles.bubbleAssistant}`}
              >
                <div className={styles.typingIndicator}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConfigured
                ? '输入消息... (Enter 发送, Shift+Enter 换行)'
                : '请先配置 AI 设置'
            }
            disabled={!isConfigured || isLoading}
            rows={2}
          />
          <div className={styles.inputActions}>
            {isLoading ? (
              <button
                className={styles.sendBtn}
                onClick={abort}
                type="button"
              >
                ⏹ 停止
              </button>
            ) : (
              <button
                className={styles.sendBtn}
                onClick={handleSubmit}
                disabled={!input.trim() || !isConfigured}
                type="button"
              >
                ➤ 发送
              </button>
            )}
          </div>
        </div>
      </div>

      <AIConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </>
  )
}
