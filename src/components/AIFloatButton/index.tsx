import { useAIStore } from '../../stores/aiStore'
import styles from './AIFloatButton.module.css'

interface AIFloatButtonProps {
  text: string
  x: number
  y: number
  visible: boolean
}

export function AIFloatButton({ text, x, y, visible }: AIFloatButtonProps) {
  const toggleAIPanel = useAIStore((state) => state.toggleAIPanel)
  const setMessages = useAIStore((state) => state.setMessages)

  if (!visible || !text) return null

  const handleClick = () => {
    setMessages([{ role: 'user', content: `请解释以下内容：\n\n${text}` }])
    toggleAIPanel()
  }

  return (
    <button
      data-ai-float-btn
      className={styles.floatBtn}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
      }}
      onClick={handleClick}
      title="向 AI 提问"
    >
      🤖 解释
    </button>
  )
}
