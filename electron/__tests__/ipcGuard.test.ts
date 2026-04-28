import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock electron app before importing ipcGuard
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      const paths: Record<string, string> = {
        home: '/home/testuser',
        userData: '/home/testuser/Library/Application Support',
        temp: '/tmp',
        desktop: '/home/testuser/Desktop',
        documents: '/home/testuser/Documents',
        downloads: '/home/testuser/Downloads',
      }
      return paths[name] || '/tmp'
    },
  },
}))

import { validateFilePath, createRateLimiter } from '../lib/ipcGuard'

describe('validateFilePath', () => {
  it('rejects paths with parent traversal', () => {
    expect(validateFilePath('/etc/passwd/../../../secret')).toBe(false)
    expect(validateFilePath('/home/testuser/../secret')).toBe(false)
  })

  it('rejects paths with null bytes', () => {
    expect(validateFilePath('/home/testuser/doc.md\0.exe')).toBe(false)
  })

  it('rejects relative paths', () => {
    expect(validateFilePath('relative/path.md')).toBe(false)
  })

  it('allows paths within home directory', () => {
    expect(validateFilePath('/home/testuser/doc.md')).toBe(true)
    expect(validateFilePath('/home/testuser/Desktop/notes.md')).toBe(true)
  })

  it('allows paths within documents/downloads', () => {
    expect(validateFilePath('/home/testuser/Documents/readme.md')).toBe(true)
    expect(validateFilePath('/home/testuser/Downloads/report.md')).toBe(true)
  })

  it('rejects paths outside safe roots', () => {
    expect(validateFilePath('/etc/passwd')).toBe(false)
    expect(validateFilePath('/root/.bashrc')).toBe(false)
    expect(validateFilePath('/usr/bin/ls')).toBe(false)
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
