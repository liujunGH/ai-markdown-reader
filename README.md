# Markdown Reader

一款沉浸式的 Markdown 阅读器，支持丰富的功能特性，让阅读 Markdown 文档成为一种享受。

![Theme Preview](https://img.shields.io/badge/Theme-Light%20%7C%20Dark%20%7C%20Sepia-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Version](https://img.shields.io/badge/Version-1.2.0-blue)

## 功能特性

### 沉浸式阅读
- **专注模式** - 隐藏所有界面元素，只保留内容，带来沉浸式阅读体验
- **滚动高亮** - 目录自动跟踪当前阅读位置

### 多标签页
- **多文档浏览** - 同时打开多个 Markdown 文件
- **标签管理** - 右键菜单支持复制文件名、关闭标签、关闭其他、关闭全部
- **标签页拖拽** - 拖拽标签页可以重新排序
- **标签页数量限制** - 默认最多10个标签页，可配置
- **会话恢复** - 关闭应用后重新打开，自动恢复上次的工作标签页
- **快捷键** - `Ctrl+T` 新建标签、`Ctrl+W` 关闭标签、`Ctrl+Tab` 切换标签

### 主题支持
- **浅色模式** - 清晰的白色背景
- **深色模式** - 舒适的深色背景
- **护眼模式** - 米黄色纸张风格，减少眼睛疲劳
- **代码主题** - 多种代码高亮主题可选
- **强调色** - 多种强调色供选择

### 强大的编辑辅助
- **Mermaid 图表** - 支持流程图、时序图、甘特图等，支持导出 SVG/PNG
- **KaTeX 数学公式** - 行内公式 `$...$`，块级公式 `$$...$$`
- **代码高亮** - 多语言支持
- **Emoji 支持** - 冒号语法自动转换为 Emoji

### 文件管理
- **原生文件操作** - 使用 Electron 主进程处理文件，获取真实文件路径
- **文件关联** - 双击 .md 文件直接用此应用打开（macOS/Windows）
- **文件夹浏览** - 侧边栏树形目录导航，支持子文件夹结构展示
- **文件变更检测** - 外部文件修改后自动检测并提示刷新
- **最近文件** - 快速访问最近打开的文档，最多保存100条历史
- **快速切换器** - `Ctrl+O` 快速切换文件，支持路径搜索
- **文件拖拽** - 支持将外部文件拖入应用打开
- **在 Finder 中显示** - 右键菜单中可选择在文件管理器中显示当前文件
- **复制文件路径** - 方便复制当前文件的完整路径

### 书签功能
- **添加书签** - 为当前阅读位置添加书签
- **书签管理** - 快速跳转至书签位置

### 搜索功能
- **内容搜索** - `Ctrl+F` 快速查找
- **正则支持** - 支持正则表达式搜索
- **高亮导航** - 点击上下箭头跳转匹配位置

### 快捷键支持
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + T` | 新建标签 |
| `Ctrl + W` | 关闭当前标签 |
| `Ctrl + Tab` | 切换到下一个标签 |
| `Ctrl + Shift + Tab` | 切换到上一个标签 |
| `Ctrl + F` | 搜索 |
| `Ctrl + O` | 快速切换器 |
| `Ctrl + Shift + R` | 打开最近文件页面 |
| `Ctrl + .` | 专注模式 |
| `Ctrl + /` | 快捷键帮助 |
| `Ctrl + S` | 切换源码视图 |
| `Ctrl + P` | 打印 |
| `Ctrl + +/-` | 调整字体大小 |
| `F1` | 快捷键帮助 |
| `F11` | 全屏 |

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
- **桌面打包**: Electron 28

## 项目结构

```
markdown-reader/
├── src/
│   ├── components/     # React 组件
│   │   ├── TabBar/           # 标签栏
│   │   ├── QuickSwitcher/    # 快速切换器
│   │   ├── RecentFiles/      # 侧边栏最近文件
│   │   ├── RecentFilesPage/  # 全屏最近文件页面
│   │   ├── ElectronFolderExplorer/  # Electron 文件夹浏览器
│   │   ├── FilePreviewPanel/ # 文件预览面板
│   │   ├── Outline/          # 目录导航
│   │   ├── Bookmark/         # 书签
│   │   ├── SearchBox/        # 搜索框
│   │   ├── ThemeToggle/      # 主题切换
│   │   └── StatusBar/        # 状态栏
│   ├── context/        # React Context
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   └── styles/         # 全局样式
├── electron/           # Electron 主进程
│   ├── main.ts         # 主进程入口
│   └── preload.ts      # 预加载脚本
└── release/           # 构建输出
```

## 更新日志

### v1.2.2
- 修复：左边文件夹导航和右边目录导航固定可见，不随正文滚动消失

### v1.2.1
- 新增：Electron 主进程文件操作，支持真实文件路径
- 新增：原生文件拖拽支持
- 新增：外部文件变更检测
- 新增：标签页拖拽重排序
- 新增：专注模式隐藏操作栏
- 新增：文件预览面板
- 新增：最近文件全屏页面（保存100条历史）
- 新增：标签页数量限制（默认10个）
- 新增：标签栏和工具栏固定在顶部，不随滚动消失
- 新增：md 链接在新标签页打开，外部链接在系统浏览器打开
- 新增：Mermaid 放大预览，支持缩放（25%~500%）和拖动移动
- 新增：Mermaid 导出文件根据文档位置自动命名
- 新增：空文件夹引导页
- 新增：文件夹恢复记忆
- 优化：文件夹浏览器支持子目录结构展示
- 优化：文件变更标记和刷新功能
- 优化：StatusBar 固定显示

### v1.2.0
- 新增：Electron 主进程文件操作，支持真实文件路径
- 新增：原生文件拖拽支持
- 新增：外部文件变更检测
- 新增：标签页拖拽重排序
- 新增：专注模式隐藏操作栏
- 新增：文件预览面板
- 新增：最近文件全屏页面（保存100条历史）
- 新增：标签页数量限制（默认10个）
- 优化：文件夹浏览器支持子目录结构展示
- 优化：文件变更标记和刷新功能
- 优化：StatusBar 固定显示

### v1.1.6
- 修复：标签页右键菜单被遮挡问题
- 新增：复制文件路径功能
- 新增：在 Finder 中显示功能
- 新增：快速切换器路径搜索

## License

MIT
