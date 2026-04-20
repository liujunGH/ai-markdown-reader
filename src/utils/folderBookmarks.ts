import { getStorageItem, setStorageItem } from './storage'

const FOLDER_BOOKMARKS_KEY = 'folder-bookmarks'

export interface FolderBookmark {
  name: string
  handle: FileSystemDirectoryHandle
  addedAt: number
}

export function getFolderBookmarks(): FolderBookmark[] {
  try {
    const data = getStorageItem(FOLDER_BOOKMARKS_KEY)
    if (!data) return []
    const bookmarks = JSON.parse(data)
    return bookmarks.map((b: FolderBookmark) => ({
      ...b,
      handle: undefined
    }))
  } catch {
    return []
  }
}

export async function addFolderBookmark(name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const bookmarks = getFolderBookmarks()
  const existing = bookmarks.findIndex(b => b.name === name)
  if (existing !== -1) {
    bookmarks.splice(existing, 1)
  }
  bookmarks.unshift({
    name,
    handle,
    addedAt: Date.now()
  })
  if (bookmarks.length > 10) {
    bookmarks.pop()
  }
  const serializable = bookmarks.map(b => ({
    name: b.name,
    addedAt: b.addedAt
  }))
  setStorageItem(FOLDER_BOOKMARKS_KEY, JSON.stringify(serializable))
}

export async function removeFolderBookmark(name: string): Promise<void> {
  const bookmarks = getFolderBookmarks()
  const filtered = bookmarks.filter(b => b.name !== name)
  setStorageItem(FOLDER_BOOKMARKS_KEY, JSON.stringify(filtered))
}

export async function getFilesInFolder(handle: FileSystemDirectoryHandle): Promise<{ name: string; file: File }[]> {
  const files: { name: string; file: File }[] = []
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
      const file = await entry.getFile()
      files.push({ name: entry.name, file })
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}
