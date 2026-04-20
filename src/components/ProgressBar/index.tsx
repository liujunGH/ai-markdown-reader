import { useState, useEffect, useCallback } from 'react'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  containerRef?: React.RefObject<HTMLElement>
}

export function ProgressBar({ containerRef }: ProgressBarProps) {
  const [progress, setProgress] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipText, setTooltipText] = useState('')

  const calculateProgress = useCallback(() => {
    const container = containerRef?.current
    let scrollTop = 0
    let scrollHeight = 0
    let clientHeight = 0

    if (container) {
      scrollTop = container.scrollTop
      scrollHeight = container.scrollHeight
      clientHeight = container.clientHeight
    } else {
      scrollTop = window.scrollY
      scrollHeight = document.documentElement.scrollHeight
      clientHeight = window.innerHeight
    }

    const maxScroll = scrollHeight - clientHeight
    const percent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
    const clamped = Math.min(100, Math.max(0, percent))
    setProgress(clamped)

    const totalChars = container?.textContent?.length || document.body.textContent?.length || 0
    const remainingRatio = maxScroll > 0 ? 1 - scrollTop / maxScroll : 0
    const remainingChars = Math.round(totalChars * remainingRatio)
    const remainingMinutes = Math.ceil(remainingChars / 300)

    setTooltipText(`${Math.round(clamped)}% · 预计剩余 ${remainingMinutes} 分钟`)
  }, [containerRef])

  useEffect(() => {
    const container = containerRef?.current

    const handleScroll = () => {
      calculateProgress()
    }

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    calculateProgress()

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      } else {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [containerRef, calculateProgress])

  return (
    <div
      className={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={styles.bar} style={{ width: `${progress}%` }} />
      {showTooltip && (
        <div className={styles.tooltip}>{tooltipText}</div>
      )}
    </div>
  )
}
