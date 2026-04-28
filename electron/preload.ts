import { contextBridge, ipcRenderer } from 'electron'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  isFullScreen?: boolean
}

// Simple path utilities (avoid importing 'path' which fails in sandbox preload)
function pathBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/\/$/, '')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1) || normalized
}

function pathDirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) return '.'
  const dir = normalized.slice(0, lastSlash)
  return dir || '/'
}

function pathJoin(...paths: string[]): string {
  let result = ''
  for (const p of paths) {
    if (!p) continue
    if (result) {
      result = result.replace(/\/$/, '') + '/' + p.replace(/^\//, '')
    } else {
      result = p
    }
  }
  return result.replace(/\/+/g, '/')
}

const openFileCallbacks = new Set<(filePath: string) => void>()
const openFolderCallbacks = new Set<(folderPath: string) => void>()
const fileChangedCallbacks = new Set<(filePath: string) => void>()
const systemThemeCallbacks = new Set<(theme: 'light' | 'dark') => void>()
const updateAvailableCallbacks = new Set<(info: { version: string }) => void>()
const updateProgressCallbacks = new Set<(progress: { percent: number; transferred: number; total: number }) => void>()
const updateDownloadedCallbacks = new Set<(info: { version: string }) => void>()
const updateErrorCallbacks = new Set<(info: { error: string }) => void>()

ipcRenderer.on('open-file', (_event, filePath: string) => {
  openFileCallbacks.forEach(cb => cb(filePath))
})

ipcRenderer.on('open-folder', (_event, folderPath: string) => {
  openFolderCallbacks.forEach(cb => cb(folderPath))
})

ipcRenderer.on('file-changed', (_event, filePath: string) => {
  fileChangedCallbacks.forEach(cb => cb(filePath))
})

ipcRenderer.on('system-theme-changed', (_event, theme: 'light' | 'dark') => {
  systemThemeCallbacks.forEach(cb => cb(theme))
})

ipcRenderer.on('update-available', (_event, info: { version: string }) => {
  updateAvailableCallbacks.forEach(cb => cb(info))
})

ipcRenderer.on('update-progress', (_event, progress: { percent: number; transferred: number; total: number }) => {
  updateProgressCallbacks.forEach(cb => cb(progress))
})

ipcRenderer.on('update-downloaded', (_event, info: { version: string }) => {
  updateDownloadedCallbacks.forEach(cb => cb(info))
})

ipcRenderer.on('update-error', (_event, info: { error: string }) => {
  updateErrorCallbacks.forEach(cb => cb(info))
})

const DEFAULT_RENDERER_TIMEOUT = 10000

function makeCallKey(channel: string, args: unknown[]): string {
  try {
    return `${channel}:${JSON.stringify(args)}`
  } catch {
    return `${channel}:${Date.now()}:${Math.random()}`
  }
}

function invokeWithTimeout<T>(channel: string, timeoutMs: number, ...args: unknown[]): Promise<T> {
  return Promise.race([
    ipcRenderer.invoke(channel, ...args),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Renderer IPC timeout: ${channel}`))
      }, timeoutMs)
    })
  ])
}

const pendingCalls = new Map<string, Promise<unknown>>()

function dedupedInvoke<T>(channel: string, timeoutMs: number, ...args: unknown[]): Promise<T> {
  const key = makeCallKey(channel, args)
  const existing = pendingCalls.get(key)
  if (existing) {
    return existing as Promise<T>
  }
  const promise = invokeWithTimeout<T>(channel, timeoutMs, ...args).finally(() => {
    pendingCalls.delete(key)
  })
  pendingCalls.set(key, promise)
  return promise
}

function createIPCCall<T extends (...args: any[]) => Promise<any>>(
  channel: string,
  options: { dedup?: boolean; timeout?: number } = {}
): T {
  const timeout = options.timeout ?? DEFAULT_RENDERER_TIMEOUT
  if (options.dedup) {
    return ((...args: unknown[]) => dedupedInvoke(channel, timeout, ...args)) as T
  }
  return ((...args: unknown[]) => invokeWithTimeout(channel, timeout, ...args)) as T
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: createIPCCall<() => Promise<{ filePath: string; content: string; error?: string } | null>>('open-file-dialog', { dedup: true }),
  openFolderDialog: createIPCCall<() => Promise<string | null>>('open-folder-dialog', { dedup: true }),
  readFolder: createIPCCall<(folderPath: string) => Promise<{ success: boolean; files?: { name: string; filePath: string; size?: number; lastModified?: number; isDirectory?: boolean }[]; error?: string }>>('read-folder'),
  readFile: createIPCCall<(filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>>('read-file'),
  getFileInfo: createIPCCall<(filePath: string) => Promise<{ success: boolean; info?: { name: string; size: number; lastModified: number; created: number }; error?: string }>>('get-file-info'),
  showInFolder: createIPCCall<(filePath: string) => Promise<void>>('show-in-folder'),
  onOpenFile: (callback: (filePath: string) => void) => {
    openFileCallbacks.add(callback)
  },
  offOpenFile: (callback: (filePath: string) => void) => {
    openFileCallbacks.delete(callback)
  },
  onOpenFolder: (callback: (folderPath: string) => void) => {
    openFolderCallbacks.add(callback)
  },
  offOpenFolder: (callback: (folderPath: string) => void) => {
    openFolderCallbacks.delete(callback)
  },
  onFileChanged: (callback: (filePath: string) => void) => {
    fileChangedCallbacks.add(callback)
  },
  offFileChanged: (callback: (filePath: string) => void) => {
    fileChangedCallbacks.delete(callback)
  },
  watchFile: createIPCCall<(filePath: string) => Promise<{ success: boolean; error?: string }>>('watch-file'),
  unwatchFile: createIPCCall<(filePath: string) => Promise<void>>('unwatch-file'),
  getRecentFiles: createIPCCall<() => Promise<RecentFile[]>>('get-recent-files', { dedup: true }),
  addRecentFile: createIPCCall<(file: { name: string; filePath: string }) => Promise<void>>('add-recent-file'),
  removeRecentFile: createIPCCall<(filePath: string) => Promise<void>>('remove-recent-file'),
  clearRecentFiles: createIPCCall<() => Promise<void>>('clear-recent-files'),
  getLastFolder: createIPCCall<() => Promise<string | null>>('get-last-folder', { dedup: true }),
  setLastFolder: createIPCCall<(folderPath: string) => Promise<void>>('set-last-folder'),
  getMaxRecentFiles: createIPCCall<() => Promise<number>>('get-max-recent-files', { dedup: true }),
  setMaxRecentFiles: createIPCCall<(max: number) => Promise<void>>('set-max-recent-files'),
  pathBasename,
  pathDirname,
  pathJoin,
  setProgressBar: createIPCCall<(progress: number) => Promise<void>>('set-progress-bar'),
  clearProgressBar: createIPCCall<() => Promise<void>>('clear-progress-bar'),
  setTitle: createIPCCall<(title: string) => Promise<void>>('set-title'),
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    systemThemeCallbacks.add(callback)
  },
  offSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    systemThemeCallbacks.delete(callback)
  },
  // Multi-window APIs
  getWindowId: createIPCCall<() => Promise<number>>('get-window-id'),
  focusWindow: createIPCCall<(id: number) => Promise<void>>('focus-window'),
  getWindowStates: createIPCCall<() => Promise<WindowState[]>>('get-window-states'),
  registerWindowFiles: createIPCCall<(filePaths: string[]) => Promise<void>>('register-window-files'),
  executeShellCommand: createIPCCall<(code: string, language: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }>>('execute-shell-command'),
  // Auto-updater events
  onUpdateAvailable: (callback: (info: { version: string }) => void) => {
    updateAvailableCallbacks.add(callback)
  },
  offUpdateAvailable: (callback: (info: { version: string }) => void) => {
    updateAvailableCallbacks.delete(callback)
  },
  onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    updateProgressCallbacks.add(callback)
  },
  offUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    updateProgressCallbacks.delete(callback)
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    updateDownloadedCallbacks.add(callback)
  },
  offUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    updateDownloadedCallbacks.delete(callback)
  },
  onUpdateError: (callback: (info: { error: string }) => void) => {
    updateErrorCallbacks.add(callback)
  },
  offUpdateError: (callback: (info: { error: string }) => void) => {
    updateErrorCallbacks.delete(callback)
  },
  // Diagnostics
  getDiagnosticsInfo: createIPCCall<() => Promise<{
    appVersion: string
    electronVersion: string
    chromiumVersion: string
    nodeVersion: string
    v8Version: string
    platform: string
    arch: string
    processMemory: { rss: number; heapTotal: number; heapUsed: number; external: number }
    uptime: number
    pid: number
  }>>('get-diagnostics-info', { dedup: true }),
  getRecentLogs: createIPCCall<() => Promise<string[]>>('get-recent-logs', { dedup: true }),
  clearLogs: createIPCCall<() => Promise<{ success: boolean }>>('clear-logs'),
})
