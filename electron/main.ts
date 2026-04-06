import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'

// 禁用硬件加速，避免某些环境下的问题
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow(filePath?: string) {
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 如果有文件路径，加载它
  if (filePath) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('open-file', filePath)
    })
  }
}

// 处理命令行参数（双击 .md 文件时）
function handleFileOpen(filePath: string) {
  if (!filePath) return
  
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.md' && ext !== '.markdown') {
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

// 单实例锁 - 防止多个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Windows/Linux: 从命令行获取文件路径
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
  // macOS: 处理 open-file 事件
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    handleFileOpen(filePath)
  })

  // 检查命令行参数
  const filePath = process.argv.find(arg => 
    arg.endsWith('.md') || arg.endsWith('.markdown')
  )
  createWindow(filePath)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC: 打开文件对话框
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

// IPC: 打开文件夹对话框
ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// IPC: 读取文件
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// IPC: 获取文件信息
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

// IPC: 在文件管理器中显示
ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})
