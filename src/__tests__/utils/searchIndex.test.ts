import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { formatIndexSkippedItem, getAllMarkdownFiles, getDefaultIndexSkipDirectoryNames, getIndexedFiles, indexFolder, searchInFolder, type IndexSkippedItem } from '../../utils/searchIndex'

describe('searchIndex', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    })
    Object.defineProperty(window, 'IDBKeyRange', {
      configurable: true,
      value: IDBKeyRange,
    })
  })

  it('indexes files after asynchronous file reads', async () => {
    window.electronAPI = {
      readFile: vi.fn(async (filePath: string) => {
        await Promise.resolve()
        return {
          success: true,
          content: filePath.endsWith('a.md') ? '# Alpha\nSee [[Beta]].' : '# Beta\nworkspace notes',
        }
      }),
    } as unknown as Window['electronAPI']

    await indexFolder('/docs', [
      { name: 'a.md', filePath: '/docs/a.md' },
      { name: 'b.md', filePath: '/docs/b.md' },
    ])

    expect(await getIndexedFiles('/docs')).toHaveLength(2)
    expect(await searchInFolder('/docs', 'workspace')).toEqual([
      expect.objectContaining({ path: '/docs/b.md' }),
    ])
  })

  it('scans markdown files with progress and skips noisy directories', async () => {
    window.electronAPI = {
      readFolder: vi.fn(async (folderPath: string) => {
        const folders: Record<string, Array<{ name: string; filePath: string; isDirectory?: boolean; size?: number }>> = {
          '/docs': [
            { name: 'README.md', filePath: '/docs/README.md', isDirectory: false, size: 12 },
            { name: 'notes', filePath: '/docs/notes', isDirectory: true },
            { name: 'node_modules', filePath: '/docs/node_modules', isDirectory: true },
            { name: '.git', filePath: '/docs/.git', isDirectory: true },
            { name: '.drafts', filePath: '/docs/.drafts', isDirectory: true },
          ],
          '/docs/notes': [
            { name: 'A.md', filePath: '/docs/notes/A.md', isDirectory: false, size: 12 },
            { name: 'large.md', filePath: '/docs/notes/large.md', isDirectory: false, size: 200 },
          ],
        }
        return { success: true, files: folders[folderPath] || [] }
      }),
    } as unknown as Window['electronAPI']
    const progress: string[] = []

    const files = await getAllMarkdownFiles('/docs', {
      maxFileSizeBytes: 100,
      onProgress: item => progress.push(`${item.phase}:${item.currentPath}:${item.discoveredFiles}:${item.skippedFiles}`),
    })

    expect(files.map(file => file.filePath)).toEqual(['/docs/README.md', '/docs/notes/A.md'])
    const api = window.electronAPI!
    expect(api.readFolder).not.toHaveBeenCalledWith('/docs/node_modules')
    expect(api.readFolder).not.toHaveBeenCalledWith('/docs/.git')
    expect(api.readFolder).not.toHaveBeenCalledWith('/docs/.drafts')
    expect(progress).toEqual(expect.arrayContaining([
      'scanning:/docs/README.md:1:0',
      'scanning:/docs/notes/large.md:2:1',
      'scanning:/docs/node_modules:2:2',
      'scanning:/docs/.drafts:2:4',
    ]))
  })

  it('reports structured skip reasons while scanning', async () => {
    window.electronAPI = {
      readFolder: vi.fn(async () => ({
        success: true,
        files: [
          { name: 'README.md', filePath: '/docs/README.md', isDirectory: false, size: 12 },
          { name: 'node_modules', filePath: '/docs/node_modules', isDirectory: true },
          { name: 'large.md', filePath: '/docs/large.md', isDirectory: false, size: 200 },
        ],
      })),
    } as unknown as Window['electronAPI']
    const skipped: IndexSkippedItem[] = []
    const progressSkipped: number[] = []

    const files = await getAllMarkdownFiles('/docs', {
      maxFileSizeBytes: 100,
      onSkip: item => skipped.push(item),
      onProgress: progress => progressSkipped.push(progress.skippedItems?.length ?? 0),
    })

    expect(files.map(file => file.filePath)).toEqual(['/docs/README.md'])
    expect(skipped).toEqual([
      expect.objectContaining({ path: '/docs/node_modules', name: 'node_modules', reason: 'ignored-directory' }),
      expect.objectContaining({ path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 200, maxSize: 100 }),
    ])
    expect(progressSkipped).toContain(2)
  })

  it('preserves scanning skips and adds read failures during indexing progress', async () => {
    window.electronAPI = {
      readFile: vi.fn(async (filePath: string) => (
        filePath.endsWith('bad.md')
          ? { success: false, error: '权限不足' }
          : { success: true, content: '# OK' }
      )),
    } as unknown as Window['electronAPI']
    const progress: Array<{ skippedFiles: number; skippedItems: IndexSkippedItem[] }> = []

    await indexFolder('/docs', [
      { name: 'ok.md', filePath: '/docs/ok.md' },
      { name: 'bad.md', filePath: '/docs/bad.md' },
    ], {
      initialSkippedItems: [
        { path: '/docs/node_modules', name: 'node_modules', reason: 'ignored-directory' },
      ],
      onProgress: item => progress.push({ skippedFiles: item.skippedFiles, skippedItems: item.skippedItems ?? [] }),
    })

    expect(await getIndexedFiles('/docs')).toEqual([
      expect.objectContaining({ path: '/docs/ok.md' }),
    ])
    expect(progress.at(-1)).toEqual(expect.objectContaining({
      skippedFiles: 2,
      skippedItems: expect.arrayContaining([
        expect.objectContaining({ path: '/docs/node_modules', reason: 'ignored-directory' }),
        expect.objectContaining({ path: '/docs/bad.md', reason: 'read-error', detail: '权限不足' }),
      ]),
    }))
  })

  it('formats skipped index items for user-facing progress', () => {
    expect(formatIndexSkippedItem({ path: '/docs/node_modules', name: 'node_modules', reason: 'ignored-directory' })).toBe('node_modules：已忽略目录')
    expect(formatIndexSkippedItem({ path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 200, maxSize: 100 })).toBe('large.md：文件过大（200 B > 100 B）')
    expect(formatIndexSkippedItem({ path: '/docs/bad.md', name: 'bad.md', reason: 'read-error', detail: '权限不足' })).toBe('bad.md：读取失败（权限不足）')
  })

  it('exposes the default skipped directories for diagnostics policy display', () => {
    expect(getDefaultIndexSkipDirectoryNames()).toEqual([
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
  })

  it('indexes with progress and supports cancellation', async () => {
    const controller = new AbortController()
    window.electronAPI = {
      readFile: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('b.md')) controller.abort()
        return { success: true, content: `# ${filePath}` }
      }),
    } as unknown as Window['electronAPI']
    const progress: string[] = []

    await expect(indexFolder('/docs', [
      { name: 'a.md', filePath: '/docs/a.md' },
      { name: 'b.md', filePath: '/docs/b.md' },
      { name: 'c.md', filePath: '/docs/c.md' },
    ], {
      signal: controller.signal,
      onProgress: item => progress.push(`${item.phase}:${item.indexedFiles}:${item.currentPath}`),
    })).rejects.toThrow('索引已取消')

    expect(progress).toEqual(expect.arrayContaining([
      'indexing:1:/docs/a.md',
      'indexing:2:/docs/b.md',
    ]))
    expect(window.electronAPI!.readFile).not.toHaveBeenCalledWith('/docs/c.md')
  })

  it('keeps the previous index when cancellation happens before commit', async () => {
    window.electronAPI = {
      readFile: vi.fn(async () => ({ success: true, content: '# Old' })),
    } as unknown as Window['electronAPI']
    await indexFolder('/docs', [{ name: 'old.md', filePath: '/docs/old.md' }])

    const controller = new AbortController()
    window.electronAPI = {
      readFile: vi.fn(async () => {
        controller.abort()
        return { success: true, content: '# New' }
      }),
    } as unknown as Window['electronAPI']

    await expect(indexFolder('/docs', [{ name: 'new.md', filePath: '/docs/new.md' }], {
      signal: controller.signal,
    })).rejects.toThrow('索引已取消')

    expect(await getIndexedFiles('/docs')).toEqual([
      expect.objectContaining({ path: '/docs/old.md', content: '# Old' }),
    ])
  })
})
