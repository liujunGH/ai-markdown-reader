import type { KnowledgeHealthCard, KnowledgeHealthReport } from '../../utils/knowledgeHealth'
import styles from './KnowledgeHealthPanel.module.css'

type KnowledgeHealthDetail = KnowledgeHealthCard['id']

interface Props {
  report: KnowledgeHealthReport
  onOpenDetail: (detail: KnowledgeHealthDetail) => void
  onOpenFirstIssue: () => void
  onCopyReport: () => void
  onClose: () => void
}

const STATUS_LABELS: Record<KnowledgeHealthReport['status'], string> = {
  healthy: '健康',
  'needs-attention': '需要关注',
  critical: '需要处理',
}

export function KnowledgeHealthPanel({ report, onOpenDetail, onOpenFirstIssue, onCopyReport, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="知识库健康报告">
        <header className={styles.header}>
          <div>
            <h3>知识库健康报告</h3>
            <p>汇总当前工作区和当前文档的可处理问题</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.scoreBand}>
          <div className={`${styles.score} ${styles[report.status]}`}>{report.score}</div>
          <div>
            <strong>{STATUS_LABELS[report.status]}</strong>
            <span>分数越高，说明当前知识库的链接、图片和文档结构越稳定。</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onOpenFirstIssue}>定位首个问题</button>
          <button type="button" onClick={onCopyReport}>复制 Markdown 报告</button>
        </div>

        <div className={styles.grid}>
          {report.cards.map(card => (
            <button
              key={card.id}
              type="button"
              className={`${styles.card} ${styles[card.severity]}`}
              onClick={() => onOpenDetail(card.id)}
              aria-label={`查看${card.label}`}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
