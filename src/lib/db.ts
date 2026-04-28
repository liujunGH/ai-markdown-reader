import Dexie, { Table } from 'dexie'

/** Generic key-value store for global app settings (theme, accentColor, etc.) */
export interface AppSetting {
  key: string
  value: any
}

/** Per-file settings keyed by filePath */
export interface FileSetting {
  filePath: string
  fontSize?: number
  showSource?: boolean
  showOutline?: boolean
  [extra: string]: any
}

/** Per-file or per-tab scroll position */
export interface ScrollPosition {
  id: string
  position: number
}

/** Per-file outline fold states */
export interface OutlineFold {
  filePath: string
  folds: Record<string, boolean>
}

/** Per-file code block fold states */
export interface CodeFold {
  filePath: string
  folds: Record<string, boolean>
}

/** Per-file task list checkbox states */
export interface TaskCheck {
  filePath: string
  checks: Record<string, boolean>
}

/** Per-file bookmarks */
export interface BookmarkEntry {
  filePath: string
  bookmarks: any[]
}

/** Reading statistics data */
export interface ReadingStat {
  id: string
  data: any
}

/** Session data: tabs array, activeTabId, etc. */
export interface SessionData {
  key: string
  value: any
}

/** Folder bookmark list */
export interface FolderBookmark {
  id: string
  data: any[]
}

/** Search queries history */
export interface SearchHistoryEntry {
  id: string
  queries: string[]
}

class AppDatabase extends Dexie {
  app_settings!: Table<AppSetting, string>
  file_settings!: Table<FileSetting, string>
  scroll_positions!: Table<ScrollPosition, string>
  outline_folds!: Table<OutlineFold, string>
  code_folds!: Table<CodeFold, string>
  task_checks!: Table<TaskCheck, string>
  bookmarks!: Table<BookmarkEntry, string>
  reading_stats!: Table<ReadingStat, string>
  session!: Table<SessionData, string>
  folder_bookmarks!: Table<FolderBookmark, string>
  search_history!: Table<SearchHistoryEntry, string>

  constructor() {
    super('AIMarkdownReaderDB')
    this.version(1).stores({
      app_settings: 'key',
      file_settings: 'filePath',
      scroll_positions: 'id',
      outline_folds: 'filePath',
      code_folds: 'filePath',
      task_checks: 'filePath',
      bookmarks: 'filePath',
      reading_stats: 'id',
      session: 'key',
      folder_bookmarks: 'id',
      search_history: 'id',
    })
  }
}

export const db = new AppDatabase()
