import { formatIndexSkippedItem, type IndexSkippedItem } from '../../utils/searchIndex'
import styles from './IndexDiagnosticsPanel.module.css'

interface Props {
  folderPath?: string | null
  skippedItems: IndexSkippedItem[]
  isIndexing: boolean
  onReindex: () => void
  onClose: () => void
}

const REASON_LABELS: Record<IndexSkippedItem['reason'], string> = {
  'ignored-directory': '忽略目录',
  'large-file': '文件过大',
  'read-error': '读取失败',
}

export function IndexDiagnosticsPanel({ folderPath, skippedItems, isIndexing, onReindex, onClose }: Props) {
  const reasonCounts = countReasons(skippedItems)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="索引诊断">
        <header className={styles.header}>
          <div>
            <h3>索引诊断</h3>
            <p>{folderPath || '当前未打开文件夹'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="跳过项" value={skippedItems.length} />
          <SummaryCard label="忽略目录" value={reasonCounts['ignored-directory']} />
          <SummaryCard label="文件过大" value={reasonCounts['large-file']} />
          <SummaryCard label="读取失败" value={reasonCounts['read-error']} />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onReindex} disabled={isIndexing || !folderPath} aria-label="重新扫描索引">
            {isIndexing ? '正在索引...' : '重新扫描'}
          </button>
        </div>

        <div className={styles.content}>
          {skippedItems.length === 0 ? (
            <div className={styles.empty}>
              <strong>没有跳过项</strong>
              <span>最近一次索引没有发现被忽略、过大或读取失败的项目。</span>
            </div>
          ) : (
            <div className={styles.list}>
              {skippedItems.map((item, index) => (
                <article key={`${item.path}-${index}`} className={styles.item}>
                  <div className={styles.itemTop}>
                    <strong>{formatIndexSkippedItem(item)}</strong>
                    <span>{REASON_LABELS[item.reason]}</span>
                  </div>
                  <p title={item.path}>{item.path}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function countReasons(items: IndexSkippedItem[]): Record<IndexSkippedItem['reason'], number> {
  return items.reduce<Record<IndexSkippedItem['reason'], number>>((counts, item) => {
    counts[item.reason] += 1
    return counts
  }, { 'ignored-directory': 0, 'large-file': 0, 'read-error': 0 })
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
