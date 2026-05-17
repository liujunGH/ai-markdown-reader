import { TabContentStatus } from '../../types/Tab'
import styles from './DocumentLoadState.module.css'

interface DocumentLoadStateProps {
  fileName?: string
  status?: TabContentStatus
  error?: string
  onRetry?: () => void
}

export function DocumentLoadState({ fileName, status = 'loading', error, onRetry }: DocumentLoadStateProps) {
  const isError = status === 'error'

  return (
    <div className={styles.container} role={isError ? 'alert' : 'status'} aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" data-error={String(isError)} />
      <div className={styles.copy}>
        <strong>{isError ? '文档加载失败' : '正在加载文档'}</strong>
        <span>{fileName || '未命名文档'}</span>
        {isError && error && <p>{error}</p>}
      </div>
      {isError && onRetry && (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  )
}
