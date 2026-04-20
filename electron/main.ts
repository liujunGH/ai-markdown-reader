import { app, BrowserWindow, ipcMain, dialog, shell, Menu, MenuItemConstructorOptions, Tray, nativeImage, nativeTheme } from 'electron'
import path from 'path'
import fs from 'fs'

const watchers = new Map<string, fs.FSWatcher>()

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
  try {
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
    }
  } catch {}
  return { recentFiles: [], lastFolder: null, maxRecentFiles: DEFAULT_MAX_RECENT_FILES }
}

function saveStore(data: StoreData): void {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Failed to save store:', err)
  }
}

app.disableHardwareAcceleration()

const windows = new Map<number, BrowserWindow>()
const windowIds = new WeakMap<BrowserWindow, number>()
const windowOpenFiles = new Map<number, Set<string>>()
let windowIdCounter = 0
let lastFocusedWindowId = 0
let tray: Tray | null = null
let isQuiting = false
let openFileFromEvent = false

const isDev = !app.isPackaged

function log(message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString()
  console.log(`[MAIN ${timestamp}] ${message}`, ...args)
}

function getWindowId(win: BrowserWindow): number {
  return windowIds.get(win) || 0
}

function getFocusedOrLastWindow(): BrowserWindow | undefined {
  for (const win of windows.values()) {
    if (win.isFocused() && !win.isDestroyed()) {
      return win
    }
  }
  const lastWin = windows.get(lastFocusedWindowId)
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

function createWindow(filePath?: string, windowState?: WindowState) {
  log('Creating window...')

  const win = new BrowserWindow({
    width: windowState?.width || 1200,
    height: windowState?.height || 800,
    minWidth: 800,
    minHeight: 600,
    x: windowState?.x,
    y: windowState?.y,
    title: 'AI Markdown Reader',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (windowState?.isMaximized) {
    win.maximize()
  }
  if (windowState?.isFullScreen) {
    win.setFullScreen(true)
  }
  win.show()

  const id = ++windowIdCounter
  windows.set(id, win)
  windowIds.set(win, id)

  win.on('focus', () => {
    lastFocusedWindowId = id
  })

  win.on('closed', () => {
    log('Window closed:', id)
    windowOpenFiles.delete(id)
    windows.delete(id)
    if (lastFocusedWindowId === id) {
      lastFocusedWindowId = 0
    }
  })

  win.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault()
      win.hide()
    }
  })

  const htmlPath = isDev 
    ? 'http://localhost:5173'
    : path.join(__dirname, '../dist/index.html')

  log('Loading HTML:', htmlPath)

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    const loaded = win.loadFile(htmlPath)
    log('loadFile returned:', loaded)
  }

  win.webContents.on('did-finish-load', () => {
    log('Page finished loading for window:', id)
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log('Page failed to load:', errorCode, errorDescription)
  })

  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 0) {
      log('[RENDERER]', message)
    }
  })

  if (filePath && !openFileFromEvent) {
    log('File to open via did-finish-load:', filePath)
    const loadHandler = () => {
      if (openFileFromEvent) {
        log('Skipping did-finish-load send, open-file event already handled')
        return
      }
      win.webContents.send('open-file', filePath)
    }
    win.webContents.once('did-finish-load', loadHandler)
  }

  return win
}

function createMenu() {
  const isMac = process.platform === 'darwin'
  
  const getTargetWindow = (): BrowserWindow | undefined => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused && !focused.isDestroyed()) return focused
    return getFocusedOrLastWindow()
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: 'AI Markdown Reader',
      submenu: [
        { role: 'about' as const, label: '关于' },
        { type: 'separator' as const },
        { role: 'services' as const, label: '服务' },
        { type: 'separator' as const },
        { role: 'hide' as const, label: '隐藏' },
        { role: 'hideOthers' as const, label: '隐藏其他' },
        { role: 'unhide' as const, label: '显示全部' },
        { type: 'separator' as const },
        { role: 'quit' as const, label: '退出' }
      ]
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建窗口',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const win = getTargetWindow()
            if (!win) return
            const result = await dialog.showOpenDialog(win, {
              properties: ['openFile'],
              filters: [
                { name: 'Markdown', extensions: ['md', 'markdown'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            })
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0]
              const content = fs.readFileSync(filePath, 'utf-8')
              win.webContents.send('open-file', filePath)
            }
          }
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const win = getTargetWindow()
            if (!win) return
            const result = await dialog.showOpenDialog(win, {
              properties: ['openDirectory']
            })
            if (!result.canceled && result.filePaths.length > 0) {
              win.webContents.send('open-folder', result.filePaths[0])
            }
          }
        },
        { type: 'separator' },
        {
          label: '打印',
          accelerator: 'CmdOrCtrl+P',
          click: () => getTargetWindow()?.webContents.print()
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const, label: '关闭' } : { role: 'quit' as const, label: '退出' }
      ]
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
        { role: 'selectAll' as const, label: '全选' }
      ]
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
        { role: 'togglefullscreen' as const, label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' as const, label: '最小化' },
        { role: 'zoom' as const, label: '缩放' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const, label: '前置全部窗口' },
          { type: 'separator' as const },
          { role: 'window' as const, label: '窗口' }
        ] : [
          { role: 'close' as const, label: '关闭' }
        ])
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 AI Markdown Reader',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于 AI Markdown Reader',
              message: 'AI Markdown Reader',
              detail: `一款沉浸式的 Markdown 阅读器

版本: 1.3.1

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
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function handleFileOpen(filePath: string) {
  log('handleFileOpen called:', filePath)
  
  if (!filePath) return
  
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.md' && ext !== '.markdown') {
    log('Not a markdown file:', ext)
    return
  }

  // If any window already has this file open, focus that window
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
    win.webContents.send('open-file', filePath)
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  } else {
    createWindow(filePath)
  }
}

const gotTheLock = app.requestSingleInstanceLock()
log('Got lock:', gotTheLock)

if (!gotTheLock) {
  log('Another instance is running, quitting...')
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    log('Second instance detected:', commandLine)
    const filePath = commandLine.find(arg => 
      arg.endsWith('.md') || arg.endsWith('.markdown')
    )
    if (filePath) {
      handleFileOpen(filePath)
    }
    
    const win = getFocusedOrLastWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

app.whenReady().then(() => {
  log('App ready')
  createMenu()

  if (process.platform === 'darwin') {
    const dockIconPath = path.join(__dirname, '../assets/icon.png')
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath)
    }
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: '打开文件', click: () => getFocusedOrLastWindow()?.webContents.send('menu-open-file') }
    ]))
  }

  // System tray
  const trayIconPath = path.join(__dirname, '../assets/icon.png')
  let trayIcon: Electron.NativeImage
  if (fs.existsSync(trayIconPath)) {
    trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 })
  } else {
    trayIcon = nativeImage.createEmpty()
  }
  tray = new Tray(trayIcon)
  tray.setToolTip('AI Markdown Reader')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开文件', click: () => getFocusedOrLastWindow()?.webContents.send('menu-open-file') },
    { label: '显示窗口', click: () => { 
      const win = getFocusedOrLastWindow()
      win?.show(); win?.focus() 
    } },
    { type: 'separator' },
    { label: '退出', click: () => { isQuiting = true; app.quit() } }
  ]))

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

  // System theme
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('system-theme-changed', theme)
      }
    })
  })

  app.on('open-file', (event, filePath) => {
    log('open-file event:', filePath)
    event.preventDefault()
    openFileFromEvent = true
    handleFileOpen(filePath)
  })

  const filePath = process.argv.find(arg => 
    arg.endsWith('.md') || arg.endsWith('.markdown')
  )
  log('File from argv:', filePath)
  log('Full argv:', process.argv)

  const store = loadStore()
  if (filePath) {
    handleFileOpen(filePath)
  } else if (store.windowStates && store.windowStates.length > 0) {
    store.windowStates.forEach((state) => {
      createWindow(undefined, state)
    })
  } else {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  log('All windows closed')
  watchers.forEach(watcher => watcher.close())
  watchers.clear()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  log('App activated')
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    const win = getFocusedOrLastWindow()
    win?.show()
    win?.focus()
  }
})

app.on('before-quit', () => {
  isQuiting = true
  saveWindowState()
})

process.on('uncaughtException', (error: Error) => {
  log('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason: unknown) => {
  log('Unhandled rejection:', reason)
})

ipcMain.handle('open-file-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow() || getFocusedOrLastWindow()
  const result = win
    ? await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
    : await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { filePath, content }
  }
  return null
})

ipcMain.handle('open-folder-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow() || getFocusedOrLastWindow()
  const result = win
    ? await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
      })
    : await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('read-folder', async (_event, folderPath: string) => {
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    const items = entries
      .filter(f => f.isDirectory() || f.name.endsWith('.md') || f.name.endsWith('.markdown'))
      .map(f => {
        const filePath = path.join(folderPath, f.name)
        if (f.isDirectory()) {
          return {
            name: f.name,
            filePath,
            isDirectory: true
          }
        }
        const stats = fs.statSync(filePath)
        return {
          name: f.name,
          filePath,
          size: stats.size,
          lastModified: stats.mtimeMs,
          isDirectory: false
        }
      })
    return { success: true, files: items }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('get-file-info', async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath)
    return {
      success: true,
      info: {
        name: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtimeMs,
        created: stats.birthtimeMs
      }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('get-recent-files', async () => {
  return loadStore().recentFiles
})

ipcMain.handle('add-recent-file', async (_event, file: { name: string, filePath: string }) => {
  const store = loadStore()
  const existing = store.recentFiles.findIndex(f => f.filePath === file.filePath)
  if (existing !== -1) {
    store.recentFiles.splice(existing, 1)
  }
  store.recentFiles.unshift({
    ...file,
    openedAt: Date.now()
  })
  const maxFiles = store.maxRecentFiles || DEFAULT_MAX_RECENT_FILES
  if (store.recentFiles.length > maxFiles) {
    store.recentFiles.pop()
  }
  saveStore(store)
})

ipcMain.handle('remove-recent-file', async (_event, filePath: string) => {
  const store = loadStore()
  store.recentFiles = store.recentFiles.filter(f => f.filePath !== filePath)
  saveStore(store)
})

ipcMain.handle('clear-recent-files', async () => {
  const store = loadStore()
  store.recentFiles = []
  saveStore(store)
})

ipcMain.handle('get-last-folder', async () => {
  return loadStore().lastFolder
})

ipcMain.handle('set-last-folder', async (_event, folderPath: string) => {
  const store = loadStore()
  store.lastFolder = folderPath
  saveStore(store)
})

ipcMain.handle('get-max-recent-files', async () => {
  return loadStore().maxRecentFiles || DEFAULT_MAX_RECENT_FILES
})

ipcMain.handle('set-max-recent-files', async (_event, max: number) => {
  const store = loadStore()
  store.maxRecentFiles = max
  if (store.recentFiles.length > max) {
    store.recentFiles = store.recentFiles.slice(0, max)
  }
  saveStore(store)
})

ipcMain.handle('watch-file', async (event, filePath: string) => {
  if (watchers.has(filePath)) {
    return { success: true, message: 'Already watching' }
  }
  try {
    const watcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        event.sender.send('file-changed', filePath)
      }
    })
    watchers.set(filePath, watcher)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('unwatch-file', async (_event, filePath: string) => {
  const watcher = watchers.get(filePath)
  if (watcher) {
    watcher.close()
    watchers.delete(filePath)
  }
})

ipcMain.handle('set-progress-bar', (event, progress: number) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.setProgressBar(progress)
  }
})

ipcMain.handle('clear-progress-bar', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.setProgressBar(-1)
  }
})

ipcMain.handle('set-title', (event, title: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.setTitle(title ? `${title} - AI Markdown Reader` : 'AI Markdown Reader')
  }
})

// Multi-window IPC handlers
ipcMain.handle('get-window-id', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return 0
  return getWindowId(win)
})

ipcMain.handle('focus-window', (_event, id: number) => {
  const win = windows.get(id)
  if (win && !win.isDestroyed()) {
    win.show()
    win.focus()
  }
})

ipcMain.handle('get-window-states', () => {
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
})

ipcMain.handle('register-window-files', (event, filePaths: string[]) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  const id = getWindowId(win)
  if (id) {
    windowOpenFiles.set(id, new Set(filePaths))
  }
})
