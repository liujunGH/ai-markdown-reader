import { useCallback } from 'react'
import styles from './SemanticSearch.module.css'
import { useSemanticSearch } from '../../hooks/useSemanticSearch'

interface SemanticSearchProps {
  folderPath: string | null
  onClose: () => void
}

export function SemanticSearch({ folderPath, onClose }: SemanticSearchProps) {
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
    <div className={styles.container} role="search" aria-label="语义搜索">
      <div className={styles.header}>
        <h3 className={styles.title}>语义搜索</h3>
        <button className={styles.closeButton} onClick={onClose} title="关闭" aria-label="关闭">
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
            placeholder="输入自然语言查询..."
            aria-label="语义搜索查询"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isIndexing || isModelLoading}
          />
          <button
            className={styles.searchButton}
            onClick={handleSearch}
            disabled={isLoading || isIndexing || isModelLoading || !query.trim()}
            aria-label="搜索"
          >
            搜索
          </button>
        </div>

        <button
          className={styles.indexButton}
          onClick={handleIndexFolder}
          disabled={isIndexing || isModelLoading || !folderPath}
          aria-label="索引当前文件夹"
        >
          <span aria-hidden="true">📂</span>
          <span>{isIndexing ? '索引中...' : '索引文件夹'}</span>
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
            {isModelLoading && <div>{modelLoadingProgress || '正在加载模型...'}</div>}
            {isIndexing && (
              <div>
                <strong>
                  {indexedCount} / {totalFiles}
                </strong>{' '}
                文件已索引
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
            <div className={styles.loadingText}>正在搜索...</div>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <>
            <div className={styles.resultsHeader}>搜索结果 ({results.length})</div>
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
            <div className={styles.emptyText}>未找到相关结果</div>
          </div>
        )}

        {!isLoading && !isIndexing && !query.trim() && results.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              ✨
            </div>
            <div className={styles.emptyText}>
              输入自然语言描述来搜索文档内容
              <br />
              首次使用需点击「索引文件夹」构建语义索引
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
