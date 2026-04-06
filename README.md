# AI Markdown Reader

一款沉浸式的 Markdown 阅读器，支持丰富的功能特性，让阅读 Markdown 文档成为一种享受。

![Theme Preview](https://img.shields.io/badge/Theme-Light%20%7C%20Dark%20%7C%20Sepia-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 功能特性

### 沉浸式阅读
- **专注模式** - 隐藏所有界面元素，只保留内容，带来沉浸式阅读体验
- **滚动高亮** - 目录自动跟踪当前阅读位置

### 主题支持
- **浅色模式** - 清晰的白色背景
- **深色模式** - 舒适的深色背景
- **护眼模式** - 米黄色纸张风格，减少眼睛疲劳
- **自定义主题色** - 6 种预设强调色可选

### 强大的编辑辅助
- **Mermaid 图表** - 支持流程图、时序图、甘特图等
- **KaTeX 数学公式** - 行内公式 `$...$`，块级公式 `$$...$$`
- **代码高亮** - 多语言支持，可切换高亮主题
- **Emoji 支持** - 冒号语法自动转换为 Emoji

### 文件管理
- **文件关联** - 双击 .md 文件直接用此应用打开
- **文件夹浏览** - 侧边栏树形目录导航
- **最近文件** - 快速访问最近打开的文档
- **快速切换器** - `Ctrl+O` 快速切换文件

### 搜索功能
- **内容搜索** - `Ctrl+F` 快速查找
- **正则支持** - 支持正则表达式搜索
- **高亮显示** - 搜索结果高亮标记

### 快捷键支持
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + F` | 搜索 |
| `Ctrl + O` | 快速切换器 |
| `Ctrl + .` | 专注模式 |
| `Ctrl + /` | 快捷键帮助 |
| `Ctrl + S` | 切换源码视图 |
| `Ctrl + P` | 打印 |
| `Ctrl + +/-` | 调整字体大小 |
| `F1` | 快捷键帮助 |
| `F11` | 全屏 |

## 安装

### Windows
下载 `AI Markdown Reader-1.0.0-Setup.exe` 并运行安装程序。

### macOS
下载 `AI Markdown Reader-1.0.0.dmg` 并拖入应用程序文件夹。

### Linux
下载 `AI Markdown Reader-1.0.0.AppImage` 并添加执行权限。

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 Web 版本
npm run build

# 打包桌面应用
npm run electron:build      # Windows
npm run electron:build:mac  # macOS
npm run electron:build:linux # Linux
```

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **Markdown**: markdown-it
- **代码高亮**: Prism.js
- **图表**: Mermaid
- **数学公式**: KaTeX
- **桌面打包**: Electron

## 项目结构

```
ai-markdown-reader/
├── src/
│   ├── components/     # React 组件
│   ├── context/        # React Context
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   └── styles/         # 全局样式
├── electron/           # Electron 主进程
└── release/            # 构建输出
```

## License

MIT
