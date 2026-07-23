/**
 * 窗口相关 IPC handler（7 个 channel）
 *
 * 行为与旧 main.ts 逐行对齐（set-progress-bar / clear-progress-bar /
 * set-title / get-window-id / focus-window / get-window-states /
 * register-window-files）。
 */
import { BrowserWindow } from 'electron'
import type { WindowState } from '../../shared'
import type { IpcContext } from './context'
import { registerHandler, Channels } from './registry'

export function registerWindowHandlers(ctx: IpcContext): void {
  const { windows, getWindowId } = ctx

  // ---- set-progress-bar ----
  registerHandler(
    Channels.SET_PROGRESS_BAR,
    (event, progress: number) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.setProgressBar(progress)
      }
    },
  )

  // ---- clear-progress-bar ----
  registerHandler(
    Channels.CLEAR_PROGRESS_BAR,
    (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.setProgressBar(-1)
      }
    },
  )

  // ---- set-title ----
  registerHandler(
    Channels.SET_TITLE,
    (event, title: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.setTitle(title ? `${title} - Markdown Reader` : 'Markdown Reader')
      }
    },
  )

  // ---- get-window-id ----
  registerHandler(
    Channels.GET_WINDOW_ID,
    (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return 0
      return getWindowId(win)
    },
  )

  // ---- focus-window ----
  registerHandler(
    Channels.FOCUS_WINDOW,
    (_event, id: number) => {
      const win = windows.get(id)
      if (win && !win.isDestroyed()) {
        win.show()
        win.focus()
      }
    },
  )

  // ---- get-window-states ----
  registerHandler(
    Channels.GET_WINDOW_STATES,
    () => {
      const states: WindowState[] = []
      for (const win of windows.values()) {
        if (win.isDestroyed()) continue
        const bounds = win.getBounds()
        states.push({
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: win.isMaximized(),
          isFullScreen: win.isFullScreen(),
        })
      }
      return states
    },
  )

  // ---- register-window-files ----
  registerHandler(
    Channels.REGISTER_WINDOW_FILES,
    (event, filePaths: string[]) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      const id = getWindowId(win)
      if (id) {
        ctx.windowOpenFiles.set(id, new Set(filePaths))
      }
    },
  )
}
