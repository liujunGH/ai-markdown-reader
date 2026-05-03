import { useMemo, useState } from 'react'
import { filterReadingTimelineItems, type ReadingTimelineStatusFilter } from '../../utils/readingExperience'
import styles from './ReadingTimelinePanel.module.css'

export interface ReadingTimelineItem {
  filePath: string
  name: string
  progress: number
  line?: number
  scrollTop?: number
  updatedAt: number
}

interface Props {
  items: ReadingTimelineItem[]
  onOpenFile: (filePath: string, line?: number, scrollTop?: number) => void
  onClose: () => void
}

type TimelineGroup = 'today' | 'yesterday' | 'earlier'

const GROUP_LABELS: Record<TimelineGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

export function ReadingTimelinePanel({ items, onOpenFile, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ReadingTimelineStatusFilter>('all')
  const filteredItems = useMemo(() => (
    filterReadingTimelineItems(items, { query, status })
  ), [items, query, status])
  const groupedItems = useMemo(() => {
    const sortedItems = [...filteredItems].sort((a, b) => b.updatedAt - a.updatedAt)
    const groups: Record<TimelineGroup, ReadingTimelineItem[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    }

    sortedItems.forEach(item => {
      groups[getTimelineGroup(item.updatedAt)].push(item)
    })

    return groups
  }, [filteredItems])

  const visibleGroups = (Object.keys(groupedItems) as TimelineGroup[])
    .filter(group => groupedItems[group].length > 0)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="阅读时间线">
        <header className={styles.header}>
          <div>
            <h3>阅读时间线</h3>
            <p>共 {items.length} 条阅读记录 · 当前显示 {filteredItems.length} 条</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.filters}>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索阅读记录"
            aria-label="搜索阅读记录"
          />
          <div className={styles.filterTabs} aria-label="阅读状态筛选">
            <button type="button" className={status === 'all' ? styles.activeFilter : ''} onClick={() => setStatus('all')}>全部</button>
            <button type="button" className={status === 'unfinished' ? styles.activeFilter : ''} onClick={() => setStatus('unfinished')}>未读完</button>
            <button type="button" className={status === 'completed' ? styles.activeFilter : ''} onClick={() => setStatus('completed')}>已读完</button>
          </div>
        </div>

        <div className={styles.content}>
          {filteredItems.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🕘</div>
              <div className={styles.emptyTitle}>{items.length === 0 ? '暂无阅读记录' : '没有匹配的阅读记录'}</div>
              <div className={styles.emptySubtitle}>{items.length === 0 ? '打开文档并滚动阅读后，会在这里形成时间线' : '换一个关键词或筛选状态试试'}</div>
            </div>
          ) : (
            visibleGroups.map(group => (
              <section className={styles.group} key={group}>
                <h4>{GROUP_LABELS[group]} · {groupedItems[group].length}</h4>
                <div className={styles.list} role="list" aria-label={`${GROUP_LABELS[group]}阅读记录`}>
                  {groupedItems[group].map(item => {
                    const progress = clampProgress(item.progress)

                    return (
                      <button
                        type="button"
                        key={`${item.filePath}-${item.updatedAt}`}
                        className={styles.timelineItem}
                        onClick={() => onOpenFile(item.filePath, item.line, item.scrollTop)}
                      >
                        <div className={styles.itemTop}>
                          <strong title={item.name}>{item.name}</strong>
                          <span>{formatClock(item.updatedAt)}</span>
                        </div>
                        <div className={styles.path} title={item.filePath}>{item.filePath}</div>
                        <div className={styles.meta}>
                          <span>{progress}%</span>
                          {typeof item.line === 'number' && <span>行 {item.line}</span>}
                        </div>
                        <div className={styles.progressTrack} aria-hidden="true">
                          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function getTimelineGroup(timestamp: number): TimelineGroup {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  if (itemDay >= today) return 'today'
  if (itemDay >= yesterday) return 'yesterday'
  return 'earlier'
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress * 100)))
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
