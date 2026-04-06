# Markdown 阅读器实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款类 Typora 的沉浸式 Markdown 阅读器，支持多平台（MVP 为 Web 版）

**Architecture:** 
- 使用 Vite + React 18 + TypeScript 构建前端应用
- markdown-it 作为 Markdown 解析核心
- 组件化架构，每个功能模块独立组件
- 主题系统支持浅色/深色模式

**Tech Stack:** React 18, TypeScript, Vite, markdown-it, Prism.js, KaTeX, Mermaid.js, CSS Modules

---

## Chunk 1: 项目初始化

### Task 1.1: 初始化 Vite + React + TypeScript 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ai-markdown-reader",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "markdown-it": "^14.0.0",
    "prismjs": "^1.29.0",
    "katex": "^0.16.9",
    "mermaid": "^10.6.0"
  },
  "devDependencies": {
    "@types/markdown-it": "^14.0.0",
    "@types/prismjs": "^1.26.3",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```

- [ ] **Step 2: 创建 TypeScript 配置**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 Vite 配置**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown Reader</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 6: 创建 src/App.tsx**

```tsx
function App() {
  return <div className="app">Markdown Reader</div>
}

export default App
```

- [ ] **Step 7: 创建 src/styles/global.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}
```

- [ ] **Step 8: 安装依赖并验证项目运行**

Run: `npm install && npm run dev`
Expected: Vite dev server starts on localhost:5173

---

## Chunk 2: 主题系统

### Task 2.1: 创建 Theme Context 和样式系统

**Files:**
- Create: `src/context/ThemeContext.tsx`
- Create: `src/styles/themes/light.css`
- Create: `src/styles/themes/dark.css`
- Create: `src/components/ThemeToggle/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 创建 ThemeContext.tsx**

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

- [ ] **Step 2: 创建 light.css**

```css
:root,
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #0066cc;
  --border: #e5e5e5;
}
```

- [ ] **Step 3: 创建 dark.css**

```css
[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #4da6ff;
  --border: #3d3d3d;
}
```

- [ ] **Step 4: 更新 global.css 使用 CSS 变量**

```css
:root,
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #0066cc;
  --border: #e5e5e5;
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #4da6ff;
  --border: #3d3d3d;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.2s, color 0.2s;
}
```

- [ ] **Step 5: 创建 ThemeToggle 组件**

```tsx
import { useTheme } from '../../context/ThemeContext'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button 
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

- [ ] **Step 6: 创建 ThemeToggle.module.css**

```css
.toggle {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.toggle:hover {
  background: var(--bg-secondary);
}
```

- [ ] **Step 7: 更新 App.tsx 使用主题系统**

```tsx
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <header>
          <ThemeToggle />
        </header>
        <main>Markdown Reader</main>
      </div>
    </ThemeProvider>
  )
}

export default App
```

- [ ] **Step 8: 验证主题切换**

Run: `npm run dev`
Expected: 点击按钮可切换浅色/深色主题，页面背景色平滑过渡

---

## Chunk 3: Markdown 渲染核心

### Task 3.1: 创建 Markdown 渲染器组件

**Files:**
- Create: `src/utils/markdownParser.ts`
- Create: `src/components/MarkdownRenderer/index.tsx`
- Create: `src/components/MarkdownRenderer/MarkdownRenderer.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 markdownParser.ts 工具函数**

```typescript
import MarkdownIt from 'markdown-it'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-yaml'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(str, Prism.languages[lang], lang)
      } catch {}
    }
    return ''
  }
})

export function parseMarkdown(content: string): string {
  return md.render(content)
}

export default md
```

- [ ] **Step 2: 创建 MarkdownRenderer 组件**

```tsx
import { useMemo } from 'react'
import { parseMarkdown } from '../../utils/markdownParser'
import styles from './MarkdownRenderer.module.css'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  const html = useMemo(() => parseMarkdown(content), [content])
  
  return (
    <div 
      className={styles.renderer}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 3: 创建 MarkdownRenderer 样式**

```css
.renderer {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px;
}

.renderer h1 {
  font-size: 2em;
  margin: 0.67em 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}

.renderer h2 {
  font-size: 1.5em;
  margin: 0.83em 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}

.renderer h3 {
  font-size: 1.25em;
  margin: 1em 0;
}

.renderer p {
  margin: 1em 0;
}

.renderer a {
  color: var(--accent);
}

.renderer code {
  background: var(--bg-tertiary);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
}

.renderer pre {
  background: var(--bg-tertiary);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.renderer pre code {
  background: none;
  padding: 0;
}

.renderer blockquote {
  border-left: 3px solid var(--accent);
  margin: 1em 0;
  padding: 0.5em 1em;
  color: var(--text-secondary);
}

.renderer ul,
.renderer ol {
  margin: 1em 0;
  padding-left: 2em;
}

.renderer li {
  margin: 0.5em 0;
}

.renderer table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.renderer th,
.renderer td {
  border: 1px solid var(--border);
  padding: 8px 12px;
}

.renderer th {
  background: var(--bg-tertiary);
}

.renderer img {
  max-width: 100%;
  height: auto;
}

.renderer hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}
```

- [ ] **Step 4: 更新 App.tsx 添加测试内容**

```tsx
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer } from './components/MarkdownRenderer'

const testContent = `
# Markdown Reader

这是一个测试文档。

## 代码示例

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

## 列表

- 列表项 1
- 列表项 2
- 列表项 3

## 引用

> 这是一段引用文字

## 表格

| 名称 | 描述 |
|------|------|
| 项目1 | 说明1 |
| 项目2 | 说明2 |
`

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <header style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <ThemeToggle />
        </header>
        <MarkdownRenderer content={testContent} />
      </div>
    </ThemeProvider>
  )
}

export default App
```

- [ ] **Step 5: 验证 Markdown 渲染**

Run: `npm run dev`
Expected: 页面显示渲染后的 Markdown 内容，包括标题、代码高亮、列表、引用、表格

---

## Chunk 4: 文件打开功能

### Task 4.1: 实现打开本地文件功能

**Files:**
- Create: `src/components/FileOpener/index.tsx`
- Create: `src/components/FileOpener/FileOpener.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 FileOpener 组件**

```tsx
import { useRef } from 'react'
import styles from './FileOpener.module.css'

interface Props {
  onFileOpen: (content: string, filename: string) => void
}

export function FileOpener({ onFileOpen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const content = await file.text()
    onFileOpen(content, file.name)
    
    // 清空 input 以允许再次选择同一文件
    e.target.value = ''
  }

  return (
    <button className={styles.button} onClick={handleClick}>
      📂 打开文件
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </button>
  )
}
```

- [ ] **Step 2: 创建 FileOpener 样式**

```css
.button {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.button:hover {
  opacity: 0.9;
}
```

- [ ] **Step 3: 更新 App.tsx 添加状态管理**

```tsx
import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'

const testContent = `
# Markdown Reader

这是一个测试文档。
`

function App() {
  const [content, setContent] = useState(testContent)
  const [filename, setFilename] = useState('未命名.md')

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
```

- [ ] **Step 4: 验证文件打开功能**

Run: `npm run dev`
Expected: 点击"打开文件"按钮可选择 .md 文件，文件内容显示在阅读器中

---

## Chunk 5: 代码高亮增强

### Task 5.1: 添加更多语言支持和完善代码块组件

**Files:**
- Modify: `src/utils/markdownParser.ts`
- Create: `src/components/CodeBlock/index.tsx`
- Create: `src/components/CodeBlock/CodeBlock.module.css`
- Modify: `src/components/MarkdownRenderer/index.tsx`

- [ ] **Step 1: 更新 markdownParser.ts 添加更多语言**

```typescript
import MarkdownIt from 'markdown-it'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-shell-session'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-html'
import 'prismjs/components/prism-xml-doc'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-regex'
import 'prismjs/components/prism-objectivec'
import 'prismjs/components/prism-scala'
import 'prismjs/components/prism-haskell'
import 'prismjs/components/prism-lua'
import 'prismjs/components/prism-perl'
import 'prismjs/components/prism-r'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && Prism.languages[lang]) {
      try {
        const highlighted = Prism.highlight(str, Prism.languages[lang], lang)
        return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`
      } catch {}
    }
    // 无语言或语言不支持，返回普通代码块
    const escaped = md.utils.escapeHtml(str)
    return `<pre class="language-text"><code class="language-text">${escaped}</code></pre>`
  }
})

export function parseMarkdown(content: string): string {
  return md.render(content)
}

export { md }
```

- [ ] **Step 2: 创建 CodeBlock 组件（带复制按钮）**

```tsx
import { useState } from 'react'
import styles from './CodeBlock.module.css'

interface Props {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'text' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.language}>{language}</span>
        <button className={styles.copyButton} onClick={handleCopy}>
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
      <pre className={styles.pre}>
        <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: code }} />
      </pre>
    </div>
  )
}
```

- [ ] **Step 3: 创建 CodeBlock 样式**

```css
.container {
  position: relative;
  margin: 1em 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.language {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.copyButton {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
}

.copyButton:hover {
  background: var(--bg-tertiary);
}

.pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: var(--bg-tertiary);
}

.pre code {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
}

/* Prism.js 主题覆盖 */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #6a9955;
}

.token.punctuation {
  color: #d4d4d4;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  color: #b5cea8;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #ce9178;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #d4d4d4;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #569cd6;
}

.token.function,
.token.class-name {
  color: #dcdcaa;
}

.token.regex,
.token.important,
.token.variable {
  color: #d16969;
}
```

- [ ] **Step 4: 验证代码高亮和复制功能**

Run: `npm run dev`
Expected: 代码块显示语法高亮，右上角显示语言标签和复制按钮

---

## Chunk 6: 大纲视图和目录导航

### Task 6.1: 实现大纲视图组件

**Files:**
- Create: `src/hooks/useOutline.ts`
- Create: `src/components/Outline/index.tsx`
- Create: `src/components/Outline/Outline.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 useOutline Hook**

```typescript
import { useMemo } from 'react'

export interface OutlineItem {
  level: number
  text: string
  id: string
}

export function useOutline(content: string): OutlineItem[] {
  return useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const items: OutlineItem[] = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      items.push({ level, text, id })
    }

    return items
  }, [content])
}
```

- [ ] **Step 2: 创建 Outline 组件**

```tsx
import { OutlineItem } from '../../hooks/useOutline'
import styles from './Outline.module.css'

interface Props {
  items: OutlineItem[]
  onItemClick: (id: string) => void
}

export function Outline({ items, onItemClick }: Props) {
  if (items.length === 0) {
    return <div className={styles.empty}>暂无目录</div>
  }

  return (
    <nav className={styles.outline}>
      <div className={styles.title}>目录</div>
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li
            key={index}
            className={styles.item}
            style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
          >
            <button 
              className={styles.link}
              onClick={() => onItemClick(item.id)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 3: 创建 Outline 样式**

```css
.outline {
  width: 240px;
  border-left: 1px solid var(--border);
  padding: 16px;
  background: var(--bg-secondary);
  height: 100%;
  overflow-y: auto;
}

.title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item {
  margin: 4px 0;
}

.link {
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  width: 100%;
  display: block;
}

.link:hover {
  background: var(--bg-tertiary);
  color: var(--accent);
}

.empty {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 16px;
  text-align: center;
}
```

- [ ] **Step 4: 更新 App.tsx 集成大纲视图**

```tsx
import { useRef } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { FileOpener } from './components/FileOpener'
import { Outline } from './components/Outline'
import { useOutline } from './hooks/useOutline'

const testContent = `
# Markdown Reader

这是一个测试文档。

## 代码示例

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

## 列表

- 列表项 1
- 列表项 2
- 列表项 3

### 子列表

内容...

## 引用

> 这是一段引用文字

### 引用子节

更多内容...
`

function App() {
  const [content, setContent] = useState(testContent)
  const [filename, setFilename] = useState('未命名.md')
  const [showOutline, setShowOutline] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

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

  return (
    <ThemeProvider>
      <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <header style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
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
                cursor: 'pointer'
              }}
            >
              📑 目录
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {filename}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <main 
            ref={contentRef}
            style={{ 
              flex: 1, 
              overflowY: 'auto',
              background: 'var(--bg-primary)'
            }}
          >
            <MarkdownRenderer content={content} />
          </main>
          {showOutline && (
            <Outline items={outlineItems} onItemClick={handleOutlineClick} />
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
```

- [ ] **Step 5: 验证大纲视图**

Run: `npm run dev`
Expected: 
- 右侧显示目录面板
- 点击目录项页面滚动到对应章节
- 可通过按钮切换目录显示/隐藏

---

## Chunk 7: 文件内搜索

### Task 7.1: 实现搜索功能

**Files:**
- Create: `src/components/SearchBox/index.tsx`
- Create: `src/components/SearchBox/SearchBox.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 SearchBox 组件**

```tsx
import { useState, useEffect, useRef } from 'react'
import styles from './SearchBox.module.css'

interface Props {
  onSearch: (query: string, isRegex: boolean) => void
  onClose: () => void
}

export function SearchBox({ onSearch, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    onSearch(query, isRegex)
  }, [query, isRegex, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <span className={styles.icon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="搜索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>
      <label className={styles.regexLabel}>
        <input
          type="checkbox"
          checked={isRegex}
          onChange={(e) => setIsRegex(e.target.checked)}
        />
        正则表达式
      </label>
    </div>
  )
}
```

- [ ] **Step 2: 创建 SearchBox 样式**

```css
.container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 400px;
}

.inputWrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 12px;
}

.icon {
  font-size: 14px;
  opacity: 0.6;
}

.input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.input::placeholder {
  color: var(--text-secondary);
}

.closeButton {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 4px;
}

.closeButton:hover {
  color: var(--text-primary);
}

.regexLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.regexLabel input {
  cursor: pointer;
}
```

- [ ] **Step 3: 更新 App.tsx 添加搜索功能**

```tsx
// ... existing imports

function App() {
  // ... existing state
  
  const [showSearch, setShowSearch] = useState(false)
  
  // ... existing handlers

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  const handleSearch = (query: string, isRegex: boolean) => {
    // 搜索实现逻辑
    console.log('Searching:', query, isRegex)
  }

  return (
    <ThemeProvider>
      {/* ... existing JSX */}
      {showSearch && (
        <SearchBox 
          onSearch={handleSearch} 
          onClose={() => setShowSearch(false)} 
        />
      )}
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: 验证搜索功能**

Run: `npm run dev`
Expected: 按 `Ctrl/Cmd + F` 弹出搜索框，可输入搜索内容

---

## Chunk 8: Mermaid 流程图支持

### Task 8.1: 集成 Mermaid.js

**Files:**
- Create: `src/components/MermaidDiagram/index.tsx`
- Create: `src/components/MermaidDiagram/MermaidDiagram.module.css`
- Modify: `src/utils/markdownParser.ts`

- [ ] **Step 1: 更新 markdownParser.ts 支持 Mermaid 代码块**

```typescript
import MarkdownIt from 'markdown-it'
import Prism from 'prismjs'
// ... existing prism imports

// Mermaid 识别
const mermaid fence 语法

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang === 'mermaid') {
      // 返回占位符，Mermaid 组件会在 DOM 中渲染
      const encoded = Buffer.from(str).toString('base64')
      return `<div class="mermaid-code" data-content="${encoded}"></div>`
    }
    if (lang && Prism.languages[lang]) {
      // ... existing prism code
    }
    return `<pre class="language-text"><code class="language-text">${md.utils.escapeHtml(str)}</code></pre>`
  }
})
```

- [ ] **Step 2: 创建 MermaidDiagram 组件**

```tsx
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import styles from './MermaidDiagram.module.css'

interface Props {
  code: string
}

export function MermaidDiagram({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    })

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        setSvg(svg)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '渲染失败')
      }
    }

    renderDiagram()
  }, [code])

  if (error) {
    return (
      <div className={styles.error}>
        <span>❌ Mermaid 渲染错误</span>
        <pre>{error}</pre>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
```

- [ ] **Step 3: 创建 MermaidDiagram 样式**

```css
.container {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin: 1em 0;
  overflow-x: auto;
}

.container svg {
  max-width: 100%;
  height: auto;
}

.error {
  background: #fff0f0;
  border: 1px solid #ffcccc;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
  color: #cc0000;
}

.error pre {
  margin-top: 8px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
```

- [ ] **Step 4: 创建 MermaidRenderer 组件处理页面中所有 Mermaid 代码块**

```tsx
import { useEffect, useState } from 'react'
import { MermaidDiagram } from './MermaidDiagram'

export function MermaidRenderer() {
  const [diagrams, setDiagrams] = useState<{ id: string; code: string }[]>([])

  useEffect(() => {
    const elements = document.querySelectorAll('.mermaid-code')
    const diagrams = Array.from(elements).map((el) => {
      const content = atob(el.getAttribute('data-content') || '')
      return {
        id: `mermaid-${Math.random().toString(36).substr(2, 9)}`,
        code: content
      }
    })
    setDiagrams(diagrams)

    // 隐藏原始代码块
    elements.forEach((el) => {
      (el as HTMLElement).style.display = 'none'
    })
  }, [])

  if (diagrams.length === 0) return null

  return (
    <div className="mermaid-renderer">
      {diagrams.map((diagram) => (
        <MermaidDiagram key={diagram.id} code={diagram.code} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 更新 App.tsx 添加 Mermaid 支持**

```tsx
import { MermaidRenderer } from './components/MermaidDiagram/MermaidRenderer'

function App() {
  // ... existing code

  return (
    <ThemeProvider>
      {/* ... */}
      <main>
        <MarkdownRenderer content={content} />
        <MermaidRenderer />
      </main>
      {/* ... */}
    </ThemeProvider>
  )
}
```

- [ ] **Step 6: 验证 Mermaid 渲染**

Run: `npm run dev`
Expected: Mermaid 代码块被渲染为流程图

---

## Chunk 9: 其他功能（字数统计、进度条、全屏等）

### Task 9.1: 添加字数统计和状态栏

**Files:**
- Create: `src/components/StatusBar/index.tsx`
- Create: `src/components/StatusBar/StatusBar.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 StatusBar 组件**

```tsx
import { useMemo } from 'react'
import styles from './StatusBar.module.css'

interface Props {
  content: string
}

export function StatusBar({ content }: Props) {
  const stats = useMemo(() => {
    const chars = content.length
    const words = content.trim().split(/\s+/).filter(Boolean).length
    const lines = content.split('\n').length
    const readingTime = Math.ceil(words / 200) // 假设阅读速度 200 字/分钟
    return { chars, words, lines, readingTime }
  }, [content])

  return (
    <footer className={styles.statusBar}>
      <span>{stats.chars} 字符</span>
      <span>{stats.words} 字</span>
      <span>{stats.lines} 行</span>
      <span>约 {stats.readingTime} 分钟阅读</span>
    </footer>
  )
}
```

- [ ] **Step 2: 创建 StatusBar 样式**

```css
.statusBar {
  display: flex;
  gap: 24px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}

.statusBar span {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

- [ ] **Step 3: 更新 App.tsx 添加 StatusBar**

```tsx
// ... in App.tsx

return (
  <ThemeProvider>
    <div className="app">
      {/* ... header and main ... */}
      <StatusBar content={content} />
    </div>
  </ThemeProvider>
)
```

### Task 9.2: 添加阅读进度条

**Files:**
- Create: `src/components/ProgressBar/index.tsx`
- Create: `src/components/ProgressBar/ProgressBar.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 ProgressBar 组件**

```tsx
import { useState, useEffect } from 'react'
import styles from './ProgressBar.module.css'

export function ProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollPercent)))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  )
}
```

- [ ] **Step 2: 创建 ProgressBar 样式**

```css
.container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
  z-index: 9999;
}

.bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.1s ease-out;
}
```

- [ ] **Step 3: 更新 App.tsx 添加 ProgressBar**

```tsx
return (
  <ThemeProvider>
    <ProgressBar />
    {/* ... */}
  </ThemeProvider>
)
```

### Task 9.3: 添加全屏模式

- [ ] **Step 1: 更新 App.tsx 添加全屏功能**

```tsx
const [isFullscreen, setIsFullscreen] = useState(false)

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'F11') {
      e.preventDefault()
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

---

## 后续任务

以下功能需要在后续迭代中实现：

- [ ] 拖拽打开文件
- [ ] 图片点击放大
- [ ] 外部链接新窗口打开
- [ ] 打印/导出 PDF
- [ ] 文件变更提醒
- [ ] 源码查看模式
- [ ] 数学公式 (KaTeX)
- [ ] Mermaid 导出图片
- [ ] Tauri 桌面封装

---

**计划完成日期**: 2026-04-06  
**预计实现时间**: 根据优先级分 3-4 周完成
