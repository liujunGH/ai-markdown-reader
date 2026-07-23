/**
 * DOMPurify 净化配置（单一真相源）
 *
 * 取代旧代码里重复的两份白名单：
 *  - src/components/MarkdownRenderer/index.tsx 的 ALLOWED_TAGS/ATTR
 *  - src/utils/markdownParser.ts 的 ALLOWED_TAGS/ATTR
 *
 * 净化策略决策：净化在主线程做，但作用于"块"而非"整篇"。
 *  - worker 只负责解析 + 切块（md.parse + renderer.render），不做净化
 *  - 主线程在把块注入 DOM 前，对该块的 HTML 调 DOMPurify.sanitize
 *  - 块级净化成本远低于整篇（一次只净化可见的几个块），且避免 worker 内
 *    DOMPurify 的 DOM 依赖坑（dompurify 需要 window，worker 无原生 DOM）
 *
 * 这样既消除了主线程"整篇同步净化"的长任务，又规避了 worker 净化的复杂性。
 */
import DOMPurify from 'dompurify'

/**
 * DOMPurify 配置。白名单覆盖：
 * markdown-it 输出 + KaTeX HTML + Mermaid 占位 + WikiLink + 代码高亮 data-*
 * + 图片 data-original-src + SVG（mermaid 导出的 svg）。
 */
export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'strong', 'b', 'em', 'i', 'strike', 'del', 's',
    'a', 'img',
    'code', 'pre', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'sup', 'sub',
    // KaTeX 输出用到的额外标签
    'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup',
    'mfrac', 'mroot', 'msqrt', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd',
    'annotation', 'menclose', 'mfenced', 'mstyle', 'mover', 'munder', 'munderover',
    // Mermaid 容器（SVG 在主线程异步渲染后注入，也需放行）
    'svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'defs', 'use', 'foreignObject',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class', 'id',
    'data-content', 'data-code', 'data-lines', 'data-code-hash', 'data-alt-target',
    'data-original-src', 'data-mermaid-code', 'data-mermaid-rendered', 'data-latex',
    // KaTeX / SVG 属性
    'style', 'aria-hidden', 'role', 'viewBox', 'fill', 'stroke', 'stroke-width',
    'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'transform', 'points', 'xmlns', 'encoding', 'mathvariant', 'stretchy', 'fence',
    'separator', 'accent', 'accentunder', 'align', 'columnalign', 'rowalign',
    'columnspacing', 'rowspacing', 'columnlines', 'rowlines', 'frame', 'framespacing',
    'equalcolumns', 'equalrows', 'displaystyle', 'scriptlevel', 'lspace', 'rspace',
    'location', 'linethickness', 'bevelled', 'notation', 'form',
  ],
  // 允许 wikilink 协议 + 常见协议；禁 javascript:/data:(非图片)
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|wikilink):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
} as const

/** DOMPurify 配置类型 */
export type SanitizeOptions = typeof SANITIZE_CONFIG

/**
 * 净化单个块的 HTML（主线程调用）。
 * 替代旧代码对整篇 workerHtml 的同步净化——块级净化成本极低。
 */
export function sanitizeBlock(html: string): string {
  return DOMPurify.sanitize(
    html,
    SANITIZE_CONFIG as unknown as Parameters<typeof DOMPurify.sanitize>[1]
  )
}
