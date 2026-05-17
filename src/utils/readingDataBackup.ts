import type { StorageKey } from './storage'

export const READING_DATA_BACKUP_VERSION = 1

const EXACT_BACKUP_KEYS = new Set<string>([
  'theme',
  'accentColor',
  'codeTheme',
  'has-seen-guide',
  'session-tabs',
  'session-active-tab',
  'max-tabs',
  'search-history',
  'followSystem',
  'autoDark',
  'folder-bookmarks',
  'workspaces',
  'reading-history',
  'index-settings',
  'read-later-count',
  'reader-marks',
  'reader-queue',
  'reader-preset',
  'reader-layout',
  'reader-sessions',
  'reader-chapters',
  'reader-accessibility',
  'reader-focus-timer',
  'reader-snapshots',
])

const PATTERN_BACKUP_KEYS = [
  /^index-diagnostics-.+$/,
  /^scroll-position-.+$/,
  /^file-settings-.+$/,
  /^outline-fold-.+$/,
  /^code-fold-.+$/,
  /^task-checks-.+$/,
  /^bookmarks-.+$/,
  /^workspace-session-.+$/,
]

export interface ReadingDataBackup {
  version: typeof READING_DATA_BACKUP_VERSION
  createdAt: string
  app: 'ai-markdown-reader'
  items: Record<string, string>
}

export interface ReadingDataImportResult {
  success: boolean
  imported: number
  skipped: number
  error?: string
}

export function isBackupStorageKey(key: string): key is StorageKey {
  if (EXACT_BACKUP_KEYS.has(key)) return true
  return PATTERN_BACKUP_KEYS.some(pattern => pattern.test(key))
}

export function createReadingDataBackup(): ReadingDataBackup {
  const items: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !isBackupStorageKey(key)) continue
      const value = localStorage.getItem(key)
      if (value !== null) {
        items[key] = value
      }
    }
  } catch {
    // Return the items collected so far if localStorage becomes unavailable.
  }

  return {
    version: READING_DATA_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    app: 'ai-markdown-reader',
    items,
  }
}

export function applyReadingDataBackup(raw: string): ReadingDataImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, imported: 0, skipped: 0, error: '备份文件不是有效 JSON' }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, imported: 0, skipped: 0, error: '备份文件格式不正确' }
  }

  const backup = parsed as Partial<ReadingDataBackup>
  if ((backup.app && backup.app !== 'ai-markdown-reader') || backup.version !== READING_DATA_BACKUP_VERSION || !backup.items || typeof backup.items !== 'object') {
    return { success: false, imported: 0, skipped: 0, error: '备份版本或来源不匹配' }
  }

  let imported = 0
  let skipped = 0
  for (const [key, value] of Object.entries(backup.items)) {
    if (!isBackupStorageKey(key) || typeof value !== 'string') {
      skipped++
      continue
    }
    try {
      localStorage.setItem(key, value)
      imported++
    } catch {
      skipped++
    }
  }

  return { success: true, imported, skipped }
}
