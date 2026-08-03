/**
 * 块模型：把 markdown-it token 流切成 DocumentBlock[]
 *
 * 切块策略：遍历顶层 token，按块级元素边界切分。
 *  - 配对块（heading/paragraph/list/blockquote/table/math_block）：
 *    open token 开启新块，收集所有子 token 直到对应 close
 *  - 自闭合块（fence/hr/code_block/html_block）：单 token 成块
 *  - 连续的零散 inline token 合并成一个 'section' 块（兜底）
 *
 * 关键保证：绝不在表格/列表/代码块/引用内部切断。
 * 旧 VirtualMarkdown 按 160 行切分会拆散这些，新模型按语义边界切。
 *
 * 行号来自 token.map（markdown-it 提供，0-based），转为 1-based。
 */
import type MarkdownIt from 'markdown-it'
import type {
  BlockKind,
  BlockMeta,
  DocumentBlock,
  ParsedDocument,
} from '../types'
import { simpleHash } from './tokenizer'

/**
 * markdown-it 的 Token 类型。
 * @types/markdown-it 用 `export =` + namespace 导出，Token 无法用具名 import
 * 取到。这里从 md.parse 的返回类型推断，避免命名空间导入的兼容性问题。
 */
type Token = ReturnType<MarkdownIt['parse']>[number]

/** 顶层块级 token 的 type → BlockKind 映射（配对块：open...close） */
const BLOCK_OPEN_TYPES: Record<string, BlockKind> = {
  heading_open: 'heading',
  paragraph_open: 'paragraph',
  bullet_list_open: 'list',
  ordered_list_open: 'list',
  blockquote_open: 'blockquote',
  table_open: 'table',
}

/**
 * 自闭合块（nesting=0 的单 token，单 token 成块）。
 * 注意：math_block / math_block_eqno 在 texmath(dollars) 里是自闭合 token
 * （texmath.js:111 注释明写 "end token ... superfluous"），不能当配对块，
 * 否则 replace('_open','_close') 无效导致扫描时把下一个同类 token 误计为 open，
 * 永远找不到 close，吞掉后续所有 token。
 */
const BLOCK_SELF_TYPES: Record<string, BlockKind> = {
  fence: 'code',
  code_block: 'code',
  hr: 'hr',
  html_block: 'html',
  math_block: 'math',
  math_block_eqno: 'math',
}

/**
 * 标题 slugify（与旧渲染器一致：保留中文，小写，连字符化）。
 * 直接复用现有 MarkdownRenderer 的实现，保证锚点 id 不变。
 * 空结果兜底为 'heading'（DOM id 不能为空）。
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'heading'
}

/** 预估块高度（px）。用于虚拟列表初始化，滚动后由 measureElement 校正 */
function estimateBlockHeight(kind: BlockKind, lineCount: number, meta?: BlockMeta): number {
  // 粗略估算：按源码行数 × 行高 + 块间距。准确高度由虚拟列表测量覆盖。
  const baseLineHeight = 26
  switch (kind) {
    case 'heading':
      // 标题字号随级别变化：h1≈32px, h2≈28px...
      return 40 + (meta?.headingLevel ? Math.max(0, 6 - meta.headingLevel) * 2 : 0)
    case 'hr':
      return 32
    case 'code':
      return Math.max(60, (meta?.codeLines ?? lineCount) * baseLineHeight + 40)
    case 'table':
      return 120
    case 'math':
      return 80
    case 'list':
    case 'blockquote':
      return Math.max(48, lineCount * baseLineHeight + 16)
    default:
      return Math.max(32, lineCount * baseLineHeight + 12)
  }
}

/** 从标题块的 inline token 提取文本（去 emph/strong 等格式） */
function extractInlineText(tokens: Token[]): string {
  let text = ''
  for (const t of tokens) {
    if (t.type === 'text') text += t.content
    else if (t.type === 'code_inline') text += t.content
    else if (t.children) text += extractInlineText(t.children)
  }
  return text.trim()
}

/** 收集块的元数据（标题 id/级别、代码语言/行数、mermaid/图片/task list 标记） */
function collectBlockMeta(kind: BlockKind, blockTokens: Token[]): BlockMeta {
  const meta: BlockMeta = {}

  if (kind === 'heading') {
    const open = blockTokens[0]
    const level = open?.tag ? Number(open.tag.slice(1)) : undefined
    const inlineTokens = blockTokens.filter((t) => t.type === 'inline')
    const text = extractInlineText(inlineTokens)
    if (level) {
      meta.headingLevel = level
      meta.headingText = text
      meta.headingId = slugify(text)
    }
  }

  if (kind === 'code') {
    const fence = blockTokens.find((t) => t.type === 'fence' || t.type === 'code_block')
    if (fence) {
      meta.codeLang = fence.info || 'text'
      // 行数：按换行切分，去掉末尾空串（markdown-it 的 fence.content 末尾通常带 \n）
      const lines = fence.content.split('\n')
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
      meta.codeLines = lines.length
      if (fence.info === 'mermaid') meta.hasMermaid = true
    }
  }

  // 检测图片 / task list（扫描 inline token 的内容）
  const html = blockTokens.some((t) => t.type === 'inline')
    ? blockTokens
        .filter((t) => t.type === 'inline')
        .map((t) => t.content)
        .join('')
    : ''
  if (/!\[[^\]]*\]\([^)]+\)/.test(html) || /<img\s/i.test(html)) meta.hasLocalImage = true
  if (/\[[ xX]\]/.test(html)) meta.hasTaskList = true

  return meta
}

/** 取一组 token 里最大的 map[1]（块结束行，0-based）。close token 的 map 为 null，需遍历子 token。 */
function maxEndLine(blockTokens: Token[]): number {
  let max = 0
  for (const t of blockTokens) {
    if (t.map && t.map[1] > max) max = t.map[1]
  }
  return max
}

/**
 * 把 markdown-it token 流切成块。
 *
 * @param tokens  md.parse(content) 的结果
 * @param md      markdown-it 实例（保留参数兼容，token 已由它生成）
 * @param content 原始 markdown（用于总行数）
 */
export function splitIntoBlocks(
  tokens: Token[],
  _md: MarkdownIt,
  content: string,
  options: { blockIdOffset?: number; lineOffset?: number; totalLines?: number } = {},
): ParsedDocument {
  const blocks: DocumentBlock[] = []
  const outline: Array<{ id: string; level: number; text: string; line: number }> = []
  let blockId = options.blockIdOffset ?? 0
  const lineOffset = options.lineOffset ?? 0
  let depth = 0
  let i = 0
  const totalLines = options.totalLines ?? countLines(content)
  const lineOffsets = buildLineOffsets(content)

  // 用 0-based 行号，输出时转 1-based
  const toLine = (n: number | null | undefined): number => (n == null ? 0 : n + 1 + lineOffset)

  while (i < tokens.length) {
    const token = tokens[i]

    // 顶层（depth === 0）才开始新块
    if (depth === 0) {
      const openKind = BLOCK_OPEN_TYPES[token.type]
      const selfKind = BLOCK_SELF_TYPES[token.type]

      if (openKind) {
        // 配对块：找到对应 close
        const closeType = token.type.replace('_open', '_close')
        let j = i + 1
        let d = 1
        while (j < tokens.length && d > 0) {
          if (tokens[j].type === token.type) d++
          else if (tokens[j].type === closeType) d--
          if (d > 0) j++
        }
        const blockTokens = tokens.slice(i, j + 1)
        // endLine 取 blockTokens 内最大的 map[1]（close token 的 map 恒为 null）
        const endLine = maxEndLine(blockTokens)
        const startLineIndex = token.map?.[0] ?? 0
        blocks.push(buildBlock(
          blockId++,
          openKind,
          blockTokens,
          sliceLines(content, lineOffsets, startLineIndex, endLine),
          toLine(startLineIndex),
          endLine + lineOffset,
          Math.max(1, endLine - startLineIndex),
        ))

        if (openKind === 'heading') {
          const meta = blocks[blocks.length - 1].meta
          if (meta?.headingId && meta.headingLevel && meta.headingText) {
            outline.push({
              id: meta.headingId,
              level: meta.headingLevel,
              text: meta.headingText,
              line: blocks[blocks.length - 1].startLine,
            })
          }
        }
        i = j + 1
        continue
      }

      if (selfKind) {
        const blockTokens = [token]
        const startLine = toLine(token.map?.[0])
        const startLineIndex = token.map?.[0] ?? 0
        const endLineIndex = token.map?.[1] ?? startLineIndex + 1
        blocks.push(buildBlock(
          blockId++,
          selfKind,
          blockTokens,
          sliceLines(content, lineOffsets, startLineIndex, endLineIndex),
          startLine,
          endLineIndex + lineOffset,
          Math.max(1, endLineIndex - startLineIndex),
        ))
        i++
        continue
      }
    }

    // 深度跟踪（处理嵌套列表等）
    if (token.type.endsWith('_open')) depth++
    else if (token.type.endsWith('_close')) depth--
    i++
  }

  return { blocks, totalLines, outline }
}

function countLines(content: string): number {
  let lines = 1
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) === 10) lines += 1
  }
  return lines
}

function buildLineOffsets(content: string): number[] {
  const offsets = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) === 10) offsets.push(index + 1)
  }
  offsets.push(content.length)
  return offsets
}

function sliceLines(content: string, offsets: number[], startLine: number, endLine: number): string {
  const start = offsets[Math.max(0, startLine)] ?? 0
  const end = offsets[Math.max(startLine, endLine)] ?? content.length
  return content.slice(start, end).replace(/\r?\n$/, '')
}

/** 构建轻量块索引：只保留源码、元数据和高度估算，不在解析阶段生成 HTML。 */
function buildBlock(
  id: number,
  kind: BlockKind,
  blockTokens: Token[],
  source: string,
  startLine: number,
  endLine: number,
  lineCount: number,
): DocumentBlock {
  const meta = collectBlockMeta(kind, blockTokens)
  const estimatedHeight = estimateBlockHeight(kind, lineCount, meta)

  return {
    id,
    kind,
    source,
    startLine,
    endLine: endLine || startLine,
    estimatedHeight,
    meta,
  }
}

/**
 * 内容指纹（用于 task list checkbox / 代码折叠等持久化 key）。
 * 用全文 simpleHash（与旧 MarkdownRenderer 的 simpleHash(content) 一致），
 * 保证新旧版持久化 key 兼容，用户升级后折叠/勾选状态不丢失。
 */
export function contentHash(content: string): string {
  return simpleHash(content)
}
