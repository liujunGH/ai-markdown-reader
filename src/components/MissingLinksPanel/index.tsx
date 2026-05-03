import styles from './MissingLinksPanel.module.css'
import { normalizeWikiTarget, type MissingWikiLink } from '../../utils/wikiGraph'

interface Props {
  links: MissingWikiLink[]
  folderPath?: string
  focusedTarget?: string | null
  onCreateFile: (target: string) => void
  onOpenSource: (path: string, line?: number) => void
  onClose: () => void
}

export function MissingLinksPanel({ links, folderPath, focusedTarget, onCreateFile, onOpenSource, onClose }: Props) {
  const referenceCount = links.reduce((sum, link) => sum + link.references.length, 0)
  const normalizedFocus = focusedTarget ? normalizeWikiTarget(focusedTarget) : ''
  const sortedLinks = normalizedFocus
    ? [...links].sort((a, b) => Number(b.normalizedTarget === normalizedFocus) - Number(a.normalizedTarget === normalizedFocus))
    : links

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="缺失链接面板">
        <header className={styles.header}>
          <div>
            <h3>缺失链接</h3>
            <p>{folderPath || '当前未打开文件夹'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="缺失文档" value={links.length} />
          <SummaryCard label="引用" value={referenceCount} />
        </div>

        <div className={styles.content}>
          {links.length === 0 ? (
            <div className={styles.empty}>
              <strong>没有缺失链接</strong>
              <span>所有 Wiki 链接都能匹配到当前索引中的 Markdown 文件。</span>
            </div>
          ) : (
            <div className={styles.list}>
              {sortedLinks.map(link => {
                const isFocused = link.normalizedTarget === normalizedFocus

                return (
                  <article
                    key={link.normalizedTarget}
                    className={`${styles.item} ${isFocused ? styles.focusedItem : ''}`}
                    role="article"
                    aria-current={isFocused ? 'true' : undefined}
                  >
                    <div className={styles.itemTop}>
                      <div>
                        <h4>{link.target}</h4>
                        <span>{link.references.length} 处引用，来自 {link.sourceCount} 个文档</span>
                      </div>
                      <button type="button" className={styles.createBtn} onClick={() => onCreateFile(link.target)}>
                        创建
                      </button>
                    </div>
                    <div className={styles.references}>
                      {link.references.slice(0, 5).map(reference => (
                        <button
                          key={`${reference.sourcePath}-${reference.line}`}
                          type="button"
                          className={styles.reference}
                          onClick={() => onOpenSource(reference.sourcePath, reference.line)}
                        >
                          <span>{reference.sourceName} · 行 {reference.line}</span>
                          <strong>{reference.text}</strong>
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
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
