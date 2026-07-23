/**
 * 对话框相关 IPC handler（5 个 channel，全部走 5min 超时）
 *
 * 行为与旧 main.ts 逐行对齐（open-file-dialog / open-folder-dialog /
 * export-html-to-pdf / save-text-file / open-text-file）。
 *
 * 改动：用 ctx + shared 常量替代内联字面量与本地副本。
 */
import { BrowserWindow, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  MAX_FILE_SIZE,
  MAX_TEXT_FILE_SIZE,
  MARKDOWN_FILTER_EXTENSIONS,
} from '../../shared'
import { createLogger } from '../lib/logger'
import { validateFilePath as isPathSafe, validateFileSize } from '../lib/ipcGuard'
import type { IpcContext } from './context'
import { registerHandler, Channels } from './registry'

const logger = createLogger('ipc.dialog')

export function registerDialogHandlers(ctx: IpcContext): void {
  const { fileDialogLimiter } = ctx

  // ---- open-file-dialog (限流 + dedup + 5min) ----
  registerHandler(
    Channels.OPEN_FILE_DIALOG,
    async () => {
      if (!fileDialogLimiter()) {
        logger.warn('Rate limit exceeded for open-file-dialog')
        throw new Error('Rate limit exceeded. Please slow down.')
      }
      try {
        const win = BrowserWindow.getFocusedWindow() || ctx.getFocusedOrLastWindow()
        logger.info('open-file-dialog', {
          focusedWindow: BrowserWindow.getFocusedWindow()?.id,
          fallback: win?.id,
        })
        const options: Electron.OpenDialogOptions = {
          properties: ['openFile'],
          defaultPath: app.getPath('home'),
          filters: [
            { name: 'Markdown', extensions: [...MARKDOWN_FILTER_EXTENSIONS] },
            { name: 'All Files', extensions: ['*'] },
          ],
        }
        const result = win
          ? await dialog.showOpenDialog(win, options)
          : await dialog.showOpenDialog(options)
        logger.info('open-file-dialog result', {
          canceled: result.canceled,
          filePaths: result.filePaths,
        })

        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0]
          try {
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
              // 选中目录时，读取目录内第一个 .md/.markdown 文件
              logger.info('Selected path is a directory, reading first file inside', { filePath })
              const entries = fs.readdirSync(filePath, { withFileTypes: true })
              const firstFile = entries.find(
                (e) => !e.isDirectory() && (e.name.endsWith('.md') || e.name.endsWith('.markdown'))
              )
              if (firstFile) {
                const fullPath = path.join(filePath, firstFile.name)
                const sizeCheck = validateFileSize(fullPath, MAX_FILE_SIZE)
                if (!sizeCheck.valid) {
                  logger.warn('File too large in open-file-dialog', {
                    filePath: fullPath,
                    size: sizeCheck.size,
                    max: MAX_FILE_SIZE,
                  })
                  return { filePath: fullPath, content: '', error: sizeCheck.error }
                }
                const content = fs.readFileSync(fullPath, 'utf-8')
                return { filePath: fullPath, content }
              }
              return null
            }
            const sizeCheck = validateFileSize(filePath, MAX_FILE_SIZE)
            if (!sizeCheck.valid) {
              logger.warn('File too large in open-file-dialog', {
                filePath,
                size: sizeCheck.size,
                max: MAX_FILE_SIZE,
              })
              return { filePath, content: '', error: sizeCheck.error }
            }
            const content = fs.readFileSync(filePath, 'utf-8')
            return { filePath, content }
          } catch (readErr) {
            logger.error('Failed to read file in open-file-dialog', {
              filePath,
              error: String(readErr),
            })
            return null
          }
        }
        return null
      } catch (err) {
        logger.error('open-file-dialog error', { error: String(err) })
        throw err
      }
    },
  )

  // ---- open-folder-dialog (限流 + dedup + 5min) ----
  registerHandler(
    Channels.OPEN_FOLDER_DIALOG,
    async () => {
      if (!fileDialogLimiter()) {
        logger.warn('Rate limit exceeded for open-folder-dialog')
        throw new Error('Rate limit exceeded. Please slow down.')
      }
      try {
        const win = BrowserWindow.getFocusedWindow() || ctx.getFocusedOrLastWindow()
        logger.info('open-folder-dialog', {
          focusedWindow: BrowserWindow.getFocusedWindow()?.id,
          fallback: win?.id,
        })
        const options: Electron.OpenDialogOptions = {
          properties: ['openDirectory'],
          defaultPath: app.getPath('home'),
        }
        const result = win
          ? await dialog.showOpenDialog(win, options)
          : await dialog.showOpenDialog(options)
        logger.info('open-folder-dialog result', {
          canceled: result.canceled,
          filePaths: result.filePaths,
        })

        if (!result.canceled && result.filePaths.length > 0) {
          return result.filePaths[0]
        }
        return null
      } catch (err) {
        logger.error('open-folder-dialog error', { error: String(err) })
        throw err
      }
    },
  )

  // ---- export-html-to-pdf (5min) ----
  registerHandler(
    Channels.EXPORT_HTML_TO_PDF,
    async (event, options: { html: string; defaultPath: string; title: string }) => {
      const parent = BrowserWindow.fromWebContents(event.sender) || ctx.getFocusedOrLastWindow()
      const result = parent
        ? await dialog.showSaveDialog(parent, {
            defaultPath: options.defaultPath,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          })
        : await dialog.showSaveDialog({
            defaultPath: options.defaultPath,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      let pdfWindow: BrowserWindow | null = null
      try {
        pdfWindow = new BrowserWindow({
          show: false,
          width: 900,
          height: 1200,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        })
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`)
        const pdf = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          margins: { marginType: 'default' },
          pageSize: 'A4',
        })
        fs.writeFileSync(result.filePath, pdf)
        return { success: true, filePath: result.filePath }
      } catch (error) {
        logger.error('Failed to export PDF', { title: options.title, error: String(error) })
        return { success: false, error: String(error) }
      } finally {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.close()
        }
      }
    },
  )

  // ---- save-text-file (5min) ----
  registerHandler(
    Channels.SAVE_TEXT_FILE,
    async (event, options: { defaultPath: string; content: string; filters?: Electron.FileFilter[] }) => {
      const parent = BrowserWindow.fromWebContents(event.sender) || ctx.getFocusedOrLastWindow()
      const result = parent
        ? await dialog.showSaveDialog(parent, {
            defaultPath: options.defaultPath,
            filters: options.filters,
          })
        : await dialog.showSaveDialog({
            defaultPath: options.defaultPath,
            filters: options.filters,
          })

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true }
      }

      if (!isPathSafe(result.filePath)) {
        return { success: false, error: '非法路径' }
      }

      try {
        fs.writeFileSync(result.filePath, options.content, { encoding: 'utf-8' })
        return { success: true, filePath: result.filePath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )

  // ---- open-text-file (5min，独立 5MB 上限) ----
  registerHandler(
    Channels.OPEN_TEXT_FILE,
    async (event, options: { filters?: Electron.FileFilter[] } = {}) => {
      const parent = BrowserWindow.fromWebContents(event.sender) || ctx.getFocusedOrLastWindow()
      const result = parent
        ? await dialog.showOpenDialog(parent, {
            properties: ['openFile'],
            filters: options.filters,
          })
        : await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: options.filters,
          })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const filePath = result.filePaths[0]
      if (!isPathSafe(filePath)) {
        return { success: false, error: '非法路径' }
      }

      const sizeCheck = validateFileSize(filePath, MAX_TEXT_FILE_SIZE)
      if (!sizeCheck.valid) {
        return { success: false, error: sizeCheck.error }
      }

      try {
        return { success: true, filePath, content: fs.readFileSync(filePath, 'utf-8') }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  )
}
