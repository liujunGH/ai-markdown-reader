# AI Markdown Reader — Agent 指南

## 项目概述

AI Markdown Reader 是一个基于 Electron + React 18 + TypeScript + Vite 5 的桌面 Markdown 阅读器，支持多窗口、多标签页、Mermaid 图表、KaTeX 数学公式、代码高亮等功能。

## 技术栈

| 层 | 技术 |
|--|--|
| 桌面框架 | Electron 28.3.3 |
| 前端框架 | React 18.2 + TypeScript 5.3 |
| 构建工具 | Vite 5.1 |
| 打包工具 | electron-builder 24.9 |
| Markdown 解析 | markdown-it 14.0 |
| 数学公式 | KaTeX 0.16.45 |
| 图表渲染 | Mermaid 10.6 |
| 代码高亮 | PrismJS 1.29 |
| XSS 防护 | DOMPurify 3.4 |
| 自动更新 | electron-updater 6.1 |

## 项目结构

```
ai-markdown-reader/
├── electron/                  # Electron 主进程
│   ├── main.ts               # 主进程入口（窗口管理、IPC、菜单、托盘）
│   ├── preload.ts            # 预加载脚本（contextBridge 暴露 API）
│   └── tsconfig.json         # 主进程 TS 配置
├── src/
│   ├── App.tsx               # 根组件（布局、状态协调）
│   ├── main.tsx              # 渲染进程入口
│   ├── components/           # React 组件
│   │   ├── MarkdownRenderer/ # Markdown 渲染（含 Mermaid、KaTeX）
│   │   ├── TabBar/           # 标签栏
│   │   ├── SearchBox/        # 内容搜索
│   │   ├── GlobalSearch/     # 文件夹级全文搜索
│   │   ├── CommandPalette/   # 命令面板
│   │   ├── Outline/          # 目录大纲
│   │   ├── Minimap/          # 迷你地图
│   │   ├── ExportPanel/      # 导出面板
│   │   └── ...
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useTabs.ts        # 标签管理（含会话恢复）
│   │   ├── useKeyboardShortcuts.ts  # 全局快捷键
│   │   ├── useFileWatcher.ts # 文件变更监听
│   │   └── ...
│   ├── utils/                # 工具函数
│   │   ├── markdownParser.ts # Markdown 解析 + DOMPurify 净化
│   │   ├── searchIndex.ts    # IndexedDB 全文索引
│   │   └── storage.ts        # localStorage 封装
│   ├── types/                # TypeScript 类型定义
│   └── styles/               # 全局样式 + CSS Modules
├── build/                    # 构建资源
│   ├── entitlements.mac.plist # macOS 签名权限
│   └── README.md             # 图标配置说明
├── .github/workflows/        # CI/CD
├── vite.config.ts            # Vite 配置
├── electron-builder.yml      # 打包配置
└── package.json
```

## 常用命令

```bash
# 开发模式
npm run dev

# 构建前端
npm run build

# 编译 Electron 主进程
npm run electron:compile

# 开发运行（编译 + 构建 + 启动 Electron）
npm run electron:dev

# 打包
npm run electron:build       # Windows
npm run electron:build:mac   # macOS
npm run electron:build:linux # Linux

# 类型检查
npm run lint                 # tsc --noEmit
```

## 关键约定

### IPC 通信
- 所有主进程 ↔ 渲染进程通信通过 `contextBridge` 暴露的 `window.electronAPI`
- **preload.ts 中禁止导入 Node 内置模块**（如 `path`），sandbox 中会崩溃
- 路径操作在 preload 中使用纯字符串函数替代

### 状态管理
- 不使用 Redux/Zustand，状态通过 React `useState` + 自定义 Hooks 管理
- `useTabs.ts` 是核心状态 hook，负责标签创建、关闭、恢复、localStorage 持久化

### 样式
- 使用 CSS Modules（`*.module.css`）
- CSS 变量定义在 `global.css`，通过 `[data-theme]` 属性切换 Light/Dark/Sepia

### 安全
- `html: false` 禁用 Markdown 原始 HTML
- 所有 IPC handler 需经过 `isPathSafe()` 路径验证
- CSP 禁止外部脚本/样式

## 常见问题

### 本地构建失败
- 确保 Node.js ≥ 18
- `npm ci` 重新安装依赖
- 检查 `electron/preload.js` 是否存在（由 `electron:compile` 生成）

### macOS 打包后打不开
- 未签名应用首次需在 Finder 中右键 → "打开"
- 或执行 `xattr -cr /Applications/Markdown\ Reader.app`

### 图标缺失
- 放置 `build/icon.png`（1024×1024）后重新打包
