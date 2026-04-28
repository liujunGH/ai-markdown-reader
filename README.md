# Markdown Reader

一款沉浸式的 Markdown 阅读器，支持丰富的功能特性，让阅读 Markdown 文档成为一种享受。

![Theme Preview](https://img.shields.io/badge/Theme-Light%20%7C%20Dark%20%7C%20Sepia-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Version](https://img.shields.io/badge/Version-1.5.0-blue)

## 功能特性

### 沉浸式阅读
- **专注模式** - 隐藏所有界面元素，只保留内容，带来沉浸式阅读体验
- **滚动高亮** - 目录自动跟踪当前阅读位置
- **阅读进度记忆** - 每个文件独立保存阅读滚动位置，切换标签无缝衔接
- **阅读统计** - 自动追踪阅读时长，生成周阅读热力图（GitHub Contribution Graph 风格）
- **阅读速度估算** - 状态栏显示预计阅读时间，进度条悬停显示剩余时间

### 多标签页
- **多文档浏览** - 同时打开多个 Markdown 文件
- **标签管理** - 右键菜单支持复制文件名、关闭标签、关闭其他、关闭全部
- **标签页拖拽** - 拖拽标签页可以重新排序
- **标签页固定（Pin）** - 固定后变小、不会被溢出淘汰、显示 📌 图标
- **标签页颜色标记** - 右键标记红/橙/黄/绿/蓝/紫，左侧彩色竖线标识
- **标签页悬停预览** - 悬停显示 Tooltip 卡片：路径、大小、修改时间、前3行预览
- **标签页数量限制** - 默认最多10个标签页，可配置
- **会话恢复** - 关闭应用后重新打开，自动恢复上次的工作标签页
- **撤销关闭标签** - `Ctrl+Shift+T` 恢复最近关闭的标签（最多记忆10个）
- **快捷键** - `Ctrl+T` 新建标签、`Ctrl+W` 关闭标签、`Ctrl+Tab` 切换标签

### 多窗口支持
- **多窗口浏览** - `Ctrl+Shift+N` 新建独立窗口，每个窗口有独立的标签页和文件夹
- **窗口状态持久化** - 自动保存窗口位置、大小、最大化/全屏状态，下次启动恢复
- **智能单实例** - 双击文件打开时，若某窗口已打开该文件，直接聚焦该窗口

### 主题支持
- **浅色模式** - 清晰的白色背景
- **深色模式** - 舒适的深色背景
- **护眼模式** - 米黄色纸张风格，减少眼睛疲劳
- **代码主题** - 多种代码高亮主题可选
- **强调色** - 多种强调色供选择
- **跟随系统** - 自动跟随 macOS/Windows 系统主题切换
- **自动深色** - 按时间段（22:00-07:00）自动切换深色模式
- **自定义 CSS** - 支持用户注入自定义 CSS 样式，实时生效

### 强大的编辑辅助
- **Mermaid 图表** - 支持流程图、时序图、甘特图等，支持导出 SVG/PNG
- **Mermaid 主题联动** - 切换应用主题时图表自动重渲染
- **Mermaid 放大预览** - 支持缩放（25%~500%）和拖动移动
- **KaTeX 数学公式** - 行内公式 `$...$`，块级公式 `$$...$$`
- **数学公式源码提示** - 悬停公式显示原始 LaTeX 源码
- **代码高亮** - 多语言支持
- **代码块折叠** - 超过15行的代码块可折叠，记忆每个文件的折叠状态
- **Diff 高亮** - `diff` 语言代码块中 `+` 绿色 / `-` 红色 / `@@` 强调色
- **Emoji 支持** - 冒号语法自动转换为 Emoji
- **任务列表交互** - `- [ ]` / `- [x]` 可点击勾选，状态持久化
- **WikiLink 支持** - `[[文件名]]` 或 `[[显示文本|文件名]]` 自动渲染为可点击链接
- **文本朗读（TTS）** - 选中文字后浮动 🔊 按钮，支持播放/停止

### 文件管理
- **原生文件操作** - 使用 Electron 主进程处理文件，获取真实文件路径
- **文件关联** - 双击 .md 文件直接用此应用打开（macOS/Windows）
- **文件夹浏览** - 侧边栏树形目录导航，支持子文件夹结构展示
- **文件树搜索过滤** - 文件树顶部实时过滤，匹配文本高亮
- **文件夹级全文搜索** - `Ctrl+Shift+F` IndexedDB 全文索引，支持正则，跨文件搜索
- **文件变更检测** - 外部文件修改后自动检测并提示刷新
- **最近文件** - 快速访问最近打开的文档，最多保存100条历史
- **快速切换器** - `Ctrl+O` 快速切换文件，支持路径搜索
- **文件拖拽** - 支持将外部文件拖入应用打开，拖拽时有视觉反馈
- **在 Finder 中显示** - 右键菜单中可选择在文件管理器中显示当前文件
- **复制文件路径** - 方便复制当前文件的完整路径

### 导航与大纲
- **目录导航** - 大纲自动跟踪当前阅读位置，支持章节折叠/展开
- **迷你地图（Minimap）** - 右侧缩略导航条，色块高度反映章节长度
- **浮动目录** - 长文档滚动时在内容区左上角显示当前章节
- **快速跳转** - `Ctrl+G` 输入行号/#标题/:图片名快速跳转
- **文档统计** - 信息面板显示标题数、段落数、代码块数、图片数、链接数等
- **文档内滚动历史** - `Alt+←/→` 前进后退滚动位置

### 书签功能
- **添加书签** - 为当前阅读位置添加书签
- **书签管理** - 快速跳转至书签位置
- **书签持久化** - 按文件名保存到 localStorage

### 搜索功能
- **内容搜索** - `Ctrl+F` 快速查找
- **全局跨标签搜索** - 在所有已打开标签中搜索
- **正则支持** - 支持正则表达式搜索
- **搜索历史** - 记住最近5条搜索记录，支持下拉选择和键盘导航
- **高亮导航** - 点击上下箭头跳转匹配位置

### 导出与分享
- **导出为 HTML** - 自包含 HTML 文件，保持当前主题样式
- **导出为 PDF** - 调用系统打印对话框另存为 PDF
- **复制为纯文本** - 复制原始 Markdown 内容
- **复制为富文本** - 复制渲染后的富文本格式
- **Mermaid 导出** - SVG/PNG 图片导出

### 快捷键支持
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + T` | 新建标签 |
| `Ctrl + W` | 关闭当前标签 |
| `Ctrl + Shift + T` | 恢复关闭的标签 |
| `Ctrl + Tab` | 切换到下一个标签 |
| `Ctrl + Shift + Tab` | 切换到上一个标签 |
| `Ctrl + F` | 搜索 |
| `Ctrl + Shift + F` | 全局搜索 |
| `Ctrl + O` | 快速切换器 |
| `Ctrl + Shift + O` | 打开文件夹 |
| `Ctrl + G` | 快速跳转 |
| `Ctrl + Shift + P` | 命令面板 |
| `Ctrl + Shift + N` | 新建窗口 |
| `Ctrl + Shift + R` | 打开最近文件页面 |
| `Ctrl + .` | 专注模式 |
| `Ctrl + /` | 快捷键帮助 |
| `Ctrl + S` | 切换源码视图 |
| `Ctrl + P` | 打印 |
| `Ctrl + E` | 导出面板 |
| `Ctrl + \\` | 双栏对比阅读 |
| `Ctrl + +/-` | 调整字体大小 |
| `Alt + ←/→` | 滚动位置前进/后退 |
| `F1` | 快捷键帮助 |
| `F11` | 全屏 |
| `Esc` | 关闭弹窗/退出专注模式 |

## 安装

从 [GitHub Releases](https://github.com/liujunGH/ai-markdown-reader/releases) 下载对应平台的安装包。

### Windows
下载 `Markdown-Reader-x.x.x.exe` 并运行安装程序。

### macOS
下载 `Markdown-Reader-x.x.x.dmg` 并拖入应用程序文件夹。

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
- **桌面打包**: Electron 35
- **XSS 防护**: DOMPurify

## 项目结构

```
markdown-reader/
├── src/
│   ├── components/     # React 组件
│   │   ├── TabBar/           # 标签栏（悬停预览、Pin、颜色标记）
│   │   ├── QuickSwitcher/    # 快速切换器
│   │   ├── RecentFiles/      # 侧边栏最近文件
│   │   ├── RecentFilesPage/  # 全屏最近文件页面
│   │   ├── ElectronFolderExplorer/  # Electron 文件夹浏览器
│   │   ├── FilePreviewPanel/ # 文件预览面板（含文档统计）
│   │   ├── Outline/          # 目录导航（支持折叠）
│   │   ├── Bookmark/         # 书签
│   │   ├── SearchBox/        # 搜索框（含历史、键盘导航）
│   │   ├── ThemeToggle/      # 主题切换（含自定义 CSS）
│   │   ├── StatusBar/        # 状态栏
│   │   ├── MarkdownRenderer/ # Markdown 渲染（代码折叠、Diff、TTS）
│   │   ├── SourceView/       # 源码模式（带行号）
│   │   ├── FloatingTOC/      # 浮动目录
│   │   ├── Minimap/          # 迷你地图
│   │   ├── CommandPalette/   # 命令面板
│   │   ├── GlobalSearch/     # 全局搜索
│   │   ├── QuickJump/        # 快速跳转
│   │   ├── ReadingStatsPanel/# 阅读统计面板
│   │   ├── CustomStylePanel/ # 自定义 CSS 面板
│   │   ├── ExportPanel/      # 导出面板
│   │   ├── ErrorBoundary/    # 错误边界
│   │   └── Skeleton/         # 骨架屏
│   ├── context/        # React Context
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   └── styles/         # 全局样式
├── electron/           # Electron 主进程
│   ├── main.ts         # 主进程入口（多窗口、托盘）
│   └── preload.ts      # 预加载脚本
└── release/           # 构建输出
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## License

MIT
