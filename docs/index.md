# Markdown Reader

Markdown Reader 是一个基于 Electron + React + TypeScript 的桌面 Markdown 阅读器，面向本地文档、个人知识库和发布前自检场景。

## 核心能力

- Markdown 阅读：支持 Mermaid、KaTeX、代码高亮、任务列表、WikiLink、图片预览、批注总览、表格全屏、图片序列、阅读状态卡、章节模式、阅读快照和无障碍阅读设置。
- 文件夹工作区：打开本地文件夹后可浏览文件树、建立全文索引、跨文件搜索和恢复上次工作区。
- 知识库维护：提供知识库健康报告、反向链接、文档图谱、缺失链接、索引诊断、图片检查和阅读时间线。
- 运营仪表盘：集中展示工作区质量、可执行修复建议、链接重命名安全、图片资产计划、阅读助手和发布辅助。
- 发布前检查：打包或分享前检查健康分、待处理任务和索引覆盖率，并复制 Markdown 报告。

## 推荐工作流

1. 打开一个 Markdown 文件夹。
2. 在工具菜单中建立或刷新索引。
3. 打开“运营仪表盘”查看整体状态。
4. 进入“待处理队列”逐项处理缺失链接、图片问题、文档健康问题和索引跳过项。
5. 使用“发布前检查”确认当前工作区适合打包或分享。

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
npm run build
npm run electron:build:mac
```

## 当前版本

当前文档对应 v1.5.6。
