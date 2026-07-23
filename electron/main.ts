/**
 * Electron 主进程入口
 *
 * v2 架构：本文件只负责窗口管理、菜单、托盘、自动更新、生命周期。
 * 全部 IPC handler 按领域拆分到 electron/ipc/*.ts，通过 registerAllHandlers(ctx)
 * 统一注册。共享状态封装在 IpcContext 中，由本文件创建唯一实例。
 */
import { app, BrowserWindow, dialog, shell, Menu, Tray, nativeImage, nativeTheme } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import { createLogger } from './lib/logger'
import { createRateLimiter } from './lib/ipcGuard'
import { isExternalUrl } from './lib/externalLinks'
import { registerAllHandlers, type IpcContext, type ConfigStoreData } from './ipc'
import { closeDatabase, getDatabase } from './db/connection'
import { EVENT_CHANNELS } from '../shared'

const logger = createLogger('main')

// 版本号：用 electron app 取得，避免脆弱的相对路径 require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION = require('../../package.json').version

interface RecentFile {
  name: string
  filePath: string
  openedAt: number
}

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  isFullScreen?: boolean
}

interface StoreData {
  recentFiles: RecentFile[]
  lastFolder: string | null
  maxRecentFiles: number
  windowStates?: WindowState[]
}

const DEFAULT_MAX_RECENT_FILES = 100

const storePath = path.join(app.getPath('userData'), 'config.json')

function loadStore(): StoreData {
  // Try main file first, fallback to backup if corrupted
  const paths = [storePath, `${storePath}.bak`]
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
        if (data && typeof data === 'object') {
          return {
            recentFiles: data.recentFiles || [],
            lastFolder: data.lastFolder ?? null,
            maxRecentFiles: data.maxRecentFiles || DEFAULT_MAX_RECENT_FILES,
            windowStates: data.windowStates,
          }
        }
      }
    } catch {
      // Continue to next path
    }
  }
  return { recentFiles: [], lastFolder: null, maxRecentFiles: DEFAULT_MAX_RECENT_FILES }
}

function saveStore(data: StoreData): void {
  try {
    const dir = path.dirname(storePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const tmpPath = `${storePath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2))
    // Atomic rename on POSIX; best-effort on Windows
    fs.renameSync(tmpPath, storePath)
    // Also write backup
    fs.writeFileSync(`${storePath}.bak`, JSON.stringify(data, null, 2))
  } catch (err) {
    logger.error('Failed to save store', { error: String(err) })
  }
}

// ============================================================
// 共享可变状态（IPC 上下文的数据源）
// ============================================================
const watchers = new Map<string, fs.FSWatcher>()
const windows = new Map<number, BrowserWindow>()
const windowIds = new WeakMap<BrowserWindow, number>()
const windowOpenFiles = new Map<number, Set<string>>()
const windowIdCounter = { value: 0 }
const lastFocusedWindowId = { value: 0 }
const isQuiting = { value: false }
let splashWindow: BrowserWindow | null = null
let tray: Tray | null = null
const filesToOpenBeforeReady: string[] = []

const isDev = !app.isPackaged
const isPerfRun = process.env.AI_MARKDOWN_PERF === '1'

function getWindowId(win: BrowserWindow): number {
  return windowIds.get(win) || 0
}

function getFocusedOrLastWindow(): BrowserWindow | undefined {
  for (const win of windows.values()) {
    if (!win.isDestroyed() && win.isFocused()) {
      return win
    }
  }
  const lastWin = windows.get(lastFocusedWindowId.value)
  if (lastWin && !lastWin.isDestroyed()) {
    return lastWin
  }
  for (const win of windows.values()) {
    if (!win.isDestroyed()) {
      return win
    }
  }
  return undefined
}

function saveWindowState() {
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
  const store = loadStore()
  store.windowStates = states
  saveStore(store)
}

function createTrayIcon(): Electron.NativeImage {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADBJREFUOE9jZGBg+M+ABhhpIA4w0sQaQDUSBrAaQYpRbcCmEVyXYDWMZgCuS7AaRjcAANIXCf8K6mNaAAAAAElFTkSuQmCC'
  const buffer = Buffer.from(base64, 'base64')
  return nativeImage.createFromBuffer(buffer, { width: 16, height: 16 })
}

function createWindow(filePath?: string, windowState?: WindowState) {
  logger.info('Creating window...')

  const preloadPath = app.isPackaged
    ? path.join(process.resourcesPath, 'electron', 'preload.js')
    : path.join(__dirname, 'preload.js')
  logger.info('Preload path resolved', { preloadPath, exists: fs.existsSync(preloadPath) })

  const win = new BrowserWindow({
    width: windowState?.width || 1200,
    height: windowState?.height || 800,
    minWidth: 800,
    minHeight: 600,
    x: windowState?.x,
    y: windowState?.y,
    title: 'Markdown Reader',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  })

  if (windowState?.isMaximized) {
    win.maximize()
  }
  if (windowState?.isFullScreen) {
    win.setFullScreen(true)
  }

  win.once('ready-to-show', () => {
    win.show()
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
      splashWindow = null
    }
  })

  const id = ++windowIdCounter.value
  windows.set(id, win)
  windowIds.set(win, id)

  win.on('focus', () => {
    lastFocusedWindowId.value = id
  })

  win.on('closed', () => {
    logger.info('Window closed', { windowId: id })
    windowOpenFiles.delete(id)
    windows.delete(id)
    if (lastFocusedWindowId.value === id) {
      lastFocusedWindowId.value = 0
    }
  })

  win.on('close', (event) => {
    if (!isQuiting.value && process.platform === 'darwin') {
      event.preventDefault()
      win.hide()
    }
  })

  const htmlPath = isDev
    ? 'http://localhost:5173'
    : path.join(__dirname, '../dist/index.html')

  logger.info('Loading HTML', { htmlPath })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    if (!isPerfRun) {
      win.webContents.openDevTools()
    }
  } else {
    win.loadFile(htmlPath).catch((err) => {
      logger.error('Failed to load file', { htmlPath, error: String(err) })
    })
  }

  win.webContents.on('did-finish-load', () => {
    logger.info('Page finished loading', { windowId: id })
  })

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = ['verbose', 'info', 'warning', 'error'][level] || String(level)
    logger.info(`[RENDERER ${levelName}] ${message}`, { sourceId, line })
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error('Page failed to load', { errorCode, errorDescription })
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url === win.webContents.getURL()) return
    event.preventDefault()
    if (isExternalUrl(url)) {
      void shell.openExternal(url)
    }
  })

  if (filePath) {
    logger.info('File to open via did-finish-load', { filePath })
    const loadHandler = () => {
      win.webContents.send(EVENT_CHANNELS.OPEN_FILE, filePath)
    }
    win.webContents.once('did-finish-load', loadHandler)
  }

  return win
}

function createSplashWindow() {
  const splashHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    .loader { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2); border-radius: 50%; border-top-color: #4a9eff; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { margin: 0; font-size: 18px; font-weight: 500; letter-spacing: 0.5px; }
    p { margin: 8px 0 0; opacity: 0.6; font-size: 13px; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h1>Markdown Reader</h1>
    <p>Loading...</p>
  </div>
</body>
</html>`

  splashWindow = new BrowserWindow({
    width: 360,
    height: 260,
    frame: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
  })
}

function createMenu() {
  const isMac = process.platform === 'darwin'

  const getTargetWindow = (): BrowserWindow | undefined => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused && !focused.isDestroyed()) return focused
    return getFocusedOrLastWindow()
  }

  const openFileMenuItem = (): Electron.MenuItemConstructorOptions => ({
    label: '打开文件',
    accelerator: 'CmdOrCtrl+O',
    click: async () => {
      const win = getTargetWindow()
      if (!win || win.isDestroyed()) return
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        if (!win.isDestroyed()) {
          win.webContents.send(EVENT_CHANNELS.OPEN_FILE, filePath)
        }
      }
    },
  })

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Markdown Reader',
            submenu: [
              { role: 'about' as const, label: '关于' },
              { type: 'separator' as const },
              { role: 'services' as const, label: '服务' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: '隐藏' },
              { role: 'hideOthers' as const, label: '隐藏其他' },
              { role: 'unhide' as const, label: '显示全部' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: '退出' },
            ],
          },
        ]
      : []),
    {
      label: '文件',
      submenu: [
        { label: '新建窗口', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow() },
        { type: 'separator' },
        openFileMenuItem(),
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const win = getTargetWindow()
            if (!win || win.isDestroyed()) return
            const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
            if (!result.canceled && result.filePaths.length > 0) {
              if (!win.isDestroyed()) {
                win.webContents.send(EVENT_CHANNELS.OPEN_FOLDER, result.filePaths[0])
              }
            }
          },
        },
        { type: 'separator' },
        { label: '打印', accelerator: 'CmdOrCtrl+P', click: () => getTargetWindow()?.webContents.print() },
        { type: 'separator' },
        isMac ? { role: 'close' as const, label: '关闭' } : { role: 'quit' as const, label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' as const, label: '撤销' },
        { role: 'redo' as const, label: '重做' },
        { type: 'separator' as const },
        { role: 'cut' as const, label: '剪切' },
        { role: 'copy' as const, label: '复制' },
        { role: 'paste' as const, label: '粘贴' },
        { role: 'selectAll' as const, label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' as const, label: '重新加载' },
        { role: 'forceReload' as const, label: '强制重新加载' },
        { role: 'toggleDevTools' as const, label: '开发者工具' },
        { type: 'separator' as const },
        { role: 'resetZoom' as const, label: '实际大小' },
        { role: 'zoomIn' as const, label: '放大' },
        { role: 'zoomOut' as const, label: '缩小' },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const, label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' as const, label: '最小化' },
        { role: 'zoom' as const, label: '缩放' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: '前置全部窗口' },
              { type: 'separator' as const },
              { role: 'window' as const, label: '窗口' },
            ]
          : [{ role: 'close' as const, label: '关闭' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 Markdown Reader',
          click: () => {
            const win = getTargetWindow()
            const detail = `一款沉浸式的 Markdown 阅读器

版本: ${APP_VERSION}

功能特性:
• 多标签页支持，标签拖拽重排序
• 深色/浅色/护眼主题，多种代码主题
• Mermaid 图表，支持导出 SVG/PNG
• KaTeX 数学公式
• 代码高亮，Emoji 支持
• 文件夹树形目录浏览
• 最近文件管理（保存100条历史）
• 快速切换器，路径搜索
• 专注模式，会话恢复
• 外部文件变更检测
• 原生文件拖拽支持
• 多窗口支持，窗口状态持久化

开源协议: MIT License

仓库地址: https://github.com/liujunGH/ai-markdown-reader

作者: liujun`
            if (win && !win.isDestroyed()) {
              dialog.showMessageBox(win, { type: 'info', title: '关于 Markdown Reader', message: 'Markdown Reader', detail })
            } else {
              dialog.showMessageBox({ type: 'info', title: '关于 Markdown Reader', message: 'Markdown Reader', detail })
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function handleFileOpen(filePath: string) {
  logger.info('handleFileOpen called', { filePath })

  if (!filePath) return

  try {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      logger.info('Path is a directory, not a file', { filePath })
      return
    }
  } catch {
    logger.warn('Cannot access file', { filePath })
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.md' && ext !== '.markdown') {
    logger.info('Not a markdown file', { filePath, ext })
    return
  }

  // 多窗口文件去重：若任一窗口已打开此文件，聚焦该窗口
  for (const [id, files] of windowOpenFiles.entries()) {
    if (files.has(filePath)) {
      const win = windows.get(id)
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
        return
      }
    }
  }

  const win = getFocusedOrLastWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(EVENT_CHANNELS.OPEN_FILE, filePath)
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  } else {
    createWindow(filePath)
  }
}

// ============================================================
// 单实例锁
// ============================================================
const gotTheLock = app.requestSingleInstanceLock()
logger.info('Got lock', { gotTheLock })

if (!gotTheLock) {
  logger.info('Another instance is running, quitting...')
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    logger.info('Second instance detected', { commandLine })
    const filePath = commandLine.find((arg) => arg.endsWith('.md') || arg.endsWith('.markdown'))
    if (filePath) {
      handleFileOpen(filePath)
    }

    const win = getFocusedOrLastWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

// ============================================================
// 应用就绪：菜单 / 闪屏 / 初始窗口 / 托盘 / 更新 / IPC 注册 / 事件
// ============================================================
app.whenReady().then(() => {
  logger.info('App ready')
  createMenu()

  if (!isDev) {
    createSplashWindow()
  }

  if (process.platform === 'darwin') {
    app.dock?.setMenu(
      Menu.buildFromTemplate([
        {
          label: '打开文件',
          click: async () => {
            const win = getFocusedOrLastWindow()
            if (!win || win.isDestroyed()) return
            const result = await dialog.showOpenDialog(win, {
              properties: ['openFile'],
              filters: [
                { name: 'Markdown', extensions: ['md', 'markdown'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            })
            if (!result.canceled && result.filePaths.length > 0) {
              if (!win.isDestroyed()) {
                win.webContents.send(EVENT_CHANNELS.OPEN_FILE, result.filePaths[0])
              }
            }
          },
        },
      ])
    )
  }

  const filePath = process.argv.find((arg) => arg.endsWith('.md') || arg.endsWith('.markdown'))
  logger.info('File from argv', { filePath, argv: process.argv })

  const store = loadStore()
  for (const pathToOpen of filesToOpenBeforeReady) {
    handleFileOpen(pathToOpen)
  }
  if (filePath) {
    handleFileOpen(filePath)
  } else if (store.windowStates && store.windowStates.length > 0) {
    store.windowStates.forEach((state) => {
      createWindow(undefined, state)
    })
  } else {
    createWindow()
  }

  // 系统托盘
  const trayIcon = createTrayIcon()
  tray = new Tray(trayIcon)
  tray.setToolTip('Markdown Reader')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开文件',
        click: async () => {
          const win = getFocusedOrLastWindow()
          if (!win || win.isDestroyed()) return
          const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
              { name: 'Markdown', extensions: ['md', 'markdown'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          })
          if (!result.canceled && result.filePaths.length > 0) {
            if (!win.isDestroyed()) {
              win.webContents.send(EVENT_CHANNELS.OPEN_FILE, result.filePaths[0])
            }
          }
        },
      },
      {
        label: '显示窗口',
        click: () => {
          const win = getFocusedOrLastWindow()
          win?.show()
          win?.focus()
        },
      },
      { type: 'separator' },
      { label: '退出', click: () => { isQuiting.value = true; app.quit() } },
    ])
  )

  // 自动更新（仅打包构建）
  if (app.isPackaged) {
    const sendToAllWindows = (channel: string, ...args: unknown[]) => {
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, ...args)
        }
      })
    }

    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for update')
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('Update available', { version: info.version })
      sendToAllWindows(EVENT_CHANNELS.UPDATE_AVAILABLE, { version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      logger.info('Update not available')
    })

    autoUpdater.on('error', (err) => {
      const msg = String(err)
      logger.error('Auto-updater error', { error: msg })
      if (msg.includes('Cannot find latest-mac.yml') || msg.includes('404')) {
        return
      }
      sendToAllWindows(EVENT_CHANNELS.UPDATE_ERROR, { error: msg })
    })

    autoUpdater.on('download-progress', (progress) => {
      sendToAllWindows(EVENT_CHANNELS.UPDATE_PROGRESS, {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded', { version: info.version })
      sendToAllWindows(EVENT_CHANNELS.UPDATE_DOWNLOADED, { version: info.version })
    })

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        logger.error('Auto-updater check failed', { error: String(err) })
      })
    }, 10000)
  }

  tray.on('click', () => {
    const win = getFocusedOrLastWindow()
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    }
  })

  // 系统主题
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(EVENT_CHANNELS.SYSTEM_THEME_CHANGED, theme)
      }
    })
  })

  app.on('open-file', (event, filePath) => {
    logger.info('open-file event', { filePath })
    event.preventDefault()
    if (app.isReady()) {
      handleFileOpen(filePath)
    } else {
      filesToOpenBeforeReady.push(filePath)
    }
  })

  // ============================================================
  // 注册全部 IPC handler（27 个原有 channel + 2 个新增 db channel）
  // ============================================================
  const ipcContext: IpcContext = {
    loadConfigStore: (): ConfigStoreData => {
      const s = loadStore()
      return {
        recentFiles: s.recentFiles,
        lastFolder: s.lastFolder,
        maxRecentFiles: s.maxRecentFiles,
        windowStates: s.windowStates,
      }
    },
    saveConfigStore: (data: ConfigStoreData) => {
      saveStore({
        recentFiles: data.recentFiles,
        lastFolder: data.lastFolder,
        maxRecentFiles: data.maxRecentFiles,
        windowStates: data.windowStates,
      })
    },
    watchers,
    windows,
    windowIds,
    windowOpenFiles,
    windowIdCounter,
    lastFocusedWindowId,
    getWindowId,
    getFocusedOrLastWindow,
    isQuiting,
    logger,
    fileDialogLimiter: createRateLimiter(5, 1000),
  }
  registerAllHandlers(ipcContext)
  logger.info('All IPC handlers registered')

  // 预热数据库：在启动阶段就建库 + 跑迁移，而非延迟到首次查询。
  // 好处：迁移失败尽早暴露（不会拖到用户首次搜索时才崩）；后续 db 调用无冷启动。
  try {
    getDatabase()
  } catch (err) {
    // 迁移失败不阻断启动（文件读写等核心功能不依赖 DB），仅记录。
    // 阅读数据/搜索功能会降级，db:* 通道会返回错误。
    logger.error('Database initialization failed, DB features disabled', { error: String(err) })
  }
})

app.on('window-all-closed', () => {
  logger.info('All windows closed')
  watchers.forEach((watcher) => watcher.close())
  watchers.clear()
  // macOS 关闭所有窗口不退出应用（用户可能重开窗口），故不关库；
  // 非 macOS 真正退出，由 before-quit 统一关库。
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('activate', () => {
  logger.info('App activated')
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    const win = getFocusedOrLastWindow()
    win?.show()
    win?.focus()
  }
})

app.on('before-quit', () => {
  isQuiting.value = true
  saveWindowState()
  closeDatabase()
})

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack })
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason: String(reason) })
})
