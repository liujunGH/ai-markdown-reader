/**
 * 同步 Markdown 解析（导出用）
 *
 * v2 渲染走 worker + 块模型，但导出（ExportPanel）需要一次性把整篇渲染成
 * HTML 字符串。这里提供同步 parseMarkdown，用 markdown-it 实例渲染。
 * 用静态 import 在模块加载时同步初始化（导出场景需要同步可用）。
 */
import MarkdownIt from 'markdown-it'

const mdInstance: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

/**
 * 同步解析 Markdown 为 HTML（导出用）。
 * 注：不含 Prism 高亮 / KaTeX / Mermaid（导出场景用纯 HTML 即可，
 * 复杂渲染在阅读器里由 worker+块模型处理）。
 */
export function parseMarkdown(content: string): string {
  return mdInstance.render(content)
}

/** 异步确保 parser 就绪（导出前调用；静态 import 下已是 no-op，保留接口兼容） */
export async function ensureParser(): Promise<void> {
  // 静态 import 已在模块加载时初始化，无需异步准备
}
