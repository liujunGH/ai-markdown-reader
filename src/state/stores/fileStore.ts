/**
 * 文件/文件夹状态 store（v2）
 *
 * 去掉浏览器模式的 currentFolderHandle（FileSystemDirectoryHandle）。
 * v2 只保留 Electron 环境。
 */
import { create } from 'zustand'
import { produce } from 'immer'

interface FileInfo {
  name: string
  size: number
  lastModified: number
}

interface FileState {
  currentFolderPath: string | null
  currentFolderName: string
  currentFilePath: string
  fileInfo: FileInfo | null
}

interface FileActions {
  setFolder: (path: string | null, name: string) => void
  setCurrentFilePath: (path: string) => void
  setFileInfo: (info: FileInfo | null) => void
  clearFolder: () => void
}

export type FileStore = FileState & FileActions

export const useFileStore = create<FileStore>()((set) => ({
  currentFolderPath: null,
  currentFolderName: '',
  currentFilePath: '',
  fileInfo: null,

  setFolder: (path, name) =>
    set(
      produce((state: FileState) => {
        state.currentFolderPath = path
        state.currentFolderName = name
      })
    ),

  setCurrentFilePath: (path) => set({ currentFilePath: path }),

  setFileInfo: (info) => set({ fileInfo: info }),

  clearFolder: () =>
    set(
      produce((state: FileState) => {
        state.currentFolderPath = null
        state.currentFolderName = ''
        state.currentFilePath = ''
        state.fileInfo = null
      })
    ),
}))
