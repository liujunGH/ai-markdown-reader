# Markdown Reader

![Theme Preview](https://img.shields.io/badge/Theme-Light%20%7C%20Dark%20%7C%20Sepia-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Version](https://img.shields.io/badge/Version-1.5.7-blue)

Markdown Reader 是一个以本地 Markdown 阅读为核心的桌面应用。当前版本把功能重新收敛到阅读、导航、搜索、导出和轻量工作区管理，启动时优先打开界面，再按需读取文档内容，避免历史标签、文件夹索引和大型文档一起挤进首屏路径。

## 适合做什么

- 阅读本地 Markdown 文档、笔记、说明书、论文草稿和技术文档
- 用多标签页在多个文档之间切换，并恢复上次的标签状态
- 浏览文件夹、建立全文索引，并在需要时进行跨文件搜索
- 阅读长文档时使用目录、迷你地图、快速跳转、阅读进度和章节状态
- 为重点内容添加高亮、摘录、稍后读、阅读快照和阅读状态记录
- 渲染 Mermaid、KaTeX、代码块、表格、任务列表、WikiLink 和本地图片
- 将文档导出为 HTML、PDF，或复制为纯文本/富文本

## v1.5.7 重点

- 删除偏维护和发布运营的重型面板，让工具菜单回到阅读、查找、导航和导出。
- 会话恢复改为懒加载：启动时只恢复标签元数据，当前标签内容优先加载，切换到其他文件时再读取对应文档。
- Markdown 渲染优先走 Web Worker，worker 失败时再回退到主线程解析，降低大文档对界面的阻塞。
- 启动流程延后非必要任务：不会在启动阶段自动恢复上次文件夹并触发索引。
- 新增 `npm run perf:startup`，默认生成 12 个 5MB 临时 Markdown 文档，测试空会话和大数据会话启动耗时。

## 核心功能

### 阅读体验

- 专注模式、字号调整、浅色/深色/护眼主题和跟随系统主题
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
- 会话恢复只保存必要元数据，关闭标签历史不再保留完整文档内容

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

下载 `Markdown Reader-x.x.x-arm64.dmg` 或 `Markdown Reader-x.x.x-x64.dmg` 并拖入应用程序文件夹。

## 开发

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

# E2E 测试
npm run e2e

# 打包桌面应用
npm run electron:build
npm run electron:build:mac
npm run electron:build:linux
```

## 启动性能压测

`npm run perf:startup` 会先编译 Electron、构建前端，再运行 `scripts/perf-startup.mjs`：

- 空会话：确认应用壳、欢迎页和基础窗口打开速度
- 大会话：默认创建 12 个 5MB Markdown 文件，模拟 60MB 历史标签
- 输出指标：进程启动、DOM ready、根节点可见、标签恢复、当前文档渲染、切换未加载标签耗时和内存占用

可以直接运行脚本并保存结果：

```bash
node scripts/perf-startup.mjs --out=tmp/startup-perf.json
```

## 发版

发版前至少运行：

```bash
npm run lint
npm test
npm run electron:compile
npm run build
npm run perf:startup
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
| 桌面框架 | Electron 35 |
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand + React Hooks |
| 构建工具 | Vite 5 |
| 打包工具 | electron-builder 25 |
| Markdown 解析 | markdown-it |
| 数学公式 | KaTeX |
| 图表渲染 | Mermaid |
| 代码高亮 | PrismJS |
| XSS 防护 | DOMPurify |

## 项目结构

```text
markdown-reader/
├── electron/                  # Electron 主进程与 preload
├── src/
│   ├── components/            # React 组件
│   │   ├── MarkdownRenderer/  # Markdown 渲染
│   │   ├── ReadingToolsPanel/ # 阅读工具侧栏
│   │   ├── DocumentLoadState/ # 懒加载文档状态
│   │   ├── ToolsMenu/         # 阅读优先工具菜单
│   │   └── ...
│   ├── hooks/                 # useMarkdownWorker 等 Hooks
│   ├── stores/                # Zustand 状态
│   ├── utils/                 # Markdown、索引、阅读数据和存储工具
│   ├── workers/               # Markdown worker
│   └── styles/                # 全局样式与 CSS Modules
├── e2e/                       # Playwright Electron E2E
├── docs/releases/             # GitHub Release notes
├── scripts/perf-startup.mjs   # 启动性能压测
└── package.json
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md) 和 [docs/releases](./docs/releases)。

## License

MIT
