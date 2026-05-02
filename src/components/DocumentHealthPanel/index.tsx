import { useMemo } from 'react'
import { analyzeDocumentHealth, DocumentHealthIssue, HealthSeverity } from '../../utils/documentHealth'
import styles from './DocumentHealthPanel.module.css'

interface Props {
  content: string
  filePath?: string
  onIssueSelect?: (line: number) => void
  onClose: () => void
}

const SEVERITY_LABELS: Record<HealthSeverity, string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
}

export function DocumentHealthPanel({ content, filePath, onIssueSelect, onClose }: Props) {
  const result = useMemo(() => analyzeDocumentHealth(content, filePath), [content, filePath])
  const grouped = useMemo(() => ({
    error: result.issues.filter(issue => issue.severity === 'error'),
    warning: result.issues.filter(issue => issue.severity === 'warning'),
    info: result.issues.filter(issue => issue.severity === 'info'),
  }), [result.issues])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={e => e.stopPropagation()} aria-label="文档健康检查">
        <header className={styles.header}>
          <div>
            <h3>文档健康检查</h3>
            <p>{filePath || '当前未保存文档'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="全部" value={result.summary.totalIssues} />
          <SummaryCard label="错误" value={result.summary.errors} tone="error" />
          <SummaryCard label="警告" value={result.summary.warnings} tone="warning" />
          <SummaryCard label="提示" value={result.summary.info} tone="info" />
        </div>

        <div className={styles.content}>
          {result.issues.length === 0 ? (
            <div className={styles.empty}>没有发现明显问题</div>
          ) : (
            (Object.keys(grouped) as HealthSeverity[]).map(severity => (
              grouped[severity].length > 0 && (
                <IssueGroup key={severity} severity={severity} issues={grouped[severity]} onIssueSelect={onIssueSelect} />
              )
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: HealthSeverity }) {
  return (
    <div className={`${styles.summaryCard} ${tone ? styles[tone] : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function IssueGroup({ severity, issues, onIssueSelect }: { severity: HealthSeverity; issues: DocumentHealthIssue[]; onIssueSelect?: (line: number) => void }) {
  return (
    <section className={styles.group}>
      <h4>{SEVERITY_LABELS[severity]} · {issues.length}</h4>
      <div className={styles.issueList}>
        {issues.map((issue, index) => (
          <button
            key={`${issue.type}-${issue.line}-${index}`}
            type="button"
            className={styles.issue}
            onClick={() => onIssueSelect?.(issue.line)}
          >
            <div className={styles.issueTop}>
              <span className={styles.line}>行 {issue.line}</span>
              <span className={styles.type}>{issue.type}</span>
            </div>
            <div className={styles.message}>{issue.message}</div>
            {issue.target && <div className={styles.target} title={issue.target}>{issue.target}</div>}
          </button>
        ))}
      </div>
    </section>
  )
}
