const STORAGE_VERSION = '1.2.2'
const VERSION_KEY = 'app-storage-version'

export type ExactStorageKey =
  | 'theme'
  | 'accentColor'
  | 'codeTheme'
  | 'has-seen-guide'
  | 'session-tabs'
  | 'session-active-tab'
  | 'max-tabs'
  | 'search-history'
  | 'followSystem'
  | 'autoDark'
  | 'folder-bookmarks'
  | 'reading-stats'
  | 'custom-css'

export type PatternStorageKey =
  | `scroll-position-${string}`
  | `file-settings-${string}`
  | `outline-fold-${string}`
  | `code-fold-${string}`
  | `task-checks-${string}`
  | `bookmarks-${string}`

export type StorageKey = ExactStorageKey | PatternStorageKey

export function getStorageItem(
  key: StorageKey,
  defaultValue?: string
): string | undefined {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? stored : defaultValue
  } catch {
    return defaultValue
  }
}

export function setStorageItem(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 存储空间满时静默失败
  }
}

export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // 静默失败
  }
}

export function clearStorage(): void {
  try {
    localStorage.clear()
  } catch {
    // 静默失败
  }
}

// sessionStorage wrappers
export function getSessionItem(
  key: StorageKey,
  defaultValue?: string
): string | undefined {
  try {
    const stored = sessionStorage.getItem(key)
    return stored !== null ? stored : defaultValue
  } catch {
    return defaultValue
  }
}

export function setSessionItem(key: StorageKey, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // 存储空间满时静默失败
  }
}

export function removeSessionItem(key: StorageKey): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // 静默失败
  }
}

export function clearSession(): void {
  try {
    sessionStorage.clear()
  } catch {
    // 静默失败
  }
}

// Version checking and migration
export function checkStorageVersion(): void {
  const storedVersion = localStorage.getItem(VERSION_KEY)
  if (storedVersion !== STORAGE_VERSION) {
    migrateStorage(storedVersion)
    try {
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
    } catch {
      // 静默失败
    }
  }
}

function migrateStorage(oldVersion: string | null): void {
  if (!oldVersion) {
    // 首次使用，无需迁移
    return
  }
  // 未来版本间迁移逻辑在这里添加
  // 例如：如果 oldVersion < '1.3.0'，执行某些转换
}
