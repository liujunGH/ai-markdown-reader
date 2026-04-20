import { useMemo } from 'react'
import styles from './ReadingStatsPanel.module.css'
import type { ReadingStats, DailyReadingRecord } from '../../hooks/useReadingStats'
import { basename } from '../../utils/path'

interface ReadingStatsPanelProps {
  isOpen: boolean
  onClose: () => void
  stats: ReadingStats
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}

function getIntensity(seconds: number): number {
  if (seconds === 0) return 0
  if (seconds < 900) return 1
  if (seconds < 1800) return 2
  if (seconds < 3600) return 3
  return 4
}

function generateWeeks(weekCount: number): string[][] {
  const weeks: string[][] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dayOfWeek = today.getDay()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - dayOfWeek - (weekCount - 1) * 7)

  for (let w = 0; w < weekCount; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      week.push(date.toISOString().split('T')[0])
    }
    weeks.push(week)
  }

  return weeks
}

function Heatmap({ daily }: { daily: Record<string, DailyReadingRecord> }) {
  const weeks = useMemo(() => generateWeeks(52), [])

  return (
    <div className={styles.heatmap}>
      {weeks.map((week, wi) => (
        <div key={wi} className={styles.week}>
          {week.map((day, di) => {
            const record = daily[day]
            const intensity = getIntensity(record?.totalTime || 0)
            return (
              <div
                key={di}
                className={`${styles.day} ${styles[`intensity-${intensity}`]}`}
                title={`${day}: ${formatTime(record?.totalTime || 0)}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function ReadingStatsPanel({
  isOpen,
  onClose,
  stats
}: ReadingStatsPanelProps) {
  const today = new Date().toISOString().split('T')[0]

  const weekOverview = useMemo(() => {
    const now = new Date()
    let totalTime = 0
    const uniqueFiles = new Set<string>()

    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const record = stats.daily[dateStr]
      if (record) {
        totalTime += record.totalTime
        record.filesRead.forEach((f) => uniqueFiles.add(f))
      }
    }

    return {
      totalTime,
      fileCount: uniqueFiles.size,
      avgDaily: Math.round(totalTime / 7)
    }
  }, [stats])

  const topFiles = useMemo(() => {
    return Object.values(stats.files)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10)
  }, [stats])

  const todayRecord = stats.daily[today]

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📊 阅读统计</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Week Overview */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>本周概览</h4>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <div className={styles.overviewValue}>
                  {formatTime(weekOverview.totalTime)}
                </div>
                <div className={styles.overviewLabel}>总阅读时长</div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewValue}>
                  {weekOverview.fileCount}
                </div>
                <div className={styles.overviewLabel}>阅读文件数</div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewValue}>
                  {formatTime(weekOverview.avgDaily)}
                </div>
                <div className={styles.overviewLabel}>平均每日</div>
              </div>
            </div>
          </section>

          {/* Heatmap */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>阅读热力图</h4>
            <Heatmap daily={stats.daily} />
            <div className={styles.heatmapLegend}>
              <span className={styles.legendLabel}>少</span>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`${styles.legendDay} ${styles[`intensity-${i}`]}`}
                />
              ))}
              <span className={styles.legendLabel}>多</span>
            </div>
          </section>

          {/* Today's reading */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>今日阅读</h4>
            <div className={styles.todayTime}>
              已读 {formatTime(todayRecord?.totalTime || 0)}
            </div>
            {todayRecord && todayRecord.filesRead.length > 0 && (
              <div className={styles.fileList}>
                {todayRecord.filesRead.map((path) => {
                  const file = stats.files[path]
                  return (
                    <div key={path} className={styles.fileItem}>
                      <span className={styles.fileName}>
                        {file?.fileName || basename(path)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Top files */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>最常读文件</h4>
            <div className={styles.topFilesList}>
              {topFiles.map((file) => (
                <div key={file.filePath} className={styles.topFileItem}>
                  <span className={styles.topFileName}>{file.fileName}</span>
                  <span className={styles.topFileTime}>
                    {formatTime(file.totalTime)}
                  </span>
                  <span className={styles.topFileLast}>
                    {new Date(file.lastReadAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
