# Markdown Reader

![Theme Preview](https://img.shields.io/badge/Theme-Light%20%7C%20Dark%20%7C%20Sepia-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Version](https://img.shields.io/badge/Version-2.1.1-blue)

Markdown Reader 是一个以本地 Markdown 阅读为核心的桌面应用。v2.0.0 完成了从单体渲染到分层架构的重构；v2.1.0 在此基础上补齐安全分段与按需渲染、阅读体验修复，以及可下载、重试和重启安装的软件更新闭环；v2.1.1 修复 Apple Silicon 安装包误带 Intel 原生组件的问题。

## 适合做什么

- 阅读本地 Markdown 文档、笔记、说明书、论文草稿和技术文档
- 用多标签页在多个文档之间切换，并恢复上次的标签状态
- 浏览文件夹、建立全文索引，并在需要时进行跨文件搜索
- 阅读长文档时使用目录、迷你地图、快速跳转、阅读进度和章节状态
- 为重点内容添加高亮、摘录、稍后读、阅读快照和阅读状态记录
- 渲染 Mermaid、KaTeX、代码块、表格、任务列表、WikiLink 和本地图片
- 将文档导出为 HTML、PDF，或复制为纯文本/富文本

## v2.0.0 重点

- **全新渲染层**：markdown-it 块级 token 解析 + TanStack Virtual 虚拟化渲染，根治大文档滚动卡顿与内存膨胀。
- **状态分层重构**：Tab 只存元数据，正文内容下沉到 `DocumentCache` LRU，响应式状态树不再承载 MB 级正文。
- **全文索引升级**：全文索引从 IndexedDB 迁移到主进程 SQLite FTS5，支持中文 trigram 子串匹配与可靠级联清理。
- **IPC 安全边界**：主进程 handler 按领域拆分，路径校验、文件大小限制、SQL 白名单（`db:exec` 仅允许 DML）统一收口。
- **多窗口文件监听**：同一文件可在多个窗口同时监听变更，关闭窗口时自动清理，不再互相覆盖。
- **工程验证**：259 单元测试 + 8 e2e，并保留 `render-check.mjs` 渲染正确性检查。

## v2.1.0 阅读体验与性能升级

- 首次引导从第 1 步开始，跳过或完成后立即关闭，不再要求刷新页面。
- 内置示例在会话恢复时会重新注入正文，避免重启后只剩空标签。
- 文档搜索不再改写 Mermaid、KaTeX 和代码结构，关闭搜索会清理残留高亮；搜索框固定在阅读区内，按钮不会被标签栏遮挡。
- 切换主题后自动重新渲染 Mermaid，异步图表变高时会重新测量文档块，避免覆盖后续内容；专注模式会隐藏工具栏、标签栏、侧栏、目录和状态栏，并保留退出入口。
- 源码视图完整覆盖阅读区，不再裁掉首行；未打开工作区时，全局搜索会提供“打开文件夹”入口。
- 命令面板在 macOS 上显示 `⌘` 快捷键，并移除了与源码命令冲突的 `Ctrl+S` 提示。
- 同一文档的多视图解析会共享 Worker 请求和块模型，隐藏的快速跳转面板不再预解析正文；单栏只缓存当前解析结果，分屏时才允许保留两份，降低长文档和多标签会话的峰值内存。
- 长文档正文搜索改由独立 Worker 执行并带超时保护，状态栏统计改为单次低分配扫描，避免搜索或切换大文件时阻塞界面。
- 长文档改为约 64KB 的安全分段解析：首段完成即可显示正文，其余目录和块索引在后台增量补齐；围栏代码、块级公式、列表、引用和表格的连续结构不会被强行切断，引用式链接可跨分段解析。
- 块模型只保留原始 Markdown 和布局元数据；仅对可见区前后预取窗口批量生成 HTML，并使用 160 块有界 LRU，避免提前保存整篇 HTML。增量索引期间滚动到底部会保持尾部锚定。
- 可见块渲染 Worker 会短时保留已经初始化的 Markdown/Prism/KaTeX 运行时；完整索引结束后仅预热尾部 20 块，降低首次拖动到底或恢复尾部阅读进度的等待，同时不突破 HTML LRU 上限。
- 启动与长文档性能脚本已对齐实际 Electron 构建入口、首次引导标记和阅读区滚动容器，可直接执行并输出有效指标。
- 当前机器 5MB 实测：正文首屏 619.6ms、首次搜索高亮 73.8ms、尾部按需渲染 39.5ms；12×5MB 会话的当前文档首屏 603.7ms、未加载标签切换 143.7ms。
- 软件更新形成完整闭环：安装包启动后静默检查，也可从“帮助 → 检查更新”或命令面板手动检查；发现版本后展示发行说明，由用户确认下载，支持进度、失败重试以及真正的“重启并安装”。

## 核心功能

### 阅读体验

- 专注模式（仅保留正文和退出入口）、字号调整、浅色/深色/护眼主题和跟随系统主题
- 阅读工具侧栏：高亮、摘录、稍后读、继续阅读、阅读预设、章节进度、阅读快照
- 长文档辅助：目录跟随、迷你地图、浮动目录、快速跳转、章节完成标记
- 阅读进度记忆：按文件保存滚动位置、章节状态和阅读历史
- 图片/表格阅读增强：图片序列浏览、表格全屏查看、Markdown/CSV 复制
- 无障碍设置：朗读速度、行高、字距、段落间距、减少动画和高对比高亮

### Markdown 渲染

- Mermaid 图表、KaTeX 数学公式、Prism 代码高亮、Diff 高亮
- 代码块折叠、任务列表交互、WikiLink、本地图片安全加载
- 源码视图、文档统计、打印和导出

### 文件与工作区

- 原生文件打开、文件拖拽、最近文件、快速切换器
- 文件夹浏览、文件树过滤、工作区保存/置顶/重命名
- 文件夹级全文搜索和索引诊断，索引只在打开或主动重建文件夹后运行

### 多标签与多窗口

- 多标签页、标签拖拽、固定标签、颜色标记、撤销关闭
- 多窗口打开、窗口位置和大小持久化
- 会话恢复只保存必要元数据，内置示例按需重新注入正文，关闭标签历史不再保留完整文档内容

## 安装

从 [GitHub Releases](https://github.com/liujunGH/ai-markdown-reader/releases) 下载对应平台的安装包。

### macOS 自用版

本项目的本地 macOS 包默认使用 ad-hoc 签名，首次打开时 macOS 可能会拦截。自用安装时可在 Finder 中右键应用选择“打开”。如果系统仍提示安全限制，可执行：

```bash
xattr -cr /Applications/Markdown\ Reader.app
```

### Windows

下载 `Markdown-Reader-x.x.x.exe` 并运行安装程序。

### macOS

下载 `Markdown-Reader-x.x.x-arm64.dmg` 或 `Markdown-Reader-x.x.x-x64.dmg` 并拖入应用程序文件夹。

## 软件更新

- 安装包版本会在启动约 10 秒后静默检查 GitHub Releases；没有更新或后台检查失败时不会打断阅读。
- 可从应用菜单“帮助 → 检查更新…”或命令面板的“检查软件更新”主动检查。开发模式不会连接发布源，并会给出明确提示。
- 发现新版本后会显示版本号与发行说明。应用不会自动下载，只有点击“下载更新”后才开始；下载完成可选择“重启并安装”或稍后重启。
- Windows 发布需要上传 NSIS 安装包和 `latest.yml`；macOS 需要同时上传 DMG、ZIP 和 `latest-mac.yml`；Linux 需要 AppImage 和 `latest-linux.yml`。tag 构建工作流会按三个平台生成并发布这些产物。
- 面向用户发布的 macOS 自动安装应配置 Developer ID 签名（`CSC_LINK`、`CSC_KEY_PASSWORD`）并完成公证；本地 ad-hoc 签名包主要用于自测，系统安全策略可能阻止其自动替换安装。

## 开发

开发环境要求 Node.js 22.12 或更高版本。

```bash
# 安装依赖
npm install

# Web 开发模式
npm run dev

# 桌面开发模式
npm run electron:dev

# 类型检查与测试
npm run lint
npm test

# 构建 Web 版本
npm run build

# 编译 Electron 主进程
npm run electron:compile

# 构建后桌面预览
npm run electron:preview

# 启动性能压测
npm run perf:startup

# 大文档阅读性能压测
npm run perf:document

# E2E 测试
npm run e2e

# 打包桌面应用
npm run electron:build
npm run electron:build:mac
npm run electron:build:linux
```

## 性能压测

`npm run perf:startup` 会先编译 Electron、构建前端，再运行 `scripts/perf-startup.mjs`：

- 空会话：确认应用壳、欢迎页和基础窗口打开速度
- 大会话：默认创建 12 个 5MB Markdown 文件，模拟 60MB 历史标签
- 输出指标：进程启动、DOM ready、根节点可见、标签恢复、当前文档首屏渲染、切换未加载标签首屏耗时，以及渲染瞬时/稳定后的内存占用

可以直接运行脚本并保存结果：

```bash
node scripts/perf-startup.mjs --out=tmp/startup-perf.json
```

`npm run perf:document` 会先编译 Electron、构建前端，再运行 `scripts/perf-document.mjs`：

- 默认生成 1 个 5MB Markdown 文档，模拟单篇长文档阅读
- 输出指标：进程启动、DOM ready、根节点可见、当前文档首屏渲染、打开搜索框、输入搜索词、首次搜索高亮、完整索引结束后滚动到底部渲染，以及渲染瞬时/稳定后的内存占用
- 可通过 `--mb=10` 调整文档体积，通过 `--out=tmp/document-perf.json` 保存结果

```bash
node scripts/perf-document.mjs --mb=10 --out=tmp/document-perf.json
```

## 发版

发版前至少运行：

```bash
npm run lint
npm test
npm run electron:compile
npm run build
npm run perf:startup
npm run perf:document
```

准备好 `docs/releases/v版本号.md` 后，可以使用本地脚本创建 tag 和 GitHub Release：

```bash
scripts/release-local.sh 1.5.7
```

如果有本地构建好的安装包，可作为额外参数上传：

```bash
scripts/release-local.sh 1.5.7 release/Markdown\ Reader-1.5.7-arm64.dmg
```

## 技术栈

| 层 | 技术 |
|--|--|
| 桌面框架 | Electron 43 |
| 前端框架 | React 18 + TypeScript |
| 虚拟列表 | TanStack Virtual |
| 状态管理 | Zustand + Immer |
| 全文索引 | SQLite FTS5 (better-sqlite3) |
| 构建工具 | Vite 8 |
| 打包工具 | electron-builder 26 |
| Markdown 解析 | markdown-it |
| 数学公式 | KaTeX |
| 图表渲染 | Mermaid |
| 代码高亮 | PrismJS |
| XSS 防护 | DOMPurify |

## 项目结构

```text
markdown-reader/
├── electron/                  # Electron 主进程与 preload
│   ├── ipc/                   # 按领域拆分的 IPC handler（file/dialog/window/storage/db）
│   ├── lib/                   # 路径安全、限流、日志
│   └── db/                    # SQLite 连接、schema、迁移
├── src/
│   ├── app/                   # AppShell、ReaderPanel、SplitPanel
│   ├── rendering/             # 渲染层核心
│   │   ├── pipeline/          # 安全分段、块模型与按需 HTML 渲染
│   │   ├── workers/           # 分段解析、可见块渲染与长文档搜索 Worker
│   │   ├── enhancements/      # Mermaid/KaTeX/代码/图片等块增强
│   │   └── hooks/             # useDocument、useScrollSpy
│   ├── state/stores/          # Zustand 状态（tab/file/reading/ui/activeDoc/toast）
│   ├── resources/             # 正文与解析结果 LRU 缓存
│   ├── features/              # 功能组件（tabs/search/reading-tools/reader/workspace）
│   ├── components/            # 复用 UI 组件
│   └── ipc/                   # 渲染进程 IPC 客户端封装
├── e2e/                       # Playwright Electron E2E
├── scripts/render-check.mjs   # 渲染正确性验证
├── scripts/perf-startup.mjs   # 启动性能压测
├── scripts/perf-document.mjs  # 大文档阅读性能压测
└── package.json
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md) 和 [docs/releases](./docs/releases)。

## License

MIT
