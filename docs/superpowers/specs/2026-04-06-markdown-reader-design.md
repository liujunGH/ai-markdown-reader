# Markdown 阅读器设计方案

**项目名称**: ai-markdown-reader  
**版本**: v1.0  
**日期**: 2026-04-06  
**状态**: 已批准

---

## 1. 项目概述

### 1.1 项目定位
一款简洁优雅的类 Typora Markdown 阅读器，专注于提供沉浸式阅读体验，支持桌面端和 Web 端运行。

### 1.2 核心特点
- 沉浸式阅读体验，最小化工具栏干扰
- 简洁现代的视觉风格
- Mermaid 流程图实时预览与导出
- 丰富的阅读辅助功能

### 1.3 目标用户
- 程序员：阅读技术文档、API 文档
- 学生/研究者：阅读论文笔记、技术博客
- 写作者：预览 Markdown 格式文档

---

## 2. 技术架构

### 2.1 技术栈

| 层次 | 技术选型 | 说明 |
|------|----------|------|
| 核心框架 | React 18 + TypeScript | 类型安全，组件化开发 |
| 构建工具 | Vite | 快速开发体验 |
| Markdown 解析 | markdown-it | 插件丰富，支持扩展 |
| 代码高亮 | Prism.js | 成熟稳定，主题多样 |
| 数学公式 | KaTeX | 高性能 LaTeX 渲染 |
| 流程图 | Mermaid.js | flowcharts, sequence, gantt 等 |
| 状态管理 | React Context / Zustand | 轻量级状态管理 |
| 样式方案 | CSS Modules / Tailwind CSS | 组件化样式 |
| 桌面封装 | Tauri | 轻量、安全、跨平台 |

### 2.2 项目结构

```
ai-markdown-reader/
├── src/
│   ├── components/           # React 组件
│   │   ├── MarkdownReader/   # 核心阅读器组件
│   │   │   ├── index.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   └── styles.css
│   │   ├── Sidebar/          # 文件列表侧边栏
│   │   │   ├── FileTree.tsx
│   │   │   └── RecentFiles.tsx
│   │   ├── Outline/          # 大纲/目录视图
│   │   │   └── index.tsx
│   │   ├── SearchBox/         # 文件内搜索
│   │   │   └── index.tsx
│   │   ├── ImagePreview/      # 图片点击放大
│   │   │   └── index.tsx
│   │   ├── CodeBlock/         # 代码块（带复制）
│   │   │   └── index.tsx
│   │   ├── MermaidDiagram/    # Mermaid 流程图
│   │   │   ├── index.tsx
│   │   │   └── ExportButton.tsx
│   │   ├── ProgressBar/       # 阅读进度条
│   │   │   └── index.tsx
│   │   ├── StatusBar/         # 状态栏（字数统计）
│   │   │   └── index.tsx
│   │   └── ThemeToggle/       # 主题切换
│   │       └── index.tsx
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useFileOpen.ts
│   │   ├── useTheme.ts
│   │   ├── useSearch.ts
│   │   ├── useOutline.ts
│   │   └── useReadingProgress.ts
│   ├── utils/                 # 工具函数
│   │   ├── markdownParser.ts
│   │   ├── mermaidExporter.ts
│   │   └── fileUtils.ts
│   ├── context/               # React Context
│   │   ├── AppContext.tsx
│   │   └── ThemeContext.tsx
│   ├── styles/                # 全局样式
│   │   ├── themes/
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── SPEC.md
```

---

## 3. 功能规格

### 3.1 核心功能

#### 3.1.1 文件打开
- 通过文件选择器打开本地 `.md` 文件
- 支持快捷键 `Ctrl/Cmd + O`
- 支持拖拽 `.md` 文件到窗口打开
- 显示文件列表侧边栏（可折叠）
- 记录并显示最近打开的文件

#### 3.1.2 Markdown 渲染
完整支持以下 Markdown 语法：
- 标题（h1-h6）
- 段落与换行
- 粗体、斜体、删除线
- 无序列表、有序列表、任务列表
- 链接（自动识别 URL）
- 图片（支持本地与网络图片）
- 表格
- 引用块
- 水平线
- 代码块与行内代码

#### 3.1.3 Mermaid 流程图
- 实时渲染 Mermaid 语法（flowcharts, sequence, class, state, ER, gantt 等）
- 导出为 PNG/SVG 图片
- 支持深色/浅色主题适配

### 3.2 增强功能

| # | 功能 | 快捷键 | 说明 |
|---|------|--------|------|
| 1 | 文件内搜索 | `Ctrl/Cmd + F` | 支持正则匹配，高亮搜索结果 |
| 2 | 字体大小调节 | `Ctrl/Cmd + +/-` | 调整正文字体大小 |
| 3 | 图片点击放大 | - | Lightbox 效果显示原图 |
| 4 | 复制代码块 | - | 代码块右上角复制按钮 |
| 5 | 大纲视图 | - | 侧边栏显示标题结构树 |
| 6 | 目录锚点跳转 | - | 点击目录项滚动到对应章节 |
| 7 | 代码语法高亮 | - | Prism.js 多语言支持 |
| 8 | 浅色/深色主题 | - | 一键切换，支持系统主题跟随 |
| 9 | 文件列表侧边栏 | - | 显示文件树，可折叠 |
| 10 | 数学公式 (LaTeX) | - | 行内公式 $E=mc^2$ 与块级公式 |
| 11 | 阅读进度条 | - | 顶部细线进度指示器 |
| 12 | 全屏/专注模式 | `F11` | 隐藏所有 UI，纯粹阅读 |
| 13 | 字数统计 | - | 底部状态栏显示字符/字数/阅读时间 |
| 14 | 拖拽打开文件 | - | 拖拽 .md 到窗口 |
| 15 | 外部链接新窗口 | - | 外部链接在浏览器新标签打开 |
| 16 | 打印/导出 PDF | `Ctrl/Cmd + P` | 优化打印样式 |
| 17 | 文件变更提醒 | - | 外部修改后提醒是否重载 |
| 18 | 源码查看模式 | - | 切换查看 Markdown 源码 |

### 3.3 用户交互流程

```
┌─────────────────────────────────────────────────────────┐
│                      应用启动                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                   主界面                                  │
│  ┌─────────┬────────────────────────────────┬────────┐ │
│  │ 文件列表 │         阅读区域                │ 大纲   │ │
│  │ 侧边栏   │                                │ 侧边栏 │ │
│  │          │    Markdown 渲染内容            │        │ │
│  │ - file1  │                                │ # 标题 │ │
│  │ - file2  │                                │ ## 小节│ │
│  │          │                                │        │ │
│  └─────────┴────────────────────────────────┴────────┘ │
│                    状态栏（字数统计）                      │
└─────────────────────────────────────────────────────────┘
```

### 3.4 键盘快捷键汇总

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + O` | 打开文件 |
| `Ctrl/Cmd + F` | 文件内搜索 |
| `Ctrl/Cmd + +/-` | 字体大小调节 |
| `F11` | 全屏/专注模式 |
| `Ctrl/Cmd + P` | 打印/导出 |
| `Esc` | 退出全屏/关闭弹窗 |

---

## 4. UI 设计规范

### 4.1 视觉风格
- **风格**: 简洁现代，大量留白，极简图标
- **字体**: 正文无衬线字体（Inter, -apple-system, system-ui）
- **代码**: 等宽字体（JetBrains Mono, Fira Code, monospace）
- **配色**: 低饱和度，强调内容而非装饰

### 4.2 布局规范
- **阅读区最大宽度**: 720px（居中显示）
- **侧边栏宽度**: 240px（可折叠至 48px）
- **间距系统**: 8px 基准网格
- **圆角**: 4px（小元素）, 8px（卡片/面板）

### 4.3 主题定义

#### 浅色主题
```css
--bg-primary: #ffffff;
--bg-secondary: #fafafa;
--bg-tertiary: #f5f5f5;
--text-primary: #1a1a1a;
--text-secondary: #666666;
--accent: #0066cc;
--border: #e5e5e5;
```

#### 深色主题
```css
--bg-primary: #1e1e1e;
--bg-secondary: #252526;
--bg-tertiary: #2d2d2d;
--text-primary: #e0e0e0;
--text-secondary: #a0a0a0;
--accent: #4da6ff;
--border: #3d3d3d;
```

---

## 5. 里程碑规划

### 5.1 MVP（最小可行产品）
- [ ] 项目脚手架搭建（Vite + React + TypeScript）
- [ ] Markdown 渲染核心（markdown-it）
- [ ] 代码高亮（Prism.js）
- [ ] 浅色/深色主题切换
- [ ] 打开本地文件功能

### 5.2 V1.0（正式版）
- [ ] 文件列表侧边栏
- [ ] 大纲视图
- [ ] 文件内搜索
- [ ] 字体大小调节
- [ ] 图片点击放大
- [ ] 复制代码块
- [ ] Mermaid 流程图预览

### 5.3 V1.1（增强版）
- [ ] Mermaid 导出图片
- [ ] 数学公式（KaTeX）
- [ ] 目录锚点跳转
- [ ] 阅读进度条
- [ ] 全屏/专注模式
- [ ] 字数统计

### 5.4 V1.2（完善版）
- [ ] 拖拽打开文件
- [ ] 外部链接新窗口打开
- [ ] 打印/导出 PDF
- [ ] 文件变更提醒
- [ ] 源码查看模式
- [ ] Tauri 桌面封装

---

## 6. 验收标准

### 6.1 功能验收
- [ ] 可成功打开并渲染标准 Markdown 文件
- [ ] 代码块正确语法高亮
- [ ] Mermaid 流程图正确渲染
- [ ] 主题切换正常生效
- [ ] 所有快捷键正常工作

### 6.2 性能要求
- 首屏加载 < 2s
- Markdown 渲染 < 500ms（10万字符）
- Mermaid 渲染 < 1s

### 6.3 兼容性
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 7. 风险与备选方案

| 风险 | 应对策略 |
|------|----------|
| Mermaid 渲染性能 | 懒加载 + 防抖渲染 |
| 大文件渲染卡顿 | 虚拟滚动 / 分页 |
| 跨域图片加载失败 | 显示占位图 + 错误提示 |
| PDF 导出样式问题 | 使用 puppeteer 截图方案 |

---

**文档版本**: 1.0  
**创建日期**: 2026-04-06  
**批准状态**: 已批准
