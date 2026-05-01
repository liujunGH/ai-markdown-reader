import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

const mockedAppPaths = vi.hoisted(() => ({
  paths: {
    home: '/home/testuser',
    userData: '/home/testuser/Library/Application Support',
    temp: '/tmp',
    desktop: '/home/testuser/Desktop',
    documents: '/home/testuser/Documents',
    downloads: '/home/testuser/Downloads',
  } as Record<string, string>,
}))

// Mock electron app before importing ipcGuard
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      return mockedAppPaths.paths[name] || mockedAppPaths.paths.temp
    },
  },
}))

import { validateFilePath, createRateLimiter } from '../lib/ipcGuard'

describe('validateFilePath', () => {
  let testRoot: string
  let outsideRoot: string
  let homeDir: string
  let userDataDir: string
  let tempDir: string
  let desktopDir: string
  let documentsDir: string
  let downloadsDir: string

  beforeAll(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ipc-guard-safe-'))
    outsideRoot = fs.mkdtempSync(path.join(process.cwd(), '.ipc-guard-outside-'))
    homeDir = path.join(testRoot, 'home')
    userDataDir = path.join(homeDir, 'Library', 'Application Support')
    tempDir = path.join(testRoot, 'tmp')
    desktopDir = path.join(homeDir, 'Desktop')
    documentsDir = path.join(homeDir, 'Documents')
    downloadsDir = path.join(homeDir, 'Downloads')

    for (const dir of [homeDir, userDataDir, tempDir, desktopDir, documentsDir, downloadsDir]) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(path.join(homeDir, 'doc.md'), '# Home')
    fs.writeFileSync(path.join(desktopDir, 'notes.md'), '# Desktop')
    fs.mkdirSync(path.join(homeDir, 'notes'), { recursive: true })
    fs.writeFileSync(path.join(homeDir, 'notes', 'doc.md'), '# Nested')
    fs.writeFileSync(path.join(documentsDir, 'readme.md'), '# Documents')
    fs.writeFileSync(path.join(downloadsDir, 'report.md'), '# Downloads')
    fs.writeFileSync(path.join(outsideRoot, 'secret.md'), '# Secret')

    fs.symlinkSync(path.join(outsideRoot, 'secret.md'), path.join(homeDir, 'escape.md'))
    fs.symlinkSync(outsideRoot, path.join(homeDir, 'escape-dir'))
    fs.symlinkSync(path.join(documentsDir, 'readme.md'), path.join(homeDir, 'safe-link.md'))

    mockedAppPaths.paths.home = homeDir
    mockedAppPaths.paths.userData = userDataDir
    mockedAppPaths.paths.temp = tempDir
    mockedAppPaths.paths.desktop = desktopDir
    mockedAppPaths.paths.documents = documentsDir
    mockedAppPaths.paths.downloads = downloadsDir
  })

  afterAll(() => {
    fs.rmSync(testRoot, { recursive: true, force: true })
    fs.rmSync(outsideRoot, { recursive: true, force: true })
  })

  it('rejects parent traversal outside safe roots', () => {
    expect(validateFilePath('/etc/passwd/../../../secret')).toBe(false)
    expect(validateFilePath(path.join(homeDir, '..', 'secret'))).toBe(false)
  })

  it('allows parent segments when the resolved real path stays inside safe roots', () => {
    expect(validateFilePath(path.join(homeDir, 'notes', '..', 'doc.md'))).toBe(true)
  })

  it('rejects paths with null bytes', () => {
    expect(validateFilePath(`${path.join(homeDir, 'doc.md')}\0.exe`)).toBe(false)
  })

  it('rejects relative paths', () => {
    expect(validateFilePath('relative/path.md')).toBe(false)
  })

  it('allows paths within home directory', () => {
    expect(validateFilePath(path.join(homeDir, 'doc.md'))).toBe(true)
    expect(validateFilePath(path.join(desktopDir, 'notes.md'))).toBe(true)
  })

  it('allows safe roots themselves and their child paths', () => {
    fs.writeFileSync(path.join(tempDir, 'doc.md'), '# Temp')

    expect(validateFilePath(homeDir)).toBe(true)
    expect(validateFilePath(path.join(homeDir, 'notes', 'doc.md'))).toBe(true)
    expect(validateFilePath(tempDir)).toBe(true)
    expect(validateFilePath(path.join(tempDir, 'doc.md'))).toBe(true)
  })

  it('allows paths within documents/downloads', () => {
    expect(validateFilePath(path.join(documentsDir, 'readme.md'))).toBe(true)
    expect(validateFilePath(path.join(downloadsDir, 'report.md'))).toBe(true)
  })

  it('rejects paths that only share a safe root prefix', () => {
    const homeSibling = `${homeDir}2`
    const tempSibling = `${tempDir}file`
    fs.mkdirSync(homeSibling, { recursive: true })
    fs.mkdirSync(tempSibling, { recursive: true })
    fs.writeFileSync(path.join(homeSibling, 'doc.md'), '# Sibling')
    fs.writeFileSync(path.join(tempSibling, 'doc.md'), '# Sibling')

    expect(validateFilePath(path.join(homeSibling, 'doc.md'))).toBe(false)
    expect(validateFilePath(path.join(tempSibling, 'doc.md'))).toBe(false)
  })

  it('rejects paths outside safe roots', () => {
    expect(validateFilePath('/etc/passwd')).toBe(false)
    expect(validateFilePath('/root/.bashrc')).toBe(false)
    expect(validateFilePath('/usr/bin/ls')).toBe(false)
  })

  it('rejects existing symlinks that resolve outside safe roots', () => {
    expect(validateFilePath(path.join(homeDir, 'escape.md'))).toBe(false)
  })

  it('rejects new export paths whose existing parent symlink resolves outside safe roots', () => {
    expect(validateFilePath(path.join(homeDir, 'escape-dir', 'export.md'))).toBe(false)
  })

  it('allows symlinks that resolve within safe roots', () => {
    expect(validateFilePath(path.join(homeDir, 'safe-link.md'))).toBe(true)
  })

  it('allows new export paths when their real parent directory is safe', () => {
    const exportDir = path.join(homeDir, 'exports')
    fs.mkdirSync(exportDir, { recursive: true })

    expect(validateFilePath(path.join(exportDir, 'new-export.md'))).toBe(true)
  })

  it('rejects new export paths when the parent directory does not exist', () => {
    expect(validateFilePath(path.join(homeDir, 'missing-parent', 'new-export.md'))).toBe(false)
  })

  it('rejects empty or non-string paths', () => {
    expect(validateFilePath('')).toBe(false)
    expect(validateFilePath(null as any)).toBe(false)
    expect(validateFilePath(undefined as any)).toBe(false)
  })
})

describe('createRateLimiter', () => {
  it('allows calls within limit', () => {
    const limiter = createRateLimiter(3, 1000)
    expect(limiter()).toBe(true)
    expect(limiter()).toBe(true)
    expect(limiter()).toBe(true)
  })

  it('blocks calls exceeding limit', () => {
    const limiter = createRateLimiter(2, 1000)
    limiter()
    limiter()
    expect(limiter()).toBe(false)
  })

  it('resets after window expires', () => {
    const limiter = createRateLimiter(1, 50)
    limiter()
    expect(limiter()).toBe(false)
    // Wait for window to expire
    return new Promise(resolve => {
      setTimeout(() => {
        expect(limiter()).toBe(true)
        resolve(undefined)
      }, 60)
    })
  })
})
