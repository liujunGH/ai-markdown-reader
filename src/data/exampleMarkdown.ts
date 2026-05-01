export const EXAMPLE_MARKDOWN_NAME = 'Markdown Reader 示例.md'

export const EXAMPLE_MARKDOWN = `# Markdown Reader 示例

这份文档用于快速检查常用渲染能力。

## Mermaid

\`\`\`mermaid
flowchart LR
  A[打开 Markdown] --> B{是否包含图表}
  B -->|是| C[渲染 Mermaid]
  B -->|否| D[直接阅读]
\`\`\`

## KaTeX

行内公式：$E = mc^2$

块级公式：

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

## 代码高亮

\`\`\`ts
type ReaderMode = 'light' | 'dark' | 'sepia'

function setReaderMode(mode: ReaderMode) {
  return mode
}
\`\`\`

## 网络图片

![Markdown 网络图片示例](https://picsum.photos/seed/markdown-reader/900/420)

## 任务列表

- [x] 支持 Markdown 阅读
- [x] 支持公式和图表
- [ ] 根据自己的阅读习惯继续微调
`
