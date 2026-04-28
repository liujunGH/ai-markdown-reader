import { create } from 'zustand'

interface FileState {
  currentFolderPath: string | null
  currentFolderName: string
  currentFilePath: string
  currentFolderHandle: FileSystemDirectoryHandle | null
  fileInfo: { name: string; size: number; lastModified: number } | null
}

interface FileActions {
  setFolder: (path: string | null, name: string) => void
  setCurrentFilePath: (path: string) => void
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void
  setFileInfo: (info: { name: string; size: number; lastModified: number } | null) => void
  clearFolder: () => void
}

export type FileStore = FileState & FileActions

export const useFileStore = create<FileStore>((set) => ({
  currentFolderPath: null,
  currentFolderName: '',
  currentFilePath: '',
  currentFolderHandle: null,
  fileInfo: null,

  setFolder: (path, name) => set({ currentFolderPath: path, currentFolderName: name }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
  setFolderHandle: (handle) => set({ currentFolderHandle: handle }),
  setFileInfo: (info) => set({ fileInfo: info }),
  clearFolder: () => set({ currentFolderPath: null, currentFolderName: '', currentFilePath: '', currentFolderHandle: null }),
}))
