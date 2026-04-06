import { app, BrowserWindow, ipcMain, dialog, shell, Menu, MenuItemConstructorOptions } from 'electron'
import path from 'path'
import fs from 'fs'

app.disableHardwareAcceleration()

function createMenu() {
  const isMac = process.platform === 'darwin'
  
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
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-file')
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('menu-open-folder')
        },
        { type: 'separator' },
        {
          label: '打印',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.print()
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
              title: '关于',
              message: 'AI Markdown Reader',
              detail: '一款沉浸式的 Markdown 阅读器\n版本 1.1.3'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

console.log('[MAIN] App starting...')
console.log('[MAIN] Is packaged:', app.isPackaged)
console.log('[MAIN] __dirname:', __dirname)
console.log('[MAIN] App path:', app.getAppPath())

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function log(message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString()
  console.log(`[MAIN ${timestamp}] ${message}`, ...args)
}

function createWindow(filePath?: string) {
  log('Creating window...')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AI Markdown Reader',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const htmlPath = isDev 
    ? 'http://localhost:5173'
    : path.join(__dirname, '../dist/index.html')

  log('Loading HTML:', htmlPath)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const loaded = mainWindow.loadFile(htmlPath)
    log('loadFile returned:', loaded)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('Page finished loading')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log('Page failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 0) {
      log('[RENDERER]', message)
    }
  })

  mainWindow.on('closed', () => {
    log('Window closed')
    mainWindow = null
  })

  if (filePath) {
    log('File to open:', filePath)
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('open-file', filePath)
    })
  }
}

function handleFileOpen(filePath: string) {
  log('handleFileOpen called:', filePath)
  
  if (!filePath) return
  
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.md' && ext !== '.markdown') {
    log('Not a markdown file:', ext)
    return
  }

  if (mainWindow) {
    mainWindow.webContents.send('open-file', filePath)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
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
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  log('App ready')
  createMenu()

  app.on('open-file', (event, filePath) => {
    log('open-file event:', filePath)
    event.preventDefault()
    handleFileOpen(filePath)
  })

  const filePath = process.argv.find(arg => 
    arg.endsWith('.md') || arg.endsWith('.markdown')
  )
  log('File from argv:', filePath)
  log('Full argv:', process.argv)

  createWindow(filePath)
})

app.on('window-all-closed', () => {
  log('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  log('App activated')
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

process.on('uncaughtException', (error: Error) => {
  log('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason: unknown) => {
  log('Unhandled rejection:', reason)
})

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
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
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
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
