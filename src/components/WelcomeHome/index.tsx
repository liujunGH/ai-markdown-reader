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
  latestReadingName?: string
  onOpenFile: () => void
  onOpenFolder: () => void
  onOpenRecent: () => void
  onOpenReadingTimeline: () => void
  onShowGuide: () => void
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
  latestReadingName,
  onOpenFile,
  onOpenFolder,
  onOpenRecent,
  onOpenReadingTimeline,
  onShowGuide,
  onReindex,
}: Props) {
  const indexStatus = isIndexing && indexProgress
    ? `索引中：发现 ${indexProgress.discoveredFiles}，已处理 ${indexProgress.indexedFiles}，跳过 ${indexProgress.skippedFiles}`
    : currentFolderPath
      ? `已索引 ${indexedFileCount} 个文件`
      : '未打开工作区'

  return (
    <section className={styles.home} aria-label="开始阅读">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>Markdown Reader</span>
        <h1>今天想读什么？</h1>
        <p>
          打开一个 Markdown 文件，选择一个资料夹，或回到上次停下的阅读位置。
        </p>
      </div>

      <div className={styles.primaryActions}>
        <button type="button" className={styles.primaryAction} onClick={onOpenFile} aria-label="从欢迎页打开 Markdown 文件">
          打开文件
        </button>
        <button type="button" className={styles.action} onClick={onOpenFolder} aria-label="从欢迎页选择资料夹">
          打开文件夹
        </button>
        <button type="button" className={styles.action} onClick={onOpenReadingTimeline} aria-label="从欢迎页继续阅读">
          继续阅读
        </button>
      </div>

      <div className={styles.context} aria-label="阅读状态">
        <div className={styles.contextItem}>
          <span className={styles.label}>最近阅读</span>
          <strong title={latestReadingName || undefined}>{latestReadingName || '还没有阅读记录'}</strong>
        </div>
        <div className={styles.contextItem}>
          <span className={styles.label}>当前文件夹</span>
          <strong title={currentFolderName || '未打开文件夹'}>{currentFolderName || '未打开文件夹'}</strong>
          <span className={styles.path} title={currentFolderPath || undefined}>
            {currentFolderPath || '打开文件夹后可使用全文搜索和索引诊断'}
          </span>
        </div>
      </div>

      <div className={styles.secondaryActions}>
        <button type="button" className={styles.textAction} data-guide="recent-files" onClick={onOpenRecent}>
          最近文件 {recentFileCount > 0 ? `(${recentFileCount})` : ''}
        </button>
        <button type="button" className={styles.textAction} onClick={onShowGuide}>
          使用提示
        </button>
        <button
          type="button"
          className={styles.textAction}
          onClick={onReindex}
          disabled={!currentFolderPath || isIndexing}
          aria-label="从欢迎页重建索引"
        >
          {isIndexing ? '索引中' : '重建索引'}
        </button>
        <span className={styles.indexStatus}>{indexStatus}</span>
        <span className={styles.indexStatus}>{readingHistoryCount} 条阅读记录</span>
      </div>
    </section>
  )
}
