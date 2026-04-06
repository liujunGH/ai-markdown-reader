import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'

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

## 链接和图片

[访问 Google](https://www.google.com)

---

**加粗** 和 *斜体* 以及 ~~删除线~~

行内代码：\`const x = 1\`
`

function App() {
  const [content, setContent] = useState(testContent)
  const [filename, setFilename] = useState('欢迎阅读.md')

  const handleFileOpen = (fileContent: string, name: string) => {
    setContent(fileContent)
    setFilename(name)
  }

  return (
    <ThemeProvider>
      <div className="app">
        <header style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <FileOpener onFileOpen={handleFileOpen} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {filename}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <MarkdownRenderer content={content} />
      </div>
    </ThemeProvider>
  )
}

export default App
