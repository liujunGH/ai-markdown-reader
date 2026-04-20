import { contextBridge, ipcRenderer } from 'electron'
import path from 'path'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

const openFileCallbacks = new Set<(filePath: string) => void>()
const fileChangedCallbacks = new Set<(filePath: string) => void>()
const systemThemeCallbacks = new Set<(theme: 'light' | 'dark') => void>()

ipcRenderer.on('open-file', (_event, filePath: string) => {
  openFileCallbacks.forEach(cb => cb(filePath))
})

ipcRenderer.on('file-changed', (_event, filePath: string) => {
  fileChangedCallbacks.forEach(cb => cb(filePath))
})

ipcRenderer.on('system-theme-changed', (_event, theme: 'light' | 'dark') => {
  systemThemeCallbacks.forEach(cb => cb(theme))
})

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  readFolder: (folderPath: string) => ipcRenderer.invoke('read-folder', folderPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),
  onOpenFile: (callback: (filePath: string) => void) => {
    openFileCallbacks.add(callback)
  },
  offOpenFile: (callback: (filePath: string) => void) => {
    openFileCallbacks.delete(callback)
  },
  onFileChanged: (callback: (filePath: string) => void) => {
    fileChangedCallbacks.add(callback)
  },
  offFileChanged: (callback: (filePath: string) => void) => {
    fileChangedCallbacks.delete(callback)
  },
  watchFile: (filePath: string) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath: string) => ipcRenderer.invoke('unwatch-file', filePath),
  getRecentFiles: (): Promise<RecentFile[]> => ipcRenderer.invoke('get-recent-files'),
  addRecentFile: (file: { name: string; filePath: string }) => ipcRenderer.invoke('add-recent-file', file),
  removeRecentFile: (filePath: string) => ipcRenderer.invoke('remove-recent-file', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
  getLastFolder: (): Promise<string | null> => ipcRenderer.invoke('get-last-folder'),
  setLastFolder: (folderPath: string) => ipcRenderer.invoke('set-last-folder', folderPath),
  getMaxRecentFiles: (): Promise<number> => ipcRenderer.invoke('get-max-recent-files'),
  setMaxRecentFiles: (max: number) => ipcRenderer.invoke('set-max-recent-files', max),
  pathBasename: (filePath: string) => path.basename(filePath),
  pathDirname: (filePath: string) => path.dirname(filePath),
  pathJoin: (...paths: string[]) => path.join(...paths),
  setProgressBar: (progress: number) => ipcRenderer.invoke('set-progress-bar', progress),
  clearProgressBar: () => ipcRenderer.invoke('clear-progress-bar'),
  setTitle: (title: string) => ipcRenderer.invoke('set-title', title),
  onSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    systemThemeCallbacks.add(callback)
  },
  offSystemThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    systemThemeCallbacks.delete(callback)
  },
  // Multi-window APIs
  getWindowId: () => ipcRenderer.invoke('get-window-id'),
  focusWindow: (id: number) => ipcRenderer.invoke('focus-window', id),
  getWindowStates: () => ipcRenderer.invoke('get-window-states'),
  registerWindowFiles: (filePaths: string[]) => ipcRenderer.invoke('register-window-files', filePaths)
})
