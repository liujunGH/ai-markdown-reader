import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computeDocumentStats } from '../../utils/documentStats'
import styles from './StatusBar.module.css'

interface Props {
  content: string
}

export function StatusBar({ content }: Props) {
  const { t } = useTranslation()
  const stats = useMemo(() => {
    return computeDocumentStats(content)
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
