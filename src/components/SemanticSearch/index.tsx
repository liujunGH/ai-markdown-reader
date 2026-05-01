import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './SemanticSearch.module.css'
import { useSemanticSearch } from '../../hooks/useSemanticSearch'

interface SemanticSearchProps {
  folderPath: string | null
  onClose: () => void
}

export function SemanticSearch({ folderPath, onClose }: SemanticSearchProps) {
  const { t } = useTranslation()
  const {
    query,
    setQuery,
    results,
    isLoading,
    isIndexing,
    isModelLoading,
    modelLoadingProgress,
    indexedCount,
    totalFiles,
    currentFile,
    error,
    search,
    indexFolder,
  } = useSemanticSearch()

  const handleSearch = useCallback(() => {
    search()
  }, [search])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        search()
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [search, onClose]
  )

  const handleIndexFolder = useCallback(() => {
    if (folderPath) {
      indexFolder(folderPath)
    }
  }, [folderPath, indexFolder])

  const handleResultClick = useCallback((result: { filePath: string; content: string; score: number }) => {
    console.log('SemanticSearch result clicked:', result)
  }, [])

  const progressPercent = totalFiles > 0 ? Math.round((indexedCount / totalFiles) * 100) : 0

  return (
    <div className={styles.container} role="search" aria-label={t('semanticSearch.title')}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('semanticSearch.title')}</h3>
        <button className={styles.closeButton} onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>
          ✕
        </button>
      </div>

      <div className={styles.searchArea}>
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className={styles.input}
            placeholder={t('semanticSearch.placeholder')}
            aria-label={t('semanticSearch.ariaLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isIndexing || isModelLoading}
          />
          <button
            className={styles.searchButton}
            onClick={handleSearch}
            disabled={isLoading || isIndexing || isModelLoading || !query.trim()}
            aria-label={t('common.search')}
          >
            {t('common.search')}
          </button>
        </div>

        <button
          className={styles.indexButton}
          onClick={handleIndexFolder}
          disabled={isIndexing || isModelLoading || !folderPath}
          aria-label={t('semanticSearch.indexFolder')}
        >
          <span aria-hidden="true">📂</span>
          <span>{isIndexing ? t('semanticSearch.indexing') : t('semanticSearch.indexFolder')}</span>
        </button>
      </div>

      {(isIndexing || isModelLoading) && (
        <div className={styles.statusArea}>
          {isIndexing && totalFiles > 0 && (
            <div className={styles.progressBar} role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
          )}
          <div className={styles.statusText}>
            {isModelLoading && <div>{modelLoadingProgress || t('semanticSearch.loadingModel')}</div>}
            {isIndexing && (
              <div>
                <strong>
                  {indexedCount} / {totalFiles}
                </strong>{' '}
                {t('semanticSearch.filesIndexed')}
              </div>
            )}
            {currentFile && isIndexing && (
              <div style={{ marginTop: 4, fontSize: '11px', opacity: 0.7 }}>{currentFile}</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.statusArea}>
          <div className={styles.errorText} role="alert">
            {error}
          </div>
        </div>
      )}

      <div className={styles.resultsArea}>
        {isLoading && !isModelLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} aria-hidden="true" />
            <div className={styles.loadingText}>{t('semanticSearch.searching')}</div>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <>
            <div className={styles.resultsHeader}>{t('semanticSearch.resultsHeader', { count: results.length })}</div>
            <div className={styles.resultList} role="list">
              {results.map((result, index) => (
                <button
                  key={`${result.filePath}-${index}`}
                  className={styles.resultItem}
                  onClick={() => handleResultClick(result)}
                  role="listitem"
                >
                  <div className={styles.resultHeader}>
                    <span className={styles.resultPath} title={result.filePath}>
                      {result.filePath}
                    </span>
                    <span className={styles.resultScore}>{(result.score * 100).toFixed(1)}%</span>
                  </div>
                  <div className={styles.resultContent}>{result.content}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {!isLoading && !isIndexing && query.trim() && results.length === 0 && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              🔍
            </div>
            <div className={styles.emptyText}>{t('semanticSearch.noResults')}</div>
          </div>
        )}

        {!isLoading && !isIndexing && !query.trim() && results.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              ✨
            </div>
            <div className={styles.emptyText}>
              {t('semanticSearch.emptyStateHint1')}
              <br />
              {t('semanticSearch.emptyStateHint2')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
