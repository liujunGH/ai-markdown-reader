import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './StatusBar.module.css'

interface Props {
  content: string
}

export function StatusBar({ content }: Props) {
  const { t } = useTranslation()
  const stats = useMemo(() => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.ceil(wordCount / 300)

    const crlfCount = (content.match(/\r\n/g) || []).length
    const lfOnlyCount = (content.replace(/\r\n/g, '').match(/\n/g) || []).length
    const lineEnding = crlfCount > lfOnlyCount ? 'CRLF' : 'LF'

    return { wordCount, readingTime, lineEnding }
  }, [content])

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
