export interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

export interface FolderFile {
  name: string
  filePath: string
  size?: number
  lastModified?: number
  isDirectory?: boolean
}

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  isFullScreen?: boolean
}

export interface ElectronAPI {
  openFileDialog: () => Promise<{ filePath: string; content: string; error?: string } | null>
  openFolderDialog: () => Promise<string | null>
  readFolder: (folderPath: string) => Promise<{ success: boolean; files?: FolderFile[]; error?: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  getFileInfo: (filePath: string) => Promise<{
    success: boolean
    info?: {
      name: string
      size: number
      lastModified: number
      created: number
    }
    error?: string
  }>
  showInFolder: (filePath: string) => Promise<void>
  onOpenFile: (callback: (filePath: string) => void) => void
  offOpenFile: (callback: (filePath: string) => void) => void
  onOpenFolder: (callback: (folderPath: string) => void) => void
  offOpenFolder: (callback: (folderPath: string) => void) => void
  onFileChanged: (callback: (filePath: string) => void) => void
  offFileChanged: (callback: (filePath: string) => void) => void
  watchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  unwatchFile: (filePath: string) => Promise<void>
  getRecentFiles: () => Promise<RecentFile[]>
  addRecentFile: (file: { name: string; filePath: string }) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>
  clearRecentFiles: () => Promise<void>
  getLastFolder: () => Promise<string | null>
  setLastFolder: (folderPath: string) => Promise<void>
  getMaxRecentFiles: () => Promise<number>
  setMaxRecentFiles: (max: number) => Promise<void>
  pathBasename: (filePath: string) => string
  pathDirname: (filePath: string) => string
  pathJoin: (...paths: string[]) => string
  setProgressBar: (progress: number) => Promise<void>
  clearProgressBar: () => Promise<void>
  setTitle: (title: string) => Promise<void>
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => void
  offSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => void
  executeShellCommand: (code: string, language: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }>
  // Multi-window APIs
  getWindowId: () => Promise<number>
  focusWindow: (id: number) => Promise<void>
  getWindowStates: () => Promise<WindowState[]>
  registerWindowFiles: (filePaths: string[]) => Promise<void>
  // Auto-updater events
  onUpdateAvailable: (callback: (info: { version: string }) => void) => void
  offUpdateAvailable: (callback: (info: { version: string }) => void) => void
  onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => void
  offUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => void
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => void
  offUpdateDownloaded: (callback: (info: { version: string }) => void) => void
  onUpdateError: (callback: (info: { error: string }) => void) => void
  offUpdateError: (callback: (info: { error: string }) => void) => void
  // Diagnostics
  getDiagnosticsInfo: () => Promise<{
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
  }>
  getRecentLogs: () => Promise<string[]>
  clearLogs: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    electronAPI?: ElectronAPI
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle>
    getFile(): Promise<File>
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>
    queryPermission(options?: { mode?: string }): Promise<PermissionState>
    requestPermission(options?: { mode?: string }): Promise<PermissionState>
  }
}

export {}
