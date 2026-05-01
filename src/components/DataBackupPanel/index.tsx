import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/db'
import styles from './DataBackupPanel.module.css'

interface DataBackupPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface BackupData {
  version: string
  exportedAt: string
  localStorage: Record<string, string>
  indexedDB: Record<string, unknown[]>
}

const BACKUP_VERSION = '1.0'

async function collectAllData(): Promise<BackupData> {
  const localStorageData: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      localStorageData[key] = localStorage.getItem(key) || ''
    }
  }

  const indexedDBData: Record<string, unknown[]> = {}
  const tables = [
    'app_settings',
    'file_settings',
    'scroll_positions',
    'outline_folds',
    'code_folds',
    'task_checks',
    'bookmarks',
    'reading_stats',
    'session',
    'folder_bookmarks',
    'search_history',
  ] as const

  for (const table of tables) {
    try {
      const items = await db.table(table).toArray()
      indexedDBData[table] = items
    } catch (e) {
      console.warn(`[DataBackup] Failed to read table ${table}:`, e)
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: localStorageData,
    indexedDB: indexedDBData,
  }
}

async function restoreAllData(data: BackupData): Promise<void> {
  if (!data.localStorage || !data.indexedDB) {
    throw new Error('Invalid backup structure')
  }

  // Restore localStorage
  for (const [key, value] of Object.entries(data.localStorage)) {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn(`[DataBackup] Failed to restore localStorage key ${key}:`, e)
    }
  }

  // Restore IndexedDB
  for (const [table, items] of Object.entries(data.indexedDB)) {
    if (!Array.isArray(items)) continue
    try {
      const dbTable = db.table(table)
      await dbTable.clear()
      if (items.length > 0) {
        await dbTable.bulkAdd(items as any)
      }
    } catch (e) {
      console.warn(`[DataBackup] Failed to restore table ${table}:`, e)
    }
  }
}

export function DataBackupPanel({ isOpen, onClose }: DataBackupPanelProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showMessage = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }, [])

  const handleExport = useCallback(async () => {
    try {
      const data = await collectAllData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const fileName = `ai-markdown-reader-backup-${new Date().toISOString().slice(0, 10)}.json`

      if (window.electronAPI?.showSaveDialog) {
        const result = await window.electronAPI.showSaveDialog({
          defaultPath: fileName,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        })
        if (result?.filePath) {
          // Note: electron main process would need to write the file.
          // For now we fall through to the browser download fallback.
        }
      }

      // Fallback to download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      showMessage(t('dataBackup.exportSuccess'))
    } catch (err) {
      showMessage(t('dataBackup.exportError'), 'error')
      console.error('[DataBackup] Export failed:', err)
    }
  }, [showMessage, t])

  const processImportFile = useCallback(async (file: File) => {
    try {
      setIsImporting(true)
      const text = await file.text()
      const data: BackupData = JSON.parse(text)

      if (!data.version || !data.localStorage || !data.indexedDB) {
        showMessage(t('dataBackup.invalidFile'), 'error')
        return
      }

      if (!window.confirm(t('dataBackup.confirmImport'))) {
        return
      }

      await restoreAllData(data)
      showMessage(t('dataBackup.importSuccess'))
    } catch (err) {
      showMessage(t('dataBackup.importError', { error: String(err) }), 'error')
      console.error('[DataBackup] Import failed:', err)
    } finally {
      setIsImporting(false)
    }
  }, [showMessage, t])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImportFile(file)
    }
    e.target.value = ''
  }, [processImportFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/json') {
      processImportFile(file)
    }
  }, [processImportFile])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('dataBackup.title')}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleExport}>
              <span className={styles.actionIcon}>💾</span>
              <span className={styles.actionLabel}>{t('dataBackup.export')}</span>
              <span className={styles.actionDesc}>{t('dataBackup.exportDescription')}</span>
            </button>

            <button
              className={styles.actionBtn}
              onClick={handleImportClick}
              disabled={isImporting}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <span className={styles.actionIcon}>📂</span>
              <span className={styles.actionLabel}>
                {isImporting ? t('dataBackup.importing') : t('dataBackup.import')}
              </span>
              <span className={styles.actionDesc}>{t('dataBackup.importDescription')}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />

          {message && (
            <div className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageSuccess}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
