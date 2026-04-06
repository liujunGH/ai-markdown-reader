import { useState, useEffect, useRef, useMemo } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer, MarkdownRendererRef } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'
import { Outline } from './components/Outline'
import { SearchBox } from './components/SearchBox'
import { ProgressBar } from './components/ProgressBar'
import { StatusBar } from './components/StatusBar'
import { RecentFiles } from './components/RecentFiles'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import FirstUseGuide from './components/FirstUseGuide'
import QuickSwitcher from './components/QuickSwitcher'
import { SidebarFileExplorer } from './components/SidebarFileExplorer'
import { FileInfoPanel } from './components/FileInfoPanel'
import { BookmarkPanel, useBookmarks } from './components/Bookmark'
import { useOutline } from './hooks/useOutline'
import { useScrollSpy } from './hooks/useScrollSpy'
import { useSearch } from './hooks/useSearch'
import { getRecentFiles, addRecentFile, RecentFile } from './utils/recentFiles'

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle>
    getFile(): Promise<File>
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>
    queryPermission(options?: { mode?: string }): Promise<PermissionState>
    requestPermission(options?: { mode?: string }): Promise<PermissionState>
  }
}

const LAST_FILE_KEY = 'last-opened-file'
const LAST_FOLDER_KEY = 'last-opened-folder'
const HAS_SEEN_GUIDE_KEY = 'has-seen-guide'

const welcomeContent = `
# 欢迎使用 AI Markdown Reader

一款沉浸式的 Markdown 阅读器，支持丰富的功能特性。

## 功能特性

### 📖 沉浸式阅读
专注模式（Ctrl+.）隐藏所有界面元素，只保留内容，带来沉浸式阅读体验。

### 🎨 主题切换
点击右上角的太阳/月亮图标切换深色/浅色模式，支持自定义主题颜色。

### 🔍 强大搜索
按 \`Ctrl+F\` 打开搜索框，支持正则表达式，↑↓ 键导航搜索结果。

### 📊 Mermaid 图表
支持在 Markdown 中嵌入 Mermaid 流程图，可导出为 SVG 或 PNG 图片。

\`\`\`mermaid
graph TD
    A[打开文件] --> B{拖拽或点击}
    B -->|点击| C[文件选择器]
    B -->|拖拽| D[直接读取]
    C --> E[渲染预览]
    D --> E
\`\`\`

### 📝 代码高亮
支持 JavaScript、TypeScript、Python、Go 等多种编程语言的语法高亮。

### 🔢 数学公式
支持 KaTeX 数学公式渲染，行内公式使用 \`$...$\`，块级公式使用 \`$$...$$\`。

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

### 🖼️ 图片预览
点击图片可放大查看，支持 PNG、JPG、GIF、SVG 等格式。

### 📋 代码复制
悬停代码块可看到复制按钮，一键复制代码内容。

### ⌨️ 快捷键支持
按 \`Ctrl+/\` 或 \`F1\` 查看所有快捷键。

## 快速开始

1. 点击左上角的 **📂 打开文件** 按钮选择 .md 文件
2. 或直接将 .md 文件 **拖拽** 到窗口中
3. 使用 **📑 目录** 按钮查看文档大纲
4. 按 **🔍 搜索** 或 \`Ctrl+F\` 搜索内容

## 开始使用

打开一个 Markdown 文件开始阅读，或查看最近打开的文件。
`

function getInitialContent() {
  const stored = localStorage.getItem(LAST_FILE_KEY)
  if (stored) {
    try {
      const { content, name } = JSON.parse(stored)
      if (content && name) {
        return { content, name, isRestored: true }
      }
    } catch {
      // ignore
    }
  }
  return { content: welcomeContent, name: '欢迎使用.md', isRestored: false }
}

function App() {
  const initial = getInitialContent()
  const [content, setContent] = useState(initial.content)
  const [filename, setFilename] = useState(initial.name)
  const [showOutline, setShowOutline] = useState(!initial.isRestored)
  const [showSearch, setShowSearch] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [showFileSidebar, setShowFileSidebar] = useState(false)
  const [currentFolderHandle, setCurrentFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [currentFolderName, setCurrentFolderName] = useState<string>('')
  const [currentFilePath, setCurrentFilePath] = useState<string>('')
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [fontSize, setFontSize] = useState(16)
  const [showFileInfo, setShowFileInfo] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; lastModified: number } | null>(null)
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeen = localStorage.getItem(HAS_SEEN_GUIDE_KEY)
    return !hasSeen && !initial.isRestored
  })
  const [lastFolderName] = useState<string | null>(() => {
    return localStorage.getItem(LAST_FOLDER_KEY)
  })
  const markdownRef = useRef<MarkdownRendererRef>(null)
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(filename)

  useEffect(() => {
    setRecentFiles(getRecentFiles())
  }, [])

  useEffect(() => {
    if (!initial.isRestored) return
    const recent = getRecentFiles()
    const exists = recent.some(f => f.name === filename)
    if (!exists) {
      addRecentFile({ name: filename, content })
      setRecentFiles(getRecentFiles())
    }
  }, [])

  const outlineItems = useOutline(content)
  const outlineIds = outlineItems.map(item => item.id)
  const activeHeadingId = useScrollSpy(outlineIds)
  const currentHeading = useMemo(() => {
    const activeItem = outlineItems.find(item => item.id === activeHeadingId)
    return activeItem?.text || ''
  }, [outlineItems, activeHeadingId])
  const {
    query,
    setQuery,
    isRegex,
    setIsRegex,
    matches,
    currentMatch,
    nextMatch,
    prevMatch,
    clearSearch
  } = useSearch(content)

  const handleFileOpen = (fileContent: string, name: string, file?: File) => {
    setContent(fileContent)
    setFilename(name)
    addRecentFile({ name, content: fileContent })
    setRecentFiles(getRecentFiles())
    localStorage.setItem(LAST_FILE_KEY, JSON.stringify({ content: fileContent, name }))
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      })
    } else {
      setFileInfo({
        name,
        size: new Blob([fileContent]).size,
        lastModified: Date.now()
      })
    }
  }

  const handleRecentSelect = (file: RecentFile) => {
    setContent(file.content)
    setFilename(file.name)
    setShowRecent(false)
    localStorage.setItem(LAST_FILE_KEY, JSON.stringify({ content: file.content, name: file.name }))
  }

  const handleOpenFolder = async () => {
    if (!window.showDirectoryPicker) {
      alert('您的浏览器不支持打开文件夹功能，请使用 Chrome 或 Edge 浏览器')
      return
    }
    try {
      const handle = await window.showDirectoryPicker()
      const { addFolderBookmark, getFilesInFolder } = await import('./utils/folderBookmarks')
      await addFolderBookmark(handle.name, handle as unknown as FileSystemDirectoryHandle)
      
      const files = await getFilesInFolder(handle as unknown as FileSystemDirectoryHandle)
      if (files.length > 0) {
        const firstFile = files[0]
        const content = await firstFile.file.text()
        handleFileOpen(content, firstFile.name)
        setCurrentFolderHandle(handle as unknown as FileSystemDirectoryHandle)
        setCurrentFolderName(handle.name)
        localStorage.setItem(LAST_FOLDER_KEY, handle.name)
        setShowFileSidebar(true)
      }
    } catch {
      // User cancelled
    }
  }

  const handleRestoreFolder = async () => {
    if (!window.showDirectoryPicker) return
    try {
      const handle = await window.showDirectoryPicker()
      const { getFilesInFolder } = await import('./utils/folderBookmarks')
      const files = await getFilesInFolder(handle as unknown as FileSystemDirectoryHandle)
      if (files.length > 0) {
        const firstFile = files[0]
        const content = await firstFile.file.text()
        handleFileOpen(content, firstFile.name)
        setCurrentFolderHandle(handle as unknown as FileSystemDirectoryHandle)
        setCurrentFolderName(handle.name)
        localStorage.setItem(LAST_FOLDER_KEY, handle.name)
        setShowFileSidebar(true)
      }
    } catch {
      // User cancelled
    }
  }

  const handleFolderFileSelect = (fileContent: string, fileName: string, filePath: string) => {
    handleFileOpen(fileContent, fileName)
    setCurrentFilePath(filePath)
  }

  const handleCloseFileSidebar = () => {
    setShowFileSidebar(false)
    setCurrentFolderHandle(null)
    setCurrentFolderName('')
    setCurrentFilePath('')
  }

  const handleOutlineClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleBookmarkNavigate = (heading: string) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    for (const h of headings) {
      if (h.textContent === heading || h.textContent?.startsWith(heading)) {
        h.scrollIntoView({ behavior: 'smooth' })
        break
      }
    }
  }

  const handleCloseSearch = () => {
    clearSearch()
    setShowSearch(false)
  }

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        return
      }

      const fileContent = await file.text()
      handleFileOpen(fileContent, file.name)
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  useEffect(() => {
    if (showFocusMode) {
      document.body.classList.add('focus-mode')
    } else {
      document.body.classList.remove('focus-mode')
    }
    return () => document.body.classList.remove('focus-mode')
  }, [showFocusMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setFontSize(prev => Math.min(prev + 2, 32))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setFontSize(prev => Math.max(prev - 2, 12))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        setShowSource(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        window.print()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        setShowQuickSwitcher(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setShowFocusMode(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      if (e.key === 'F1') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
      if (e.key === 'Escape') {
        if (showSearch) {
          handleCloseSearch()
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false)
        } else if (showFocusMode) {
          setShowFocusMode(false)
        } else if (showQuickSwitcher) {
          setShowQuickSwitcher(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch, showKeyboardShortcuts, showFocusMode, showQuickSwitcher])

  return (
    <ThemeProvider>
      <ProgressBar />
      <div className="app">
        <header style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <FileOpener onFileOpen={handleFileOpen} />
            <button 
              onClick={() => setShowRecent(!showRecent)}
              data-guide="recent-files"
              style={{
                background: showRecent ? 'var(--accent)' : 'transparent',
                color: showRecent ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="最近打开 (Ctrl+Shift+R)"
            >
              📜
            </button>
            <button 
              onClick={handleOpenFolder}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="打开文件夹"
            >
              📂
            </button>
            {lastFolderName && !currentFolderHandle && (
              <button 
                onClick={handleRestoreFolder}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: '1px solid var(--accent)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                data-tooltip={`恢复上次文件夹: ${lastFolderName}`}
              >
                恢复 {lastFolderName.slice(0, 8)}...
              </button>
            )}
            {currentFolderHandle && (
              <button 
                onClick={() => setShowFileSidebar(!showFileSidebar)}
                style={{
                  background: showFileSidebar ? 'var(--accent)' : 'transparent',
                  color: showFileSidebar ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                data-tooltip="文件列表"
              >
                📋
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={filename}>
              {filename}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={() => setShowOutline(!showOutline)}
              data-guide="outline"
              style={{
                background: showOutline ? 'var(--accent)' : 'transparent',
                color: showOutline ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="目录"
            >
              📑
            </button>
            <button 
              onClick={() => setShowSearch(true)}
              data-guide="search"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="搜索 (Ctrl+F)"
            >
              🔍
            </button>
            <button 
              onClick={() => setShowSource(!showSource)}
              data-guide="source"
              style={{
                background: showSource ? 'var(--accent)' : 'transparent',
                color: showSource ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="源码 (Ctrl+S)"
            >
              📄
            </button>
            <button 
              onClick={() => setShowFocusMode(!showFocusMode)}
              data-guide="focus-mode"
              style={{
                background: showFocusMode ? 'var(--accent)' : 'transparent',
                color: showFocusMode ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              data-tooltip="专注模式 (Ctrl+.)"
            >
              👁️
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} data-guide="font-size">
              <button 
                onClick={() => setFontSize(prev => Math.max(prev - 2, 12))}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
                data-tooltip="缩小"
              >
                A-
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'center' }}>
                {fontSize}
              </span>
              <button 
                onClick={() => setFontSize(prev => Math.min(prev + 2, 32))}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
                data-tooltip="放大"
              >
                A+
              </button>
            </div>
            <button 
              onClick={() => setShowKeyboardShortcuts(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="快捷键 (Ctrl+/)"
            >
              ⌨️
            </button>
            <button 
              onClick={() => setShowFileInfo(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}
              data-tooltip="文件信息"
            >
              ℹ️
            </button>
            <BookmarkPanel
              bookmarks={bookmarks}
              onAdd={addBookmark}
              onRemove={removeBookmark}
              onNavigate={handleBookmarkNavigate}
              currentHeading={currentHeading}
            />
            <ThemeToggle />
          </div>
        </header>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {showFileSidebar && currentFolderHandle && (
            <SidebarFileExplorer
              folderName={currentFolderName}
              handle={currentFolderHandle}
              currentFilePath={currentFilePath}
              onFileSelect={handleFolderFileSelect}
              onClose={handleCloseFileSidebar}
            />
          )}
          <main style={{ 
            flex: 1, 
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            fontSize: `${fontSize}px`
          }}>
            {showSource ? (
              <pre style={{ 
                padding: '20px', 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}>
                {content}
              </pre>
            ) : (
              <MarkdownRenderer 
                ref={markdownRef}
                content={content}
                searchQuery={query}
                searchRegex={isRegex}
              />
            )}
          </main>
          {showOutline && !showSource && (
            <Outline items={outlineItems} activeId={activeHeadingId} onItemClick={handleOutlineClick} />
          )}
        </div>
        <StatusBar content={content} />
        {showRecent && (
          <RecentFiles 
            files={recentFiles}
            onSelect={handleRecentSelect}
            onClose={() => setShowRecent(false)}
          />
        )}
        {showSearch && (
          <SearchBox 
            query={query}
            isRegex={isRegex}
            matches={matches.length}
            currentMatch={currentMatch}
            onQueryChange={setQuery}
            onRegexChange={setIsRegex}
            onNext={nextMatch}
            onPrev={prevMatch}
            onClose={handleCloseSearch}
          />
        )}
        {showKeyboardShortcuts && (
          <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
        )}
        {showGuide && (
          <FirstUseGuide 
            onComplete={() => {
              localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true')
              setShowGuide(false)
            }}
            onSkip={() => {
              localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true')
              setShowGuide(false)
            }}
          />
        )}
        {showQuickSwitcher && (
          <QuickSwitcher
            recentFiles={recentFiles}
            onFileSelect={(content, name) => {
              handleFileOpen(content, name)
              setShowQuickSwitcher(false)
            }}
            onClose={() => setShowQuickSwitcher(false)}
          />
        )}
        {showFileInfo && (
          <FileInfoPanel
            fileInfo={fileInfo}
            onClose={() => setShowFileInfo(false)}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
