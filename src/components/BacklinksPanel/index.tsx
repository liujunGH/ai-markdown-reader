import styles from './BacklinksPanel.module.css'

export interface BacklinkItem {
  sourcePath: string
  sourceName: string
  line: number
  text: string
}

interface Props {
  backlinks: BacklinkItem[]
  onOpenFile: (path: string, line?: number) => void
  onClose: () => void
  filePath?: string
}

export function BacklinksPanel({ backlinks, onOpenFile, onClose, filePath }: Props) {
  const sourceCount = new Set(backlinks.map(backlink => backlink.sourcePath)).size

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={e => e.stopPropagation()} aria-label="反向链接面板">
        <header className={styles.header}>
          <div>
            <h3>反向链接</h3>
            <p>{filePath || '当前未保存文档'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="引用" value={backlinks.length} />
          <SummaryCard label="来源文档" value={sourceCount} />
        </div>

        <div className={styles.content}>
          {backlinks.length === 0 ? (
            <div className={styles.empty}>
              <strong>还没有反向链接</strong>
              <span>其他文档使用 Wiki 链接指向当前文档后，会显示在这里。</span>
            </div>
          ) : (
            <div className={styles.list}>
              {backlinks.map((backlink, index) => (
                <button
                  key={`${backlink.sourcePath}-${backlink.line}-${index}`}
                  type="button"
                  className={styles.item}
                  onClick={() => onOpenFile(backlink.sourcePath, backlink.line)}
                >
                  <div className={styles.itemTop}>
                    <span className={styles.sourceName}>{backlink.sourceName}</span>
                    <span className={styles.line}>行 {backlink.line}</span>
                  </div>
                  <div className={styles.text}>{backlink.text || '空行内容'}</div>
                  <div className={styles.path} title={backlink.sourcePath}>{backlink.sourcePath}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
