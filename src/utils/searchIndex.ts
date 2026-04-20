const DB_NAME = 'markdown-search-db'
const DB_VERSION = 1
const STORE_NAME = 'file-index'

interface FileIndex {
  path: string
  name: string
  content: string
  modified: number
  folder: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' })
        store.createIndex('folder', 'folder', { unique: false })
        store.createIndex('name', 'name', { unique: false })
      }
    }
  })
}

export async function getAllMarkdownFiles(folderPath: string): Promise<Array<{ name: string; filePath: string }>> {
  if (!window.electronAPI) return []
  const result = await window.electronAPI.readFolder(folderPath)
  if (!result.success || !result.files) return []

  const files: Array<{ name: string; filePath: string }> = []
  for (const item of result.files) {
    if (item.isDirectory) {
      const children = await getAllMarkdownFiles(item.filePath)
      files.push(...children)
    } else {
      files.push({ name: item.name, filePath: item.filePath })
    }
  }
  return files
}

export async function indexFolder(
  folderPath: string,
  files: Array<{ name: string; filePath: string }>
): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  const index = store.index('folder')
  const request = index.openCursor(IDBKeyRange.only(folderPath))

  await new Promise<void>((resolve) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      } else {
        resolve()
      }
    }
  })

  for (const file of files) {
    if (window.electronAPI) {
      const result = await window.electronAPI.readFile(file.filePath)
      if (result.success && result.content !== undefined) {
        store.put({
          path: file.filePath,
          name: file.name,
          content: result.content,
          modified: Date.now(),
          folder: folderPath
        })
      }
    }
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function searchInFolder(
  folderPath: string,
  query: string,
  useRegex: boolean = false
): Promise<Array<{ path: string; name: string; matches: Array<{ line: number; text: string }> }>> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('folder')

  const results: Array<{ path: string; name: string; matches: Array<{ line: number; text: string }> }> = []

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(folderPath))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const file: FileIndex = cursor.value
        const fileMatches = searchInContent(file.content, query, useRegex)
        if (fileMatches.length > 0) {
          results.push({
            path: file.path,
            name: file.name,
            matches: fileMatches
          })
        }
        cursor.continue()
      } else {
        db.close()
        resolve(results)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

function searchInContent(content: string, query: string, useRegex: boolean): Array<{ line: number; text: string }> {
  const lines = content.split('\n')
  const matches: Array<{ line: number; text: string }> = []

  if (useRegex) {
    try {
      const pattern = new RegExp(query, 'i')
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          matches.push({ line: index + 1, text: line.trim() })
        }
      })
    } catch {
      // Invalid regex, fall through to simple search
    }
  } else {
    const lowerQuery = query.toLowerCase()
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(lowerQuery)) {
        matches.push({ line: index + 1, text: line.trim() })
      }
    })
  }

  return matches.slice(0, 10)
}

export async function getIndexedFileCount(folderPath: string): Promise<number> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('folder')

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(folderPath))
    let count = 0
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        count++
        cursor.continue()
      } else {
        db.close()
        resolve(count)
      }
    }
    request.onerror = () => reject(request.error)
  })
}
