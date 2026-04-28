import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

let globalMinLevel: LogLevel = 'info'

function getLogDir(): string {
  try {
    return path.join(app.getPath('userData'), 'logs')
  } catch {
    return path.join(process.cwd(), 'logs')
  }
}

function rotateIfNeeded(logFile: string): void {
  try {
    const stats = fs.statSync(logFile)
    if (stats.size < 1024 * 1024) return // 1MB
  } catch {
    return // file doesn't exist
  }

  // Rotate: .4 -> delete, .3 -> .4, .2 -> .3, .1 -> .2, -> .1
  for (let i = 4; i >= 1; i--) {
    const src = i === 1 ? logFile : `${logFile}.${i - 1}`
    const dst = `${logFile}.${i}`
    try {
      if (fs.existsSync(dst)) fs.unlinkSync(dst)
      if (fs.existsSync(src)) fs.renameSync(src, dst)
    } catch {
      // ignore rotation errors
    }
  }
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
  correlationId?: string
): void {
  if (LEVELS[level] < LEVELS[globalMinLevel]) return

  const timestamp = new Date().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  const cid = correlationId ? ` [${correlationId}]` : ''
  const line = `[${timestamp}] [${level.toUpperCase()}] [main] [${scope}]${cid} ${message}${metaStr}\n`

  try {
    const logDir = getLogDir()
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logFile = path.join(logDir, 'app.log')
    rotateIfNeeded(logFile)
    fs.appendFileSync(logFile, line)
  } catch {
    // silently fail to avoid recursive logging issues
  }
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>, correlationId?: string) =>
      writeLog('debug', scope, message, meta, correlationId),
    info: (message: string, meta?: Record<string, unknown>, correlationId?: string) =>
      writeLog('info', scope, message, meta, correlationId),
    warn: (message: string, meta?: Record<string, unknown>, correlationId?: string) =>
      writeLog('warn', scope, message, meta, correlationId),
    error: (message: string, meta?: Record<string, unknown>, correlationId?: string) =>
      writeLog('error', scope, message, meta, correlationId),
  }
}

export function setLogLevel(level: LogLevel): void {
  globalMinLevel = level
}

export function getRecentLogs(maxLines = 200): string[] {
  try {
    const logFile = path.join(getLogDir(), 'app.log')
    if (!fs.existsSync(logFile)) return []
    const content = fs.readFileSync(logFile, 'utf-8')
    const lines = content.trim().split('\n')
    return lines.slice(-maxLines)
  } catch {
    return []
  }
}

export function clearLogs(): void {
  try {
    const logFile = path.join(getLogDir(), 'app.log')
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '')
    }
  } catch {
    // ignore
  }
}
