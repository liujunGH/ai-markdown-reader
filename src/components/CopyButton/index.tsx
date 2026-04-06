import { useState } from 'react'
import styles from './CopyButton.module.css'

interface Props {
  code: string
}

export function CopyButton({ code }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  return (
    <button className={styles.button} onClick={handleCopy} title="复制代码">
      {copied ? '✓' : '📋'}
    </button>
  )
}
