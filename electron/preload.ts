import { contextBridge, ipcRenderer } from 'electron'

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  readFolder: (folderPath: string) => ipcRenderer.invoke('read-folder', folderPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),
  onOpenFile: (callback: (filePath: string) => void) => {
    ipcRenderer.removeAllListeners('open-file')
    ipcRenderer.on('open-file', (_event, filePath) => callback(filePath))
  },
  onFileChanged: (callback: (filePath: string) => void) => {
    ipcRenderer.removeAllListeners('file-changed')
    ipcRenderer.on('file-changed', (_event, filePath) => callback(filePath))
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
  setMaxRecentFiles: (max: number) => ipcRenderer.invoke('set-max-recent-files', max)
})
