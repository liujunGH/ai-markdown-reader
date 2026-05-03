import { useEffect, useMemo, useState } from 'react'
import { formatIndexPolicy, type IndexPolicy } from '../../utils/indexDiagnostics'
import type { IndexSettings } from '../../utils/indexSettings'
import { formatIndexSkippedItem, type IndexSkippedItem } from '../../utils/searchIndex'
import styles from './IndexDiagnosticsPanel.module.css'

interface Props {
  folderPath?: string | null
  skippedItems: IndexSkippedItem[]
  isIndexing: boolean
  policy: IndexPolicy
  settings: IndexSettings
  updatedAt: number | null
  onReindex: () => void
  onClear: () => void
  onSaveSettings: (settings: IndexSettings) => void
  onResetSettings: () => void
  onClose: () => void
}

const REASON_LABELS: Record<IndexSkippedItem['reason'], string> = {
  'ignored-directory': '忽略目录',
  'large-file': '文件过大',
  'read-error': '读取失败',
}

type ReasonFilter = 'all' | IndexSkippedItem['reason']

const FILTERS: Array<{ value: ReasonFilter; label: string; ariaLabel: string }> = [
  { value: 'all', label: '全部', ariaLabel: '查看全部跳过项' },
  { value: 'ignored-directory', label: '忽略目录', ariaLabel: '只看忽略目录' },
  { value: 'large-file', label: '文件过大', ariaLabel: '只看文件过大' },
  { value: 'read-error', label: '读取失败', ariaLabel: '只看读取失败' },
]

export function IndexDiagnosticsPanel({
  folderPath,
  skippedItems,
  isIndexing,
  policy,
  settings,
  updatedAt,
  onReindex,
  onClear,
  onSaveSettings,
  onResetSettings,
  onClose,
}: Props) {
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all')
  const [draftMaxFileSizeMb, setDraftMaxFileSizeMb] = useState(String(settings.maxFileSizeMb))
  const [draftExtraDirectories, setDraftExtraDirectories] = useState(settings.extraSkipDirectoryNames.join('\n'))
  const reasonCounts = countReasons(skippedItems)
  const formattedPolicy = useMemo(() => formatIndexPolicy(policy), [policy])
  const filteredItems = useMemo(() => (
    reasonFilter === 'all'
      ? skippedItems
      : skippedItems.filter(item => item.reason === reasonFilter)
  ), [reasonFilter, skippedItems])

  useEffect(() => {
    setDraftMaxFileSizeMb(String(settings.maxFileSizeMb))
    setDraftExtraDirectories(settings.extraSkipDirectoryNames.join('\n'))
  }, [settings])

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

        <div className={styles.policy}>
          <div>
            <strong>索引规则</strong>
            <span>{updatedAt ? `上次诊断：${new Date(updatedAt).toLocaleString('zh-CN')}` : '还没有保存的诊断'}</span>
          </div>
          <dl>
            <div>
              <dt>最大文件</dt>
              <dd>最大文件：{formattedPolicy.maxFileSize}</dd>
            </div>
            <div>
              <dt>忽略目录</dt>
              <dd>{formattedPolicy.skippedDirectories}</dd>
            </div>
          </dl>
        </div>

        <form
          className={styles.settings}
          onSubmit={event => {
            event.preventDefault()
            onSaveSettings({
              maxFileSizeMb: Number(draftMaxFileSizeMb),
              extraSkipDirectoryNames: draftExtraDirectories.split(/\r?\n|,/).map(name => name.trim()).filter(Boolean),
            })
          }}
        >
          <div className={styles.settingsHeader}>
            <strong>索引设置</strong>
            <span>保存后下次扫描生效，可直接点击重新扫描。</span>
          </div>
          <div className={styles.settingsGrid}>
            <label>
              <span>最大索引文件大小 MB</span>
              <input
                type="number"
                min="1"
                max="500"
                step="1"
                value={draftMaxFileSizeMb}
                onChange={event => setDraftMaxFileSizeMb(event.target.value)}
              />
            </label>
            <label>
              <span>额外忽略目录</span>
              <textarea
                value={draftExtraDirectories}
                onChange={event => setDraftExtraDirectories(event.target.value)}
                placeholder="每行一个目录名，如 drafts"
              />
            </label>
          </div>
          <div className={styles.settingsActions}>
            <button type="submit" aria-label="保存索引设置">保存设置</button>
            <button type="button" className={styles.secondaryBtn} onClick={onResetSettings} aria-label="恢复默认索引设置">
              恢复默认
            </button>
          </div>
        </form>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClear} disabled={skippedItems.length === 0} aria-label="清空诊断">
            清空诊断
          </button>
          <button type="button" onClick={onReindex} disabled={isIndexing || !folderPath} aria-label="重新扫描索引">
            {isIndexing ? '正在索引...' : '重新扫描'}
          </button>
        </div>

        <div className={styles.filters} aria-label="跳过原因筛选">
          {FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              className={reasonFilter === filter.value ? styles.activeFilter : ''}
              onClick={() => setReasonFilter(filter.value)}
              aria-label={filter.ariaLabel}
              aria-pressed={reasonFilter === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {skippedItems.length === 0 ? (
            <div className={styles.empty}>
              <strong>没有跳过项</strong>
              <span>最近一次索引没有发现被忽略、过大或读取失败的项目。</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.empty}>
              <strong>当前筛选没有结果</strong>
              <span>换一个跳过原因，或重新扫描索引刷新诊断。</span>
            </div>
          ) : (
            <div className={styles.list}>
              {filteredItems.map((item, index) => (
                <article key={`${item.path}-${index}`} className={styles.item}>
                  <div className={styles.itemTop}>
                    <strong>{formatIndexSkippedItem(item)}</strong>
                    <span>{REASON_LABELS[item.reason]}</span>
                  </div>
                  <p title={item.path}>{item.path}</p>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(item.path)} aria-label={`复制路径 ${item.name}`}>
                      复制路径
                    </button>
                    <button type="button" onClick={() => void window.electronAPI?.showInFolder(item.path)} aria-label={`在 Finder 中显示 ${item.name}`}>
                      在 Finder 中显示
                    </button>
                  </div>
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
