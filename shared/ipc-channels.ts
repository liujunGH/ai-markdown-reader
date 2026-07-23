/**
 * IPC 契约单一真相源 (Single Source of Truth)
 *
 * 本文件被主进程 (CommonJS) 与渲染进程 (ESNext) 同时引用。
 * 约束：只能包含纯类型与字符串常量，禁止导入 'electron' / 'path' 等 Node 模块。
 *
 * 新增 / 修改 IPC 时，此处是唯一改动点，两侧自动对齐。
 */

/* ============================================================
 * 共享数据类型（主进程与渲染进程共用）
 * ============================================================ */

export interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  isFullScreen?: boolean
}

export interface FolderFile {
  name: string
  filePath: string
  size?: number
  lastModified?: number
  isDirectory?: boolean
}

export interface MarkdownScanOptions {
  maxFileSizeBytes?: number
  skipDirectoryNames?: string[]
}

export type MarkdownScanSkipReason = 'ignored-directory' | 'large-file' | 'read-error'

export interface MarkdownScanSkippedItem {
  path: string
  name: string
  reason: MarkdownScanSkipReason
  detail?: string
  size?: number
  maxSize?: number
}

export interface FileInfo {
  name: string
  size: number
  lastModified: number
  created: number
}

export interface FileDialogFilter {
  name: string
  extensions: string[]
}

/* ============================================================
 * Invoke channel 名（主进程 ipcMain.handle / 渲染进程 ipcRenderer.invoke）
 * ============================================================ */

/**
 * 每个 invoke channel 的元数据：
 * - dedup:    渲染端相同参数并发请求是否去重（复用同一 Promise）
 * - timeout:  渲染端超时（ms）。未标注走 DEFAULT_TIMEOUT
 *
 * 这些标记必须与 preload.ts 的 createIPCCall 选项逐一对齐。
 */
export const INVOKE_CHANNELS = {
  // 文件对话框类（5min 超时）
  OPEN_FILE_DIALOG: 'open-file-dialog',
  OPEN_FOLDER_DIALOG: 'open-folder-dialog',
  OPEN_TEXT_FILE: 'open-text-file',
  SAVE_TEXT_FILE: 'save-text-file',
  EXPORT_HTML_TO_PDF: 'export-html-to-pdf',
  SCAN_MARKDOWN_FILES: 'scan-markdown-files',

  // 文件读写类
  READ_FOLDER: 'read-folder',
  READ_FILE: 'read-file',
  WRITE_FILE: 'write-file',
  UPDATE_MARKDOWN_FILE: 'update-markdown-file',
  DOWNLOAD_REMOTE_IMAGE: 'download-remote-image',
  READ_IMAGE_AS_DATA_URL: 'read-image-as-data-url',
  GET_FILE_INFO: 'get-file-info',
  SHOW_IN_FOLDER: 'show-in-folder',

  // 文件监听
  WATCH_FILE: 'watch-file',
  UNWATCH_FILE: 'unwatch-file',

  // 最近文件 / 配置存储
  GET_RECENT_FILES: 'get-recent-files',
  ADD_RECENT_FILE: 'add-recent-file',
  REMOVE_RECENT_FILE: 'remove-recent-file',
  CLEAR_RECENT_FILES: 'clear-recent-files',
  GET_LAST_FOLDER: 'get-last-folder',
  SET_LAST_FOLDER: 'set-last-folder',
  GET_MAX_RECENT_FILES: 'get-max-recent-files',
  SET_MAX_RECENT_FILES: 'set-max-recent-files',

  // 窗口 / 进度 / 标题
  SET_PROGRESS_BAR: 'set-progress-bar',
  CLEAR_PROGRESS_BAR: 'clear-progress-bar',
  SET_TITLE: 'set-title',
  GET_WINDOW_ID: 'get-window-id',
  FOCUS_WINDOW: 'focus-window',
  GET_WINDOW_STATES: 'get-window-states',
  REGISTER_WINDOW_FILES: 'register-window-files',
} as const

export type InvokeChannel = (typeof INVOKE_CHANNELS)[keyof typeof INVOKE_CHANNELS]

/* ============================================================
 * 渲染端超时 / 去重配置（必须与 preload createIPCCall 选项对齐）
 * ============================================================ */

export const IPC_DEFAULT_TIMEOUT = 10_000
export const IPC_DIALOG_TIMEOUT = 5 * 60 * 1000
export const IPC_SCAN_TIMEOUT = 5 * 60 * 1000

/** 需要 dedup 的 channel（同参数并发复用 Promise） */
export const DEDUP_CHANNELS: ReadonlySet<string> = new Set([
  INVOKE_CHANNELS.OPEN_FILE_DIALOG,
  INVOKE_CHANNELS.OPEN_FOLDER_DIALOG,
  INVOKE_CHANNELS.READ_IMAGE_AS_DATA_URL,
  INVOKE_CHANNELS.GET_RECENT_FILES,
  INVOKE_CHANNELS.GET_LAST_FOLDER,
  INVOKE_CHANNELS.GET_MAX_RECENT_FILES,
])

/** channel → 渲染端超时（未列出者走 IPC_DEFAULT_TIMEOUT） */
export const CHANNEL_TIMEOUTS: Readonly<Record<string, number>> = {
  [INVOKE_CHANNELS.OPEN_FILE_DIALOG]: IPC_DIALOG_TIMEOUT,
  [INVOKE_CHANNELS.OPEN_FOLDER_DIALOG]: IPC_DIALOG_TIMEOUT,
  [INVOKE_CHANNELS.OPEN_TEXT_FILE]: IPC_DIALOG_TIMEOUT,
  [INVOKE_CHANNELS.SAVE_TEXT_FILE]: IPC_DIALOG_TIMEOUT,
  [INVOKE_CHANNELS.EXPORT_HTML_TO_PDF]: IPC_DIALOG_TIMEOUT,
  [INVOKE_CHANNELS.SCAN_MARKDOWN_FILES]: IPC_SCAN_TIMEOUT,
}

/* ============================================================
 * 事件 channel（主进程 webContents.send → 渲染进程 ipcRenderer.on）
 * ============================================================ */

export const EVENT_CHANNELS = {
  OPEN_FILE: 'open-file',
  OPEN_FOLDER: 'open-folder',
  FILE_CHANGED: 'file-changed',
  SYSTEM_THEME_CHANGED: 'system-theme-changed',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_PROGRESS: 'update-progress',
  UPDATE_DOWNLOADED: 'update-downloaded',
  UPDATE_ERROR: 'update-error',
} as const

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS]

/* ============================================================
 * 事件 payload 类型
 * ============================================================ */

export interface UpdateProgressPayload {
  percent: number
  transferred: number
  total: number
}

export interface UpdateVersionPayload {
  version: string
}

export interface UpdateErrorPayload {
  error: string
}

export type SystemTheme = 'light' | 'dark'

/* ============================================================
 * ★新增：DB IPC（主进程 SQLite 查询通道）
 *
 * 渲染进程不直接持有数据库连接（sandbox 无法使用原生模块），
 * 通过这两个 channel 让主进程代为执行 SQL。
 * - db:query  只读查询，返回行数组
 * - db:exec   写入/结构变更，返回 { changes, lastInsertRowid }
 * ============================================================ */

export const DB_CHANNELS = {
  DB_QUERY: 'db:query',
  DB_EXEC: 'db:exec',
} as const

export type DbChannel = (typeof DB_CHANNELS)[keyof typeof DB_CHANNELS]

export interface DbQueryRequest {
  /** SQL 语句，使用 ? 或 @name 占位符 */
  sql: string
  /** 与占位符对应的参数 */
  params?: unknown[]
}

export interface DbQueryResult<T = Record<string, unknown>> {
  success: boolean
  rows?: T[]
  error?: string
}

export interface DbExecResult {
  success: boolean
  changes?: number
  lastInsertRowid?: number | bigint
  error?: string
}
