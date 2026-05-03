import type { ReleasePreflightReport } from '../../utils/releasePreflight'
import styles from './ReleasePreflightPanel.module.css'

interface Props {
  report: ReleasePreflightReport
  onOpenMaintenance: () => void
  onCopyReport: () => void
  onClose: () => void
}

const STATUS_LABELS: Record<ReleasePreflightReport['status'], string> = {
  pass: '可以发布',
  warning: '需要复查',
  fail: '需要修复',
}

const CHECK_STATUS_LABELS: Record<ReleasePreflightReport['status'], string> = {
  pass: '通过',
  warning: '复查',
  fail: '失败',
}

export function ReleasePreflightPanel({ report, onOpenMaintenance, onCopyReport, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="发布前检查">
        <header className={styles.header}>
          <div>
            <h3>发布前检查</h3>
            <p>打包或发版前快速确认当前知识库状态</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={`${styles.statusBand} ${styles[report.status]}`}>
          <strong>{STATUS_LABELS[report.status]}</strong>
          <span>{report.status === 'pass' ? '当前检查没有发现阻塞项。' : '建议先处理下面标记的项目。'}</span>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onOpenMaintenance}>打开待处理队列</button>
          <button type="button" onClick={onCopyReport}>复制检查报告</button>
        </div>

        <div className={styles.checks}>
          {report.checks.map(check => (
            <article key={check.id} className={`${styles.check} ${styles[check.status]}`}>
              <div>
                <span>{CHECK_STATUS_LABELS[check.status]}</span>
                <h4>{check.label}</h4>
              </div>
              <p>{check.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
