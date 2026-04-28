import { useEffect, useState, useCallback } from 'react'
import styles from './DiagnosticsPanel.module.css'

interface DiagnosticsInfo {
  appVersion: string
  electronVersion: string
  chromiumVersion: string
  nodeVersion: string
  v8Version: string
  platform: string
  arch: string
  processMemory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  uptime: number
  pid: number
}

interface DiagnosticsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}h ${m}m ${s}s`
}

export function DiagnosticsPanel({ isOpen, onClose }: DiagnosticsPanelProps) {
  const [info, setInfo] = useState<DiagnosticsInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const [diagnosticsInfo, recentLogs] = await Promise.all([
        window.electronAPI.getDiagnosticsInfo(),
        window.electronAPI.getRecentLogs(),
      ])
      setInfo(diagnosticsInfo)
      setLogs(recentLogs)
    } catch (err) {
      console.error('Failed to load diagnostics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClearLogs = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.clearLogs()
      setLogs([])
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, loadData])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>诊断与调试</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className={styles.content}>
          {loading && <div className={styles.loading}>加载中...</div>}

          {info && (
            <section className={styles.section}>
              <h3>应用信息</h3>
              <div className={styles.grid}>
                <div className={styles.item}>
                  <span className={styles.label}>应用版本</span>
                  <span className={styles.value}>{info.appVersion}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>Electron</span>
                  <span className={styles.value}>{info.electronVersion}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>Chromium</span>
                  <span className={styles.value}>{info.chromiumVersion}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>Node.js</span>
                  <span className={styles.value}>{info.nodeVersion}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>V8</span>
                  <span className={styles.value}>{info.v8Version}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>平台</span>
                  <span className={styles.value}>{info.platform} ({info.arch})</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>PID</span>
                  <span className={styles.value}>{info.pid}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>运行时间</span>
                  <span className={styles.value}>{formatUptime(info.uptime)}</span>
                </div>
              </div>
            </section>
          )}

          {info && (
            <section className={styles.section}>
              <h3>主进程内存</h3>
              <div className={styles.grid}>
                <div className={styles.item}>
                  <span className={styles.label}>RSS</span>
                  <span className={styles.value}>{formatBytes(info.processMemory.rss)}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>Heap Total</span>
                  <span className={styles.value}>{formatBytes(info.processMemory.heapTotal)}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>Heap Used</span>
                  <span className={styles.value}>{formatBytes(info.processMemory.heapUsed)}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>External</span>
                  <span className={styles.value}>{formatBytes(info.processMemory.external)}</span>
                </div>
              </div>
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.logHeader}>
              <h3>最近日志</h3>
              <div className={styles.logActions}>
                <button className={styles.actionBtn} onClick={loadData}>刷新</button>
                <button className={styles.actionBtn} onClick={handleClearLogs}>清空</button>
              </div>
            </div>
            <div className={styles.logContainer}>
              {logs.length === 0 ? (
                <div className={styles.empty}>暂无日志</div>
              ) : (
                logs.map((line, i) => (
                  <div key={i} className={styles.logLine}>
                    {line.startsWith('[') && line.includes('ERROR') ? (
                      <span className={styles.logError}>{line}</span>
                    ) : line.includes('WARN') ? (
                      <span className={styles.logWarn}>{line}</span>
                    ) : (
                      <span>{line}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
