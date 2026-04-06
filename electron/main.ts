import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'

app.disableHardwareAcceleration()

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
