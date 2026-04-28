import { useState, useEffect, useCallback } from 'react'
import styles from './UpdateNotification.module.css'

interface UpdateState {
  status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

export function UpdateNotification() {
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    const handleAvailable = (info: { version: string }) => {
      setUpdate({ status: 'available', version: info.version })
      setDismissed(false)
    }

    const handleProgress = (progress: { percent: number }) => {
      setUpdate(prev => ({ ...prev, status: 'downloading', percent: Math.round(progress.percent) }))
    }

    const handleDownloaded = (info: { version: string }) => {
      setUpdate({ status: 'downloaded', version: info.version })
      setDismissed(false)
    }

    const handleError = (info: { error: string }) => {
      setUpdate({ status: 'error', error: info.error })
    }

    window.electronAPI.onUpdateAvailable(handleAvailable)
    window.electronAPI.onUpdateProgress(handleProgress)
    window.electronAPI.onUpdateDownloaded(handleDownloaded)
    window.electronAPI.onUpdateError(handleError)

    return () => {
      window.electronAPI!.offUpdateAvailable(handleAvailable)
      window.electronAPI!.offUpdateProgress(handleProgress)
      window.electronAPI!.offUpdateDownloaded(handleDownloaded)
      window.electronAPI!.offUpdateError(handleError)
    }
  }, [])

  const handleRestart = useCallback(() => {
    // electron-updater 会在 quitAndInstall 时自动重启
    // 但 renderer 无法直接调用，需要通过 IPC 或让用户手动重启
    // 这里显示提示，实际重启由用户通过关闭应用后重新打开完成
    setDismissed(true)
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  if (dismissed || update.status === 'idle') return null

  return (
    <div className={styles.container}>
      {update.status === 'available' && (
        <div className={styles.banner}>
          <span className={styles.icon}>🚀</span>
          <span className={styles.message}>
            发现新版本 {update.version}，正在下载...
          </span>
          <button className={styles.dismissBtn} onClick={handleDismiss}>✕</button>
        </div>
      )}

      {update.status === 'downloading' && (
        <div className={styles.banner}>
          <span className={styles.icon}>⬇️</span>
          <span className={styles.message}>正在下载更新... {update.percent}%</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${update.percent}%` }} />
          </div>
          <button className={styles.dismissBtn} onClick={handleDismiss}>✕</button>
        </div>
      )}

      {update.status === 'downloaded' && (
        <div className={`${styles.banner} ${styles.bannerSuccess}`}>
          <span className={styles.icon}>✅</span>
          <span className={styles.message}>
            新版本 {update.version} 已下载完成
          </span>
          <button className={styles.actionBtn} onClick={handleRestart}>
            稍后重启
          </button>
          <button className={styles.dismissBtn} onClick={handleDismiss}>✕</button>
        </div>
      )}

      {update.status === 'error' && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.icon}>⚠️</span>
          <span className={styles.message}>更新检查失败: {update.error}</span>
          <button className={styles.dismissBtn} onClick={handleDismiss}>✕</button>
        </div>
      )}
    </div>
  )
}
