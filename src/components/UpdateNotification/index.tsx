import { useCallback, useEffect, useState } from 'react'
import type { UpdateStatePayload } from '../../../shared'
import { useUpdateStateEvent } from '../../ipc/events'
import styles from './UpdateNotification.module.css'

const EMPTY_STATE: UpdateStatePayload = {
  status: 'idle',
  currentVersion: '',
  manual: false,
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes < 0) return '0 MB'
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

export function UpdateNotification() {
  const [update, setUpdate] = useState<UpdateStatePayload>(EMPTY_STATE)
  const [dismissed, setDismissed] = useState(false)

  const receiveState = useCallback((state: UpdateStatePayload) => {
    setUpdate(state)
    if (state.status !== 'idle') setDismissed(false)
  }, [])

  useUpdateStateEvent(receiveState)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    let active = true
    void api.getUpdateState()
      .then((state) => {
        if (active) receiveState(state)
      })
      .catch(() => {
        // 初始化状态查询失败不影响阅读功能；用户手动检查时会展示具体错误。
      })
    return () => { active = false }
  }, [receiveState])

  const visible = !dismissed && update.status !== 'idle' && (
    update.status === 'available'
    || update.status === 'downloading'
    || update.status === 'downloaded'
    || update.manual
  )

  const runAction = useCallback(async (action: 'check' | 'download' | 'install') => {
    const api = window.electronAPI
    if (!api) return
    try {
      if (action === 'check') await api.checkForUpdates(true)
      if (action === 'download') await api.downloadUpdate()
      if (action === 'install') {
        const accepted = await api.installUpdate()
        if (!accepted) {
          setUpdate((state) => ({ ...state, status: 'error', manual: true, error: '更新尚未下载完成，无法安装。' }))
        }
      }
    } catch (error) {
      setUpdate((state) => ({
        ...state,
        status: 'error',
        manual: true,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }, [])

  if (!visible) return null

  const percent = Math.round(update.percent ?? 0)
  const isError = update.status === 'error'

  return (
    <aside
      className={styles.container}
      aria-live="polite"
      aria-label="软件更新"
      data-testid="update-notification"
    >
      <div className={`${styles.card} ${isError ? styles.cardError : ''}`} role={isError ? 'alert' : 'status'}>
        <div className={styles.headingRow}>
          <div className={styles.icon} aria-hidden="true">
            {update.status === 'downloaded' ? '✓' : update.status === 'error' ? '!' : '↻'}
          </div>
          <div className={styles.copy}>
            <strong className={styles.title}>
              {update.status === 'checking' && '正在检查更新'}
              {update.status === 'available' && `发现新版本 ${update.version}`}
              {update.status === 'downloading' && `正在下载 ${update.version ?? '新版本'}`}
              {update.status === 'downloaded' && `新版本 ${update.version} 已准备好`}
              {update.status === 'up-to-date' && '已经是最新版本'}
              {update.status === 'error' && '更新遇到问题'}
              {update.status === 'unsupported' && '当前环境不支持检查更新'}
            </strong>
            <span className={styles.message}>
              {update.status === 'checking' && `当前版本 ${update.currentVersion}`}
              {update.status === 'available' && '查看更新内容后，可选择立即下载。'}
              {update.status === 'downloading' && `${percent}% · ${formatBytes(update.transferred)} / ${formatBytes(update.total)}`}
              {update.status === 'downloaded' && '重启应用即可完成安装。'}
              {update.status === 'up-to-date' && `Markdown Reader ${update.currentVersion} 无需更新。`}
              {(update.status === 'error' || update.status === 'unsupported') && update.error}
            </span>
          </div>
          {update.status !== 'downloading' && (
            <button className={styles.closeButton} onClick={() => setDismissed(true)} aria-label="关闭更新提示">×</button>
          )}
        </div>

        {update.status === 'available' && update.releaseNotes && (
          <div className={styles.releaseNotes}>
            <span className={styles.releaseNotesLabel}>更新内容</span>
            <p>{update.releaseNotes}</p>
          </div>
        )}

        {update.status === 'downloading' && (
          <div className={styles.progressTrack} aria-label={`下载进度 ${percent}%`}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        )}

        <div className={styles.actions}>
          {update.status === 'available' && (
            <>
              <button className={styles.secondaryButton} onClick={() => setDismissed(true)}>以后再说</button>
              <button className={styles.primaryButton} onClick={() => { void runAction('download') }}>下载更新</button>
            </>
          )}
          {update.status === 'downloaded' && (
            <>
              <button className={styles.secondaryButton} onClick={() => setDismissed(true)}>稍后重启</button>
              <button className={styles.primaryButton} onClick={() => { void runAction('install') }}>重启并安装</button>
            </>
          )}
          {(update.status === 'up-to-date' || update.status === 'unsupported') && (
            <button className={styles.secondaryButton} onClick={() => setDismissed(true)}>知道了</button>
          )}
          {update.status === 'error' && (
            <>
              <button className={styles.secondaryButton} onClick={() => setDismissed(true)}>关闭</button>
              <button className={styles.primaryButton} onClick={() => { void runAction(update.version ? 'download' : 'check') }}>
                {update.version ? '重新下载' : '重新检查'}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
