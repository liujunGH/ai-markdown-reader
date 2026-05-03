import { getStorageItem, setStorageItem } from './storage'

const READING_HISTORY_KEY = 'reading-history'
const MAX_HISTORY = 80

export interface ReadingHistoryItem {
  filePath: string
  name: string
  progress: number
  line?: number
  scrollTop?: number
  updatedAt: number
}

export function getReadingHistory(): ReadingHistoryItem[] {
  try {
    return JSON.parse(getStorageItem(READING_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function recordReadingHistory(item: Omit<ReadingHistoryItem, 'updatedAt'>): void {
  if (!item.filePath) return
  const next: ReadingHistoryItem = {
    ...item,
    progress: Math.max(0, Math.min(1, item.progress || 0)),
    scrollTop: Math.max(0, Math.round(item.scrollTop || 0)),
    updatedAt: Date.now(),
  }
  const history = [next, ...getReadingHistory().filter(existing => existing.filePath !== item.filePath)].slice(0, MAX_HISTORY)
  setStorageItem(READING_HISTORY_KEY, JSON.stringify(history))
}
