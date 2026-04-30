import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { parseMarkdown } from '../../utils/markdownParser'
import type { ChatMessage as ChatMessageType } from '../../services/ai'
import styles from './AIPanel.module.css'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const html = useMemo(() => {
    if (isUser) return ''
    const raw = parseMarkdown(message.content)
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'hr',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'dl',
        'dt',
        'dd',
        'strong',
        'b',
        'em',
        'i',
        'strike',
        'del',
        's',
        'a',
        'img',
        'code',
        'pre',
        'blockquote',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'sup',
        'sub',
      ],
      ALLOWED_ATTR: [
        'href',
        'title',
        'target',
        'rel',
        'src',
        'alt',
        'width',
        'height',
        'class',
        'id',
      ],
    })
  }, [message.content, isUser])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {
      // ignore
    }
  }

  if (isUser) {
    return (
      <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          <div className={styles.messageText}>{message.content}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
      <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
        <div
          className={styles.messageMarkdown}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <button
          className={styles.copyMessageBtn}
          onClick={handleCopy}
          title="复制内容"
          type="button"
        >
          📋
        </button>
      </div>
    </div>
  )
}
