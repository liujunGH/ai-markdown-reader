/**
 * StatusBar v2 —— 底部状态栏（字数/阅读时间/行尾/版本）
 *
 * 迁移自 src/components/StatusBar。差异：content 从 DocumentCache 取（激活标签），
 * 不再通过 props 接收。直接订阅 tabStore 取激活 tabId。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTabStore } from '../../state'
import { getContent } from '../../resources/DocumentCache'
import styles from '../../components/StatusBar/StatusBar.module.css'

export function StatusBar() {
  const { t } = useTranslation()
  const activeTabId = useTabStore((s) => s.activeTabId)
  const contentVersion = useTabStore((s) => s.tabs.length) // 标签变化时重算

  const stats = useMemo(() => {
    void contentVersion // 依赖（标签集变化重算）
    const content = getContent(activeTabId) ?? ''
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.ceil(wordCount / 300)
    const crlfCount = (content.match(/\r\n/g) || []).length
    const lfOnlyCount = (content.replace(/\r\n/g, '').match(/\n/g) || []).length
    const lineEnding = crlfCount > lfOnlyCount ? 'CRLF' : 'LF'
    return { wordCount, readingTime, lineEnding }
  }, [activeTabId, contentVersion])

  return (
    <footer className={styles.statusBar}>
      <span>{t('statusBar.words', { count: stats.wordCount })}</span>
      <span className={styles.separator}>|</span>
      <span>{t('statusBar.readingTime', { time: stats.readingTime })}</span>
      <span className={styles.separator}>|</span>
      <span>{t('statusBar.lineEnding', { ending: stats.lineEnding })}</span>
      <span className={styles.separator}>|</span>
      <span>{t('statusBar.encoding')}</span>
      <span className={styles.separator}>|</span>
      <span title="当前应用版本">v{__APP_VERSION__}</span>
    </footer>
  )
}
