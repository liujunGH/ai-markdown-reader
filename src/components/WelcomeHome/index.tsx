import styles from './WelcomeHome.module.css'

interface IndexProgressSummary {
  discoveredFiles: number
  indexedFiles: number
  skippedFiles: number
}

interface Props {
  recentFileCount: number
  readingHistoryCount: number
  indexedFileCount: number
  isIndexing: boolean
  indexProgress?: IndexProgressSummary | null
  currentFolderName: string
  currentFolderPath: string | null
  onOpenFolder: () => void
  onOpenRecent: () => void
  onOpenWorkspaces: () => void
  onOpenReadingTimeline: () => void
  onReindex: () => void
}

export function WelcomeHome({
  recentFileCount,
  readingHistoryCount,
  indexedFileCount,
  isIndexing,
  indexProgress,
  currentFolderName,
  currentFolderPath,
  onOpenFolder,
  onOpenRecent,
  onOpenWorkspaces,
  onOpenReadingTimeline,
  onReindex,
}: Props) {
  const indexStatus = isIndexing && indexProgress
    ? `索引中：发现 ${indexProgress.discoveredFiles}，已处理 ${indexProgress.indexedFiles}，跳过 ${indexProgress.skippedFiles}`
    : currentFolderPath
      ? `已索引 ${indexedFileCount} 个文件`
      : '未打开工作区'

  return (
    <section className={styles.home} aria-label="开始工作">
      <div className={styles.summary}>
        <div className={styles.workspace}>
          <span className={styles.label}>当前工作区</span>
          <strong title={currentFolderName || '未打开文件夹'}>
            {currentFolderName || '未打开文件夹'}
          </strong>
          <span className={styles.path} title={currentFolderPath || undefined}>
            {currentFolderPath || '打开文件夹后可以建立索引、查看图谱和恢复会话'}
          </span>
        </div>
        <div className={styles.stats} aria-label="恢复状态">
          <span>{recentFileCount} 个最近文件</span>
          <span>{readingHistoryCount} 条阅读记录</span>
        </div>
        <div className={styles.indexStatus} aria-label="索引状态">
          <span>{indexStatus}</span>
          <button
            type="button"
            className={styles.indexButton}
            onClick={onReindex}
            disabled={!currentFolderPath || isIndexing}
            aria-label="从欢迎页重建索引"
          >
            {isIndexing ? '索引中' : '重建索引'}
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primaryAction} onClick={onOpenFolder} aria-label="从欢迎页选择资料夹">
          打开文件夹
        </button>
        <button type="button" className={styles.action} onClick={onOpenRecent} aria-label="从欢迎页查看最近文件">
          最近文件
        </button>
        <button type="button" className={styles.action} onClick={onOpenWorkspaces} aria-label="从欢迎页打开工作区">
          工作区
        </button>
        <button type="button" className={styles.action} onClick={onOpenReadingTimeline} aria-label="从欢迎页打开阅读时间线">
          时间线
        </button>
      </div>
    </section>
  )
}
