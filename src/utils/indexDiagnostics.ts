import { getStorageItem, removeStorageItem, setStorageItem } from './storage'
import type { IndexSkippedItem } from './searchIndex'

const MAX_SAVED_SKIPPED_ITEMS = 200

export interface SavedIndexDiagnostics {
  folderPath: string
  skippedItems: IndexSkippedItem[]
  updatedAt: number | null
}

export interface IndexPolicy {
  maxFileSizeBytes: number
  skipDirectoryNames: string[]
}

export interface FormattedIndexPolicy {
  maxFileSize: string
  skippedDirectories: string
}

export function loadSavedIndexDiagnostics(folderPath: string): SavedIndexDiagnostics {
  const fallback = emptyDiagnostics(folderPath)
  const stored = getStorageItem(indexDiagnosticsKey(folderPath))
  if (!stored) return fallback

  try {
    const parsed = JSON.parse(stored) as Partial<SavedIndexDiagnostics>
    if (parsed.folderPath !== folderPath || !Array.isArray(parsed.skippedItems) || typeof parsed.updatedAt !== 'number') {
      return fallback
    }
    return {
      folderPath,
      skippedItems: parsed.skippedItems.filter(isIndexSkippedItem).slice(-MAX_SAVED_SKIPPED_ITEMS),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return fallback
  }
}

export function saveIndexDiagnostics(folderPath: string, skippedItems: IndexSkippedItem[], updatedAt = Date.now()): void {
  const payload: SavedIndexDiagnostics = {
    folderPath,
    skippedItems: skippedItems.filter(isIndexSkippedItem).slice(-MAX_SAVED_SKIPPED_ITEMS),
    updatedAt,
  }
  setStorageItem(indexDiagnosticsKey(folderPath), JSON.stringify(payload))
}

export function clearSavedIndexDiagnostics(folderPath: string): void {
  removeStorageItem(indexDiagnosticsKey(folderPath))
}

export function formatIndexPolicy(policy: IndexPolicy): FormattedIndexPolicy {
  return {
    maxFileSize: formatBytes(policy.maxFileSizeBytes),
    skippedDirectories: policy.skipDirectoryNames.join('、'),
  }
}

function emptyDiagnostics(folderPath: string): SavedIndexDiagnostics {
  return { folderPath, skippedItems: [], updatedAt: null }
}

function indexDiagnosticsKey(folderPath: string): `index-diagnostics-${string}` {
  return `index-diagnostics-${encodeURIComponent(folderPath)}`
}

function isIndexSkippedItem(value: unknown): value is IndexSkippedItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<IndexSkippedItem>
  return (
    typeof item.path === 'string'
    && typeof item.name === 'string'
    && (
      item.reason === 'ignored-directory'
      || item.reason === 'large-file'
      || item.reason === 'read-error'
    )
  )
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${Number(kb.toFixed(kb >= 10 ? 0 : 1))} KB`
  const mb = kb / 1024
  return `${Number(mb.toFixed(mb >= 10 ? 0 : 1))} MB`
}
