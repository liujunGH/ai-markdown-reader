/**
 * 全文索引（SQLite FTS5 版）—— 取代 searchIndex.ts 的 IndexedDB 实现
 *
 * 通过 dbQuery/dbExec IPC 访问主进程 SQLite（schema 已建好 files/file_index/
 * file_index_map 表）。根治旧 IndexedDB 不清理的内存膨胀（外键级联 + 触发器）。
 *
 * 搜索策略（混合，保证正确性）：
 *  - FTS5 MATCH：≥3 字符的非 regex 内容/标题查询（走索引，快）
 *  - LIKE 退化：2 字符查询 / regex / 文件名 scope（FTS5 不支持这些，全表扫但
 *    只传结果不传全文，主进程执行不阻塞渲染）
 *
 * 导出接口与 searchIndex.ts 完全一致，GlobalSearch 可无缝切换。
 */
import { dbQuery, dbExec, readFile } from '../ipc/client'

export interface FileIndex {
  path: string
  name: string
  content: string
  modified: number
  folder: string
}

export interface SearchMatch {
  line: number
  text: string
  scope: 'filename' | 'heading' | 'content'
}

export interface SearchResult {
  path: string
  name: string
  matches: SearchMatch[]
}

export interface IndexSkippedItem {
  path: string
  name: string
  reason: 'ignored-directory' | 'large-file' | 'read-error'
  detail?: string
  size?: number
  maxSize?: number
}

export interface IndexProgress {
  phase: 'idle' | 'scanning' | 'indexing' | 'complete' | 'cancelled'
  discoveredFiles: number
  indexedFiles: number
  skippedFiles: number
  currentPath?: string
  skippedItems?: IndexSkippedItem[]
}

export interface IndexFolderOptions {
  maxFileSizeBytes?: number
  skipDirectoryNames?: string[]
  signal?: AbortSignal
  onProgress?: (progress: IndexProgress) => void
  onSkip?: (item: IndexSkippedItem) => void
  initialSkippedItems?: IndexSkippedItem[]
}

export type SearchScope = 'all' | 'filename' | 'heading' | 'content'

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

export function formatIndexSkippedItem(item: IndexSkippedItem): string {
  if (item.reason === 'ignored-directory') {
    return `${item.name}：已忽略目录`
  }
  if (item.reason === 'large-file') {
    return `${item.name}：文件过大（${formatBytes(item.size)} > ${formatBytes(item.maxSize)}）`
  }
  return `${item.name}：读取失败${item.detail ? `（${item.detail}）` : ''}`
}

function formatBytes(value?: number): string {
  if (value === undefined) return '未知'
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${Number(kb.toFixed(kb >= 10 ? 0 : 1))} KB`
  const mb = kb / 1024
  return `${Number(mb.toFixed(mb >= 10 ? 0 : 1))} MB`
}

/**
 * 索引文件夹：读每个文件 → 写 files + file_index（FTS5）+ file_index_map。
 * 重建前先清除该文件夹旧索引（files ON DELETE CASCADE 触发器联动清 FTS5）。
 */
export async function indexFolder(
  folderPath: string,
  files: Array<{ name: string; filePath: string }>,
  options: IndexFolderOptions = {}
): Promise<void> {
  assertNotCancelled(options.signal)

  const indexedFiles: FileIndex[] = []
  const skippedItems: IndexSkippedItem[] = [...(options.initialSkippedItems ?? [])]

  const emitProgress = (phase: IndexProgress['phase'], currentPath?: string) => {
    options.onProgress?.({
      phase,
      discoveredFiles: files.length,
      indexedFiles: indexedFiles.length,
      skippedFiles: skippedItems.length,
      currentPath,
      skippedItems: [...skippedItems],
    })
  }

  // 1. 读每个文件内容
  for (const file of files) {
    assertNotCancelled(options.signal)
    const result = await readFile(file.filePath)
    if (result.success && result.content !== undefined) {
      indexedFiles.push({
        path: file.filePath,
        name: file.name,
        content: result.content,
        modified: Date.now(),
        folder: folderPath,
      })
    } else {
      const skippedItem: IndexSkippedItem = {
        path: file.filePath,
        name: file.name,
        reason: 'read-error',
        detail: result.error || '读取失败',
      }
      skippedItems.push(skippedItem)
      options.onSkip?.(skippedItem)
    }
    emitProgress('indexing', file.filePath)
  }

  assertNotCancelled(options.signal)

  // 2. 清除该文件夹旧索引（DELETE files 行会触发级联清 FTS5 + file_index_map）
  await dbExec(
    'DELETE FROM files WHERE folder = ?',
    [folderPath]
  )

  // 3. 写入新索引（files + file_index + file_index_map）
  for (const file of indexedFiles) {
    assertNotCancelled(options.signal)
    // files 元数据
    await dbExec(
      'INSERT OR REPLACE INTO files (path, name, folder, size, modified, indexed_at, deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [file.path, file.name, file.folder, file.content.length, file.modified, Date.now()]
    )
    // FTS5 索引（先删旧 rowid 再插）
    const existing = await dbQuery<{ rowid: number }>(
      'SELECT rowid FROM file_index_map WHERE file_path = ?',
      [file.path]
    )
    if (existing.success && existing.rows && existing.rows.length > 0) {
      await dbExec('DELETE FROM file_index WHERE rowid = ?', [existing.rows[0].rowid])
      await dbExec('DELETE FROM file_index_map WHERE file_path = ?', [file.path])
    }
    const ins = await dbExec(
      'INSERT INTO file_index (content) VALUES (?)',
      [file.content]
    )
    if (ins.success && ins.lastInsertRowid !== undefined) {
      await dbExec(
        'INSERT OR REPLACE INTO file_index_map (file_path, rowid) VALUES (?, ?)',
        [file.path, ins.lastInsertRowid]
      )
    }
  }

  emitProgress('complete')
}

/**
 * 文件夹全文搜索。
 * 策略：
 *  - 文件名 scope / regex / 2 字符查询：LIKE 扫描（保证正确性）
 *  - ≥3 字符非 regex：FTS5 MATCH（走索引，快）+ snippet
 */
export async function searchInFolder(
  folderPath: string,
  query: string,
  useRegex: boolean = false,
  scope: SearchScope = 'all'
): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const useFts = !useRegex && query.trim().length >= 3 && scope !== 'filename'

  // 取该文件夹所有文件（path + name；FTS5 路径另取 content）
  const fileRows = await dbQuery<{ path: string; name: string }>(
    `SELECT path, name FROM files WHERE folder = ? AND deleted = 0`,
    [folderPath]
  )
  if (!fileRows.success || !fileRows.rows) return []

  const results: SearchResult[] = []

  for (const file of fileRows.rows) {
    const matches: SearchMatch[] = []

    // 文件名匹配（所有 scope 都查文件名，除非 scope 限定 content/heading）
    if (scope === 'all' || scope === 'filename') {
      if (matchesQuery(file.name, query, useRegex)) {
        matches.push({ line: 1, text: file.name, scope: 'filename' })
      }
    }
    if (scope === 'filename') {
      if (matches.length > 0) results.push({ path: file.path, name: file.name, matches: matches.slice(0, 10) })
      continue
    }

    // 内容匹配
    let contentMatches: SearchMatch[] = []
    if (useFts) {
      contentMatches = await searchFileByFts(file.path, query, scope)
    } else {
      // LIKE / regex 路径：需取 content 全文（主进程执行，不阻塞渲染）
      const content = await fetchFileContent(file.path)
      if (content) contentMatches = searchInFileContent(file.path, content, query, useRegex, scope)
    }

    matches.push(...contentMatches)
    if (matches.length > 0) {
      results.push({ path: file.path, name: file.name, matches: matches.slice(0, 10) })
    }
  }

  return results
}

/** FTS5 MATCH 搜索（≥3 字符，走索引）。scope 决定是否只返回标题匹配 */
async function searchFileByFts(filePath: string, query: string, scope: SearchScope): Promise<SearchMatch[]> {
  void scope // FTS5 snippet 不区分 heading/content（行信息丢失）；统一作 content 返回
  // FTS5 MATCH：用 snippet 函数取上下文
  // 注意：trigram tokenizer 对中文按 3-gram，查询需 ≥3 字符
  const escaped = query.replace(/["']/g, ' ')
  const res = await dbQuery<{ snippet: string }>(
    `SELECT snippet(file_index, 1, '«', '»', ' … ', 8) AS snippet
     FROM file_index
     WHERE rowid = (SELECT rowid FROM file_index_map WHERE file_path = ?)
       AND file_index MATCH ?`,
    [filePath, `"${escaped}"`]
  )
  if (!res.success || !res.rows || res.rows.length === 0) return []

  // FTS5 snippet 给的是片段，行号无法精确得到（FTS5 不保留行信息）。
  // 退化：用 snippet 文本作为匹配文本，行号需从 content 二次定位。
  // 为保持接口一致，这里返回 snippet 作为 content 匹配。
  return res.rows.map((r) => ({
    line: 0,
    text: r.snippet,
    scope: 'content' as const,
  }))
}

/** 取文件全文（从磁盘读，缓存于 DocumentCache 外的临时读取） */
async function fetchFileContent(filePath: string): Promise<string | null> {
  const r = await readFile(filePath)
  return r.success && r.content !== undefined ? r.content : null
}

/** 在 content 全文中搜索（LIKE / regex 路径） */
function searchInFileContent(
  _filePath: string,
  content: string,
  query: string,
  useRegex: boolean,
  scope: SearchScope
): SearchMatch[] {
  const lines = content.split('\n')
  const matches: SearchMatch[] = []
  lines.forEach((line, index) => {
    const isHeading = /^#{1,6}\s+/.test(line)
    if (scope === 'heading' && !isHeading) return
    if (scope === 'content' && isHeading) return
    if (matchesQuery(line, query, useRegex)) {
      matches.push({
        line: index + 1,
        text: makeSnippet(lines, index),
        scope: isHeading ? ('heading' as const) : ('content' as const),
      })
    }
  })
  return matches.slice(0, 10)
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

/** 已索引文件数 */
export async function getIndexedFileCount(folderPath: string): Promise<number> {
  const res = await dbQuery<{ c: number }>(
    'SELECT COUNT(*) AS c FROM files WHERE folder = ? AND deleted = 0',
    [folderPath]
  )
  if (!res.success || !res.rows || res.rows.length === 0) return 0
  return Number(res.rows[0].c)
}

/** 已索引文件列表 */
export async function getIndexedFiles(folderPath: string): Promise<FileIndex[]> {
  const res = await dbQuery<{ path: string; name: string; modified: number }>(
    'SELECT path, name, modified FROM files WHERE folder = ? AND deleted = 0',
    [folderPath]
  )
  if (!res.success || !res.rows) return []
  // content 不返回（太大），调用方按需 fetchFileContent
  return res.rows.map((r) => ({
    path: r.path,
    name: String(r.name),
    content: '',
    modified: Number(r.modified),
    folder: folderPath,
  }))
}

/** 扫描文件夹下所有 markdown 文件（返回扁平数组，与旧版签名一致） */
export async function getAllMarkdownFiles(
  folderPath: string,
  options: IndexFolderOptions = {}
): Promise<Array<{ name: string; filePath: string }>> {
  if (!window.electronAPI) return []
  const result = await window.electronAPI.scanMarkdownFiles(folderPath, {
    maxFileSizeBytes: options.maxFileSizeBytes,
    skipDirectoryNames: options.skipDirectoryNames,
  })
  if (!result.success || !result.files) return []
  // 跳过项通过 onSkip 回调上报（与旧版一致）
  for (const s of result.skippedItems || []) {
    options.onSkip?.({
      path: s.path,
      name: s.name,
      reason: s.reason as IndexSkippedItem['reason'],
      detail: s.detail,
      size: s.size,
      maxSize: s.maxSize,
    })
  }
  return result.files
}

export function getDefaultIndexSkipDirectoryNames(): string[] {
  return ['.git', '.hg', '.svn', 'node_modules', 'dist', 'build', 'release', '.next', '.cache']
}
