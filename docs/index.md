# Markdown Reader

Markdown Reader 是一个基于 Electron + React + TypeScript 的本地 Markdown 阅读器，当前路线以阅读为准，保留阅读、导航、搜索、导出和轻量工作区能力。

## 核心能力

- Markdown 阅读：支持 Mermaid、KaTeX、代码高亮、任务列表、WikiLink、表格、图片和本地资源安全加载。
- 长文阅读：目录跟随、迷你地图、快速跳转、章节进度、阅读快照、稍后读、高亮与摘录。
- 多标签页：恢复上次标签状态，启动时只恢复元数据，文档内容按需读取。
- 文件夹工作区：打开本地文件夹后浏览文件树、建立全文索引、跨文件搜索和查看索引诊断。
- 导出分享：导出 HTML、PDF，或复制为纯文本/富文本。

## 启动策略

应用启动优先展示窗口和欢迎页：

1. 先恢复标签页列表和活动标签。
2. 只读取当前活动文档内容。
3. 其他标签在切换到时再加载。
4. 文件夹索引只在打开文件夹或主动重建时运行。

## 推荐工作流

1. 打开一个 Markdown 文件开始阅读。
2. 需要跨文件搜索时再打开文件夹。
3. 用阅读工具侧栏管理高亮、摘录、阅读状态和稍后读。
4. 用目录、迷你地图和快速跳转处理长文档。
5. 用 `npm run perf:startup` 压测大数据会话启动表现。

## 本地下载

从 GitHub Releases 下载最新版：

- [macOS DMG](https://github.com/liujunGH/ai-markdown-reader/releases/latest)
- [Windows 安装包](https://github.com/liujunGH/ai-markdown-reader/releases/latest)

macOS 自用包为 ad-hoc 签名，首次打开时可在 Finder 中右键选择“打开”。

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm test
npm run electron:compile
npm run build
npm run perf:startup
```

## 当前版本

当前文档对应 v1.5.7。
