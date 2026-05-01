import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAIStore } from '../../stores/aiStore'
import { useAIChat } from '../../hooks/useAIChat'
import { useTabStore } from '../../stores/tabStore'
import { ChatMessage } from './ChatMessage'
import { AIConfigModal } from './AIConfigModal'
import styles from './AIPanel.module.css'

const MAX_DOC_CONTENT_LENGTH = 6000

interface QuickAction {
  icon: string
  labelKey: string
  getPrompt: (content: string) => string
}

export function AIPanel() {
  const { t } = useTranslation()
  const showAIPanel = useAIStore((state) => state.showAIPanel)
  const messages = useAIStore((state) => state.messages)
  const isLoading = useAIStore((state) => state.isLoading)
  const clearMessages = useAIStore((state) => state.clearMessages)
  const setShowAIPanel = useAIStore((state) => state.setShowAIPanel)
  const config = useAIStore((state) => state.config)
  const { input, setInput, handleSubmit, abort, sendMessage } = useAIChat()
  const getActiveTab = useTabStore((state) => state.activeTab)
  const [showConfig, setShowConfig] = useState(false)
  const [width, setWidth] = useState(380)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

  const QUICK_ACTIONS: QuickAction[] = [
    { icon: '📋', labelKey: 'aiPanel.summarize', getPrompt: (c) => `请为以下文档生成摘要：\n\n${c}` },
    { icon: '🌐', labelKey: 'aiPanel.translate', getPrompt: (c) => `请将以下文档翻译成英文：\n\n${c}` },
    { icon: '✏️', labelKey: 'aiPanel.rewrite', getPrompt: (c) => `请改写以下内容，使其更简洁：\n\n${c}` },
    { icon: '➕', labelKey: 'aiPanel.continue', getPrompt: (c) => `请根据以下内容续写：\n\n${c}` },
  ]

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
        320,
        Math.min(480, startWidthRef.current + delta)
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
          <span className={styles.panelTitle}>{t('aiPanel.title')}</span>
          <div className={styles.panelActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setShowConfig(true)}
              title={t('aiPanel.settings')}
              type="button"
            >
              ⚙️
            </button>
            <button
              className={styles.iconBtn}
              onClick={clearMessages}
              title={t('aiPanel.clearChat')}
              type="button"
            >
              🗑️
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowAIPanel(false)}
              title={t('common.close')}
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
                  ? t('aiPanel.emptyStateConfigured')
                  : t('aiPanel.emptyStateNotConfigured')}
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

        <div className={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.labelKey}
              className={styles.quickActionBtn}
              onClick={() => {
                const tab = getActiveTab()
                const content = tab?.content
                  ? tab.content.slice(0, MAX_DOC_CONTENT_LENGTH)
                  : ''
                void sendMessage(action.getPrompt(content))
              }}
              disabled={isLoading}
              type="button"
              title={t(action.labelKey)}
            >
              <span className={styles.quickActionIcon}>{action.icon}</span>
              <span className={styles.quickActionLabel}>{t(action.labelKey)}</span>
            </button>
          ))}
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConfigured
                ? t('aiPanel.placeholderConfigured')
                : t('aiPanel.placeholderNotConfigured')
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
                {t('aiPanel.stop')}
              </button>
            ) : (
              <button
                className={styles.sendBtn}
                onClick={handleSubmit}
                disabled={!input.trim() || !isConfigured}
                type="button"
              >
                {t('aiPanel.send')}
              </button>
            )}
          </div>
        </div>
      </div>

      <AIConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </>
  )
}
