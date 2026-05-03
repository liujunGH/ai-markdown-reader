const DB_NAME = 'markdown-search-db'
const DB_VERSION = 1
const STORE_NAME = 'file-index'

export interface FileIndex {
  path: string
  name: string
  content: string
  modified: number
  folder: string
}

export type SearchScope = 'all' | 'filename' | 'heading' | 'content'

export interface SearchMatch {
  line: number
  text: string
  scope: SearchScope
}

export interface SearchResult {
  path: string
  name: string
  matches: SearchMatch[]
}

export interface IndexProgress {
  phase: 'scanning' | 'indexing' | 'complete' | 'cancelled'
  discoveredFiles: number
  indexedFiles: number
  skippedFiles: number
  currentPath?: string
}

export interface IndexFolderOptions {
  signal?: AbortSignal
  onProgress?: (progress: IndexProgress) => void
  maxFileSizeBytes?: number
  skipDirectoryNames?: string[]
}

const DEFAULT_SKIP_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'dist',
  'build',
  'release',
  '.next',
  '.cache',
])

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('索引已取消')
  }
}

function shouldSkipDirectory(name: string, skipDirectoryNames?: string[]): boolean {
  if (name.startsWith('.')) return true
  if (DEFAULT_SKIP_DIRECTORIES.has(name)) return true
  return Boolean(skipDirectoryNames?.includes(name))
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

export async function getAllMarkdownFiles(
  folderPath: string,
  options: IndexFolderOptions = {}
): Promise<Array<{ name: string; filePath: string }>> {
  if (!window.electronAPI) return []
  const files: Array<{ name: string; filePath: string }> = []
  let skippedFiles = 0

  const scan = async (currentFolderPath: string): Promise<void> => {
    assertNotCancelled(options.signal)
    const result = await window.electronAPI!.readFolder(currentFolderPath)
    if (!result.success || !result.files) return

    for (const item of result.files) {
      assertNotCancelled(options.signal)
      if (item.isDirectory) {
        if (shouldSkipDirectory(item.name, options.skipDirectoryNames)) {
          skippedFiles += 1
          options.onProgress?.({
            phase: 'scanning',
            discoveredFiles: files.length,
            indexedFiles: 0,
            skippedFiles,
            currentPath: item.filePath,
          })
          continue
        }
        await scan(item.filePath)
        continue
      }

      if (options.maxFileSizeBytes !== undefined && item.size !== undefined && item.size > options.maxFileSizeBytes) {
        skippedFiles += 1
        options.onProgress?.({
          phase: 'scanning',
          discoveredFiles: files.length,
          indexedFiles: 0,
          skippedFiles,
          currentPath: item.filePath,
        })
        continue
      }

      files.push({ name: item.name, filePath: item.filePath })
      options.onProgress?.({
        phase: 'scanning',
        discoveredFiles: files.length,
        indexedFiles: 0,
        skippedFiles,
        currentPath: item.filePath,
      })
    }
  }

  await scan(folderPath)
  return files
}

export async function indexFolder(
  folderPath: string,
  files: Array<{ name: string; filePath: string }>,
  options: IndexFolderOptions = {}
): Promise<void> {
  if (!window.electronAPI) return

  assertNotCancelled(options.signal)

  const indexedFiles: FileIndex[] = []
  for (const file of files) {
    assertNotCancelled(options.signal)
    const result = await window.electronAPI.readFile(file.filePath)
    if (result.success && result.content !== undefined) {
      indexedFiles.push({
        path: file.filePath,
        name: file.name,
        content: result.content,
        modified: Date.now(),
        folder: folderPath,
      })
    }
    options.onProgress?.({
      phase: 'indexing',
      discoveredFiles: files.length,
      indexedFiles: indexedFiles.length,
      skippedFiles: files.length - indexedFiles.length,
      currentPath: file.filePath,
    })
    assertNotCancelled(options.signal)
  }

  assertNotCancelled(options.signal)
  await clearFolderIndex(folderPath)

  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  for (const file of indexedFiles) {
    store.put(file)
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close()
      options.onProgress?.({
        phase: 'complete',
        discoveredFiles: files.length,
        indexedFiles: indexedFiles.length,
        skippedFiles: files.length - indexedFiles.length,
      })
      resolve()
    }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

async function clearFolderIndex(folderPath: string): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('folder')
  const request = index.openCursor(IDBKeyRange.only(folderPath))

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      }
    }
    request.onerror = () => { db.close(); reject(request.error) }
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

export async function searchInFolder(
  folderPath: string,
  query: string,
  useRegex: boolean = false,
  scope: SearchScope = 'all'
): Promise<SearchResult[]> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('folder')

  const results: SearchResult[] = []

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(folderPath))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const file: FileIndex = cursor.value
        const fileMatches = searchInFile(file, query, useRegex, scope)
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

function matchesQuery(text: string, query: string, useRegex: boolean): boolean {
  if (useRegex) {
    try {
      return new RegExp(query, 'i').test(text)
    } catch {
      return false
    }
  }
  return text.toLowerCase().includes(query.toLowerCase())
}

function makeSnippet(lines: string[], index: number): string {
  const previous = lines[index - 1]?.trim()
  const current = lines[index]?.trim() || ''
  const next = lines[index + 1]?.trim()
  return [previous, current, next].filter(Boolean).join('  /  ')
}

function searchInFile(file: FileIndex, query: string, useRegex: boolean, scope: SearchScope): SearchMatch[] {
  const lines = file.content.split('\n')
  const matches: SearchMatch[] = []

  if ((scope === 'all' || scope === 'filename') && matchesQuery(file.name, query, useRegex)) {
    matches.push({ line: 1, text: file.name, scope: 'filename' })
  }

  if (scope === 'filename') return matches.slice(0, 10)

  lines.forEach((line, index) => {
    const isHeading = /^#{1,6}\s+/.test(line)
    if (scope === 'heading' && !isHeading) return
    if (scope === 'content' && isHeading) return
    if (matchesQuery(line, query, useRegex)) {
      matches.push({
        line: index + 1,
        text: makeSnippet(lines, index),
        scope: isHeading ? 'heading' : 'content',
      })
    }
  })

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

export async function getIndexedFiles(folderPath: string): Promise<FileIndex[]> {
  const db = await openDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('folder')
  const files: FileIndex[] = []

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(folderPath))
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        files.push(cursor.value)
        cursor.continue()
      } else {
        db.close()
        resolve(files)
      }
    }
    request.onerror = () => reject(request.error)
  })
}
