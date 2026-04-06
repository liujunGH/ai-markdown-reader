export interface Tab {
  id: string
  name: string
  content: string
  filePath?: string
  file?: File
  isModified?: boolean
}

export function createTab(name: string, content: string, filePath?: string, file?: File): Tab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    content,
    filePath,
    file,
    isModified: false
  }
}

export function getWelcomeTab(): Tab {
  const welcomeContent = `# 欢迎使用 AI Markdown Reader

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

### 📝 代码高亮
支持 JavaScript、TypeScript、Python、Go 等多种编程语言的语法高亮。

### 🔢 数学公式
支持 KaTeX 数学公式渲染，行内公式使用 \`$...$\`，块级公式使用 \`$$...$$\`。

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

### ⌨️ 快捷键支持
按 \`Ctrl+/\` 或 \`F1\` 查看所有快捷键。

## 快速开始

1. 点击左上角的 **📂 打开文件** 按钮选择 .md 文件
2. 或直接将 .md 文件 **拖拽** 到窗口中
3. 使用 **📑 目录** 按钮查看文档大纲
4. 按 **🔍 搜索** 或 \`Ctrl+F\` 搜索内容
`

  return createTab('欢迎使用.md', welcomeContent)
}
