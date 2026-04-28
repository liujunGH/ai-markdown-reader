import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export function createTimeoutHandler<T extends (...args: any[]) => any>(
  handler: T,
  timeoutMs: number,
  handlerName: string
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args) => {
    return Promise.race([
      Promise.resolve(handler(...args)),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`IPC handler '${handlerName}' timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })
    ])
  }
}

export function createRateLimiter(maxCalls: number, windowMs: number): () => boolean {
  const calls: number[] = []
  return function checkRateLimit(): boolean {
    const now = Date.now()
    while (calls.length > 0 && calls[0] < now - windowMs) {
      calls.shift()
    }
    if (calls.length >= maxCalls) {
      return false
    }
    calls.push(now)
    return true
  }
}

export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false
  // Reject paths with parent directory traversal
  if (filePath.includes('..')) return false
  // Reject null bytes
  if (filePath.includes('\0')) return false
  // Resolve and ensure it's absolute
  const resolved = path.resolve(filePath)
  if (!path.isAbsolute(resolved)) return false
  // Allow common safe base directories only
  const homeDir = app.getPath('home')
  const userDataDir = app.getPath('userData')
  const tempDir = app.getPath('temp')
  const desktopDir = app.getPath('desktop')
  const documentsDir = app.getPath('documents')
  const downloadsDir = app.getPath('downloads')
  const safeRoots = [homeDir, userDataDir, tempDir, desktopDir, documentsDir, downloadsDir, '/tmp']
  return safeRoots.some(root => resolved.startsWith(root))
}

export function validateFileSize(
  filePath: string,
  maxBytes: number
): { valid: boolean; size?: number; error?: string } {
  try {
    const stats = fs.statSync(filePath)
    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' }
    }
    if (stats.size > maxBytes) {
      return {
        valid: false,
        size: stats.size,
        error: `File size (${stats.size} bytes) exceeds maximum allowed (${maxBytes} bytes)`
      }
    }
    return { valid: true, size: stats.size }
  } catch (err) {
    return { valid: false, error: `Cannot access file: ${err}` }
  }
}
