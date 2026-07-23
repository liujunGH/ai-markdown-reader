/**
 * 文件相关 IPC handler（11 个 channel）
 *
 * 行为与旧 main.ts 逐行对齐（read-folder / scan-markdown-files / read-file /
 * write-file / update-markdown-file / download-remote-image /
 * read-image-as-data-url / get-file-info / show-in-folder /
 * watch-file / unwatch-file）。
 *
 * 改动仅为：用 ctx 访问共享状态、用 shared 常量替代内联字面量、用 shared
 * 的 IMAGE_MIME_TYPES / isMarkdownPath / shouldSkipScanDirectory 替代本地副本。
 */
import { shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  IMAGE_MIME_TYPES,
  shouldSkipScanDirectory,
  isMarkdownPath,
} from '../../shared'
import { createLogger } from '../lib/logger'
import { validateFilePath as isPathSafe, validateFileSize } from '../lib/ipcGuard'
import type { IpcContext } from './context'
import { registerHandler, Channels } from './registry'

const logger = createLogger('ipc.file')

export function registerFileHandlers(ctx: IpcContext): void {

  // ---- read-folder ----
  registerHandler(
    Channels.READ_FOLDER,
    async (_event, folderPath: string) => {
      if (!isPathSafe(folderPath)) {
        return { success: false, error: '非法路径' }
      }
      try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true })
        const items = entries
          .filter(
            (f) => f.isDirectory() || f.name.endsWith('.md') || f.name.endsWith('.markdown')
          )
          .map((f) => {
            const filePath = path.join(folderPath, f.name)
            if (f.isDirectory()) {
              return { name: f.name, filePath, isDirectory: true }
            }
            const stats = fs.statSync(filePath)
            return {
              name: f.name,
              filePath,
              size: stats.size,
              lastModified: stats.mtimeMs,
              isDirectory: false,
            }
          })
        return { success: true, files: items }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- scan-markdown-files (5min 超时) ----
  registerHandler(
    Channels.SCAN_MARKDOWN_FILES,
    async (_event, folderPath: string, options: { maxFileSizeBytes?: number; skipDirectoryNames?: string[] } = {}) => {
      if (!isPathSafe(folderPath)) {
        return { success: false, error: '非法路径' }
      }

      const files: Array<{ name: string; filePath: string }> = []
      const skippedItems: Array<{
        path: string
        name: string
        reason: 'ignored-directory' | 'large-file' | 'read-error'
        detail?: string
        size?: number
        maxSize?: number
      }> = []
      const maxFileSizeBytes = options.maxFileSizeBytes
      const skipDirectoryNames = options.skipDirectoryNames ?? []

      const scan = (currentFolderPath: string) => {
        let entries: fs.Dirent[]
        try {
          entries = fs.readdirSync(currentFolderPath, { withFileTypes: true })
        } catch (error) {
          skippedItems.push({
            path: currentFolderPath,
            name: path.basename(currentFolderPath),
            reason: 'read-error',
            detail: String(error),
          })
          return
        }

        for (const entry of entries) {
          const itemPath = path.join(currentFolderPath, entry.name)
          if (entry.isDirectory()) {
            if (shouldSkipScanDirectory(entry.name, skipDirectoryNames)) {
              skippedItems.push({
                path: itemPath,
                name: entry.name,
                reason: 'ignored-directory',
              })
              continue
            }
            scan(itemPath)
            continue
          }

          if (!isMarkdownPath(entry.name)) {
            continue
          }

          try {
            const stat = fs.statSync(itemPath)
            if (maxFileSizeBytes !== undefined && stat.size > maxFileSizeBytes) {
              skippedItems.push({
                path: itemPath,
                name: entry.name,
                reason: 'large-file',
                size: stat.size,
                maxSize: maxFileSizeBytes,
              })
              continue
            }
            files.push({ name: entry.name, filePath: itemPath })
          } catch (error) {
            skippedItems.push({
              path: itemPath,
              name: entry.name,
              reason: 'read-error',
              detail: String(error),
            })
          }
        }
      }

      try {
        scan(folderPath)
        return { success: true, files, skippedItems }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- read-file ----
  registerHandler(
    Channels.READ_FILE,
    async (_event, filePath: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }
      const sizeCheck = validateFileSize(filePath, MAX_FILE_SIZE)
      if (!sizeCheck.valid) {
        logger.warn('File too large in read-file', {
          filePath,
          size: sizeCheck.size,
          max: MAX_FILE_SIZE,
        })
        return { success: false, error: sizeCheck.error }
      }
      try {
        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
          return { success: false, error: '路径是一个目录，不是文件' }
        }
        const content = fs.readFileSync(filePath, 'utf-8')
        return { success: true, content }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- write-file (独占创建，不覆盖) ----
  registerHandler(
    Channels.WRITE_FILE,
    async (_event, filePath: string, content: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }
      if (!isMarkdownPath(filePath)) {
        return { success: false, error: '只能创建 Markdown 文件' }
      }
      if (fs.existsSync(filePath)) {
        return { success: false, error: '文件已存在' }
      }
      try {
        fs.writeFileSync(filePath, content, { encoding: 'utf-8', flag: 'wx' })
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- update-markdown-file (覆盖) ----
  registerHandler(
    Channels.UPDATE_MARKDOWN_FILE,
    async (_event, filePath: string, content: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }
      if (!isMarkdownPath(filePath)) {
        return { success: false, error: '只能更新 Markdown 文件' }
      }
      try {
        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
          return { success: false, error: '路径是一个目录，不是文件' }
        }
        fs.writeFileSync(filePath, content, { encoding: 'utf-8' })
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- download-remote-image ----
  registerHandler(
    Channels.DOWNLOAD_REMOTE_IMAGE,
    async (_event, url: string, outputPath: string) => {
      if (!/^https?:\/\//i.test(url)) {
        return { success: false, error: '只支持 http(s) 图片' }
      }
      if (!isPathSafe(outputPath)) {
        return { success: false, error: '非法路径' }
      }
      const ext = path.extname(outputPath).toLowerCase()
      if (!IMAGE_MIME_TYPES[ext]) {
        return { success: false, error: '不支持的图片格式' }
      }
      try {
        const response = await fetch(url)
        if (!response.ok) {
          return { success: false, error: `下载失败：${response.status}` }
        }
        const arrayBuffer = await response.arrayBuffer()
        if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
          return { success: false, error: '图片过大' }
        }
        fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        fs.writeFileSync(outputPath, Buffer.from(arrayBuffer))
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- read-image-as-data-url (dedup) ----
  registerHandler(
    Channels.READ_IMAGE_AS_DATA_URL,
    async (_event, filePath: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }

      const ext = path.extname(filePath).toLowerCase()
      const mimeType = IMAGE_MIME_TYPES[ext]
      if (!mimeType) {
        return { success: false, error: '不支持的图片格式' }
      }

      const sizeCheck = validateFileSize(filePath, MAX_IMAGE_SIZE)
      if (!sizeCheck.valid) {
        logger.warn('Image too large in read-image-as-data-url', {
          filePath,
          size: sizeCheck.size,
          max: MAX_IMAGE_SIZE,
        })
        return { success: false, error: sizeCheck.error }
      }

      try {
        const data = fs.readFileSync(filePath)
        return { success: true, dataUrl: `data:${mimeType};base64,${data.toString('base64')}` }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- get-file-info ----
  registerHandler(
    Channels.GET_FILE_INFO,
    async (_event, filePath: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }
      try {
        const stats = fs.statSync(filePath)
        return {
          success: true,
          info: {
            name: path.basename(filePath),
            size: stats.size,
            lastModified: stats.mtimeMs,
            created: stats.birthtimeMs,
          },
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- show-in-folder ----
  registerHandler(
    Channels.SHOW_IN_FOLDER,
    async (_event, filePath: string) => {
      if (!isPathSafe(filePath)) return
      shell.showItemInFolder(filePath)
    },
  )

  // ---- watch-file ----
  registerHandler(
    Channels.WATCH_FILE,
    async (event, filePath: string) => {
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }
      if (ctx.watchers.has(filePath)) {
        return { success: true, message: 'Already watching' }
      }
      // 关键：watcher 绑定首次注册它的 webContents，其它窗口不收到该文件变更通知
      const sender = event.sender
      try {
        const watcher = fs.watch(filePath, (eventType) => {
          if (eventType === 'change' || eventType === 'rename') {
            const win = BrowserWindow.fromWebContents(sender)
            if (win && !win.isDestroyed()) {
              sender.send('file-changed', filePath)
            }
          }
        })
        ctx.watchers.set(filePath, watcher)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- unwatch-file ----
  registerHandler(
    Channels.UNWATCH_FILE,
    async (_event, filePath: string) => {
      if (!isPathSafe(filePath)) return
      const watcher = ctx.watchers.get(filePath)
      if (watcher) {
        watcher.close()
        ctx.watchers.delete(filePath)
      }
    },
  )
}
