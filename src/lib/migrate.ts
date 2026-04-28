import {
  setStorageItem,
  getStorageItem,
  type StorageKey,
} from '../utils/storage'

const MIGRATION_FLAG_KEY = 'app-idb-migrated-v1'

/** Keys stored as simple exact key-value pairs in localStorage */
const EXACT_KEYS_TO_MIGRATE: string[] = [
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
  'reading-stats',
  'custom-css',
]

/** Prefixes for per-file pattern keys */
const PATTERN_PREFIXES: string[] = [
  'scroll-position-',
  'file-settings-',
  'outline-fold-',
  'code-fold-',
  'task-checks-',
  'bookmarks-',
]

function tryParse(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Run a one-time migration from localStorage to IndexedDB.
 * Safe to call multiple times: skips if already migrated.
 */
export async function runLocalStorageMigration(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
    return
  }

  // Nothing to migrate
  if (localStorage.length === 0) {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
    return
  }

  try {
    // Migrate exact keys
    for (const key of EXACT_KEYS_TO_MIGRATE) {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        // Avoid overwriting existing IndexedDB values (safety)
        const existing = await getStorageItem(key as StorageKey)
        if (existing === undefined) {
          await setStorageItem(key as StorageKey, tryParse(raw))
        }
      }
    }

    // Migrate pattern keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (PATTERN_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        const raw = localStorage.getItem(key)
        if (raw !== null) {
          const existing = await getStorageItem(key as StorageKey)
          if (existing === undefined) {
            await setStorageItem(key as StorageKey, tryParse(raw))
          }
        }
      }
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
  } catch (e) {
    console.error('[Migration] Failed to migrate from localStorage:', e)
  }
}
