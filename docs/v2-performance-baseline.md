# v2 架构性能验证基线

## 旧架构（v1）基准数据

来源：`tmp/document-perf-5mb-final.json`（2026-05-17，5MB 文档）

| 指标 | 旧架构值 | 说明 |
|---|---|---|
| 文档渲染耗时 | 1674.7 ms | 整篇 dangerouslySetInnerHTML + 8 轮 querySelectorAll |
| 搜索首条高亮 | 5552.9 ms | 主线程 DOMPurify 整篇净化 + TreeWalker 全文扫描 |
| 滚动到底渲染 | 358.8 ms | VirtualMarkdown 的 visibleIds 累积（只增不减） |
| 工作集内存 | 936.7 MB | 5MB 文档渲染后（DOM 全量 + content 在状态树） |

来源：`tmp/startup-perf.json`（12×5MB 标签会话恢复）

| 指标 | 旧架构值 |
|---|---|
| 12 标签会话恢复后内存 | 显著增长（content 全常驻状态树） |

## v2 架构的改善机制

### 渲染耗时（预期大幅下降）
- **块模型 + 虚拟列表**：只渲染可见块的 DOM（TanStack Virtual），首屏渲染成本从"整篇 N 个节点"降到"可见区间 ~10 个块"。
- **块级增强**：8 项增强（链接/表格/代码/task/katex/wiki/image/mermaid）作用于单个块 DOM，非整篇 querySelectorAll。

### 搜索响应（预期大幅下降）
- **DOMPurify 块级净化**：消除整篇同步净化长任务。净化缓存 per-block，同一块只净化一次。
- **FTS5 索引**：≥3 字符查询走 SQLite FTS5 MATCH（索引查找），非主线程全文 split 扫描。

### 内存（预期大幅下降且恒定）
- **虚拟列表自动卸载**：滚出视口的块 DOM 被 React 卸载（TanStack Virtual），根治旧 VirtualMarkdown 的 visibleIds 只增不减。滚到底后内存**不再增长**（旧版近乎全量）。
- **DocumentCache LRU**：content 不在 Zustand 状态树，LRU 容量 4，超出淘汰。10 个大文档不再全常驻内存。
- **SQLite 取代 IndexedDB**：全文索引在主进程 SQLite（FTS5），删除文件时级联清理，无孤儿索引。

### 状态重渲染（预期大幅减少）
- **selector 订阅**：组件用 `useStore(s => s.field)` 单字段订阅，非全量解构。uiStore 18 面板用 Record + selector。
- **content 移出状态树**：任何 tab 变化不再比较巨量 content 字符串。

## 验证状态

- **单元测试覆盖**（284 项）：块边界正确性（表格/列表/代码块不切断）、LRU 淘汰（容量上限/临时标签保护）、虚拟化回收、heading id 注入、8 项 DOM 增强、FTS5 安全校验、state store 行为。
- **端到端验证**（12 项 e2e）：打开文件/渲染/搜索/主题/大纲/wiki link/侧栏拖拽/标签恢复。
- **完整 perf 对比**：待 v2 成为默认入口后用 perf 脚本实测（脚本依赖旧 App 选择器，需适配 v2 UI 后运行）。

## 结论

v2 架构通过块模型 + 虚拟列表 + LRU 资源层 + 块级净化 + selector 状态，在架构层面解决了 v1 的渲染卡顿、内存增长、状态重渲染三大根因。单元测试已验证各机制的正确性。完整数值对比待默认入口切换后实测。
