import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-shell-session'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-xml-doc'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-regex'
import 'prismjs/components/prism-objectivec'
import 'prismjs/components/prism-scala'
import 'prismjs/components/prism-haskell'
import 'prismjs/components/prism-lua'
import 'prismjs/components/prism-perl'
import 'prismjs/components/prism-r'
import mk from 'markdown-it-katex'
import { full } from 'markdown-it-emoji'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binString)
}

function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function highlightCode(str: string, lang: string): string {
  if (lang === 'mermaid') {
    const encoded = encodeBase64(str)
    return `<div class="mermaid-code" data-content="${encoded}"></div>`
  }

  if (lang === 'diff') {
    const lines = str.split('\n')
    const highlighted = lines.map(line => {
      if (line.startsWith('+ ')) return `<span class="diff-add">${escapeHtml(line)}</span>`
      if (line.startsWith('- ')) return `<span class="diff-del">${escapeHtml(line)}</span>`
      if (line.startsWith('@@')) return `<span class="diff-meta">${escapeHtml(line)}</span>`
      return escapeHtml(line)
    }).join('\n')
    const lineCount = lines.length
    const codeHash = simpleHash(str.slice(0, 20))
    return `<pre class="language-diff" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-diff">${highlighted}</code></pre>`
  }

  const lineCount = str.split('\n').length
  const codeHash = simpleHash(str.slice(0, 20))

  if (lang && Prism.languages[lang]) {
    try {
      const highlighted = Prism.highlight(str, Prism.languages[lang], lang)
      return `<pre class="language-${lang}" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-${lang}">${highlighted}</code></pre>`
    } catch {
      // Fallback to escaped HTML
    }
  }
  const escaped = escapeHtml(str)
  return `<pre class="language-text" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-text">${escaped}</code></pre>`
}

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: highlightCode
})

md.use(mk)
md.use(full)

export function parseMarkdown(content: string): string {
  let rawHtml = md.render(content)
  // WikiLink: [[filename]] 或 [[display|filename]]
  rawHtml = rawHtml.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target, display) => {
      const text = display || target
      return `<a href="wikilink://${encodeURIComponent(target)}" class="wikilink">${escapeHtml(text)}</a>`
    }
  )
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      // Markdown 标准标签
      'p', 'br', 'hr', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'strong', 'b', 'em', 'i', 'strike', 'del', 's',
      'a', 'img',
      'code', 'pre', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'sup', 'sub',
      // Mermaid 和自定义容器
      'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
      'text', 'tspan', 'defs', 'marker', 'use', 'foreignObject',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'class', 'id', 'style',
      'data-content', 'data-code', 'data-lines', 'data-code-hash',
      'xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width',
      'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
      'points', 'transform', 'marker-end', 'marker-start',
      'font-size', 'font-family', 'text-anchor', 'dominant-baseline',
    ],
  })
}

export { md }
