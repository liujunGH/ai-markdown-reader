import { useState, useEffect } from 'react'
import styles from './ProgressBar.module.css'

export function ProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollPercent)))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  )
}
