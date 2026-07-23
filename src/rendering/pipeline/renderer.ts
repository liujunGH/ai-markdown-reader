/**
 * 块渲染辅助
 *
 * buildBlock（blockModel.ts）已在切块时用 md.renderer.render 渲染了块的 HTML。
 * 净化在主线程、作用于块级（sanitizeBlock）。详见 sanitizer/config.ts 策略说明。
 *
 * 缓存策略：不使用模块级全局 cache（block.id 在每篇文档都从 0 起，跨文档
 * 会脏读）。改为 DocumentView 内部用 useMemo 持有 per-document 的净化缓存，
 * 文档切换时随 useMemo 依赖失效自动重建。
 */
import type { DocumentBlock } from '../types'
import { sanitizeBlock } from '../sanitizer/config'

/** 净化单个块的 HTML（无缓存，调用方按需 memoize） */
export function sanitizeBlockHtml(block: DocumentBlock): string {
  return sanitizeBlock(block.html)
}

/**
 * 创建一个 per-document 的净化缓存。
 * DocumentView 用 useMemo 持有，文档切换时重建（依赖 document 引用）。
 */
export function createBlockSanitizeCache(): Map<number, string> {
  return new Map()
}

/** 从缓存取或净化并缓存（按 block.id） */
export function getSanitizedBlockHtml(
  block: DocumentBlock,
  cache: Map<number, string>
): string {
  const cached = cache.get(block.id)
  if (cached !== undefined) return cached
  const sanitized = sanitizeBlock(block.html)
  cache.set(block.id, sanitized)
  return sanitized
}
