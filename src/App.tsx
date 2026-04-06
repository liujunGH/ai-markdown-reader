import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'
import { Outline } from './components/Outline'
import { SearchBox } from './components/SearchBox'
import { ProgressBar } from './components/ProgressBar'
import { StatusBar } from './components/StatusBar'
import { useOutline } from './hooks/useOutline'

const testContent = `
# Markdown Reader

这是一个测试文档，用于验证 Markdown 渲染功能。

## 代码示例

\`\`\`javascript
const hello = 'world';
console.log(hello);

function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Mermaid 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[操作1]
    B -->|否| D[操作2]
    C --> E[结束]
    D --> E
\`\`\`

## 列表

- 列表项 1
- 列表项 2
- 列表项 3

### 子列表

- 嵌套项 A
- 嵌套项 B

## 引用

> 这是一段引用文字
> 可以有多行

## 表格

| 名称 | 描述 |
|------|------|
| 项目1 | 说明1 |
| 项目2 | 说明2 |

## 任务列表

- [x] 已完成任务
- [ ] 未完成任务
- [ ] 另一个任务

## 链接

[访问 Google](https://www.google.com)

---

**加粗** 和 *斜体* 以及 ~~删除线~~

行内代码：\`const x = 1\`
`

function App() {
  const [content, setContent] = useState(testContent)
  const [filename, setFilename] = useState('欢迎阅读.md')
  const [showOutline, setShowOutline] = useState(true)
  const [showSearch, setShowSearch] = useState(false)

  const outlineItems = useOutline(content)

  const handleFileOpen = (fileContent: string, name: string) => {
    setContent(fileContent)
    setFilename(name)
  }

  const handleOutlineClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSearch = useCallback((query: string, isRegex: boolean) => {
    console.log('Searching:', query, isRegex)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  return (
    <ThemeProvider>
      <ProgressBar />
      <div className="app">
        <header style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--bg-primary)'
        }}>
          <FileOpener onFileOpen={handleFileOpen} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setShowOutline(!showOutline)}
              style={{
                background: showOutline ? 'var(--accent)' : 'transparent',
                color: showOutline ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📑 目录
            </button>
            <button 
              onClick={() => setShowSearch(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}
            >
              🔍 搜索
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {filename}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <main style={{ 
            flex: 1, 
            overflowY: 'auto',
            background: 'var(--bg-primary)'
          }}>
            <MarkdownRenderer content={content} />
          </main>
          {showOutline && (
            <Outline items={outlineItems} onItemClick={handleOutlineClick} />
          )}
        </div>
        <StatusBar content={content} />
        {showSearch && (
          <SearchBox 
            onSearch={handleSearch} 
            onClose={() => setShowSearch(false)} 
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
