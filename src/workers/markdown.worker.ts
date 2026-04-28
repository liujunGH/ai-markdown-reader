import MarkdownIt from 'markdown-it'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import mk from 'markdown-it-katex'
import { full } from 'markdown-it-emoji'

const loadedLanguages = new Set<string>()
loadedLanguages.add('markup')

async function loadPrismLanguage(lang: string): Promise<void> {
  if (loadedLanguages.has(lang)) return
  if (!lang || Prism.languages[lang]) return
  try {
    await import(`prismjs/components/prism-${lang}`)
    loadedLanguages.add(lang)
  } catch {
    // Language not available
  }
}

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
      // Fallback
    }
  }
  const escaped = escapeHtml(str)
  return `<pre class="language-text" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-text">${escaped}</code></pre>`
}

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: highlightCode
})

md.use(mk)
md.use(full)

function postProcessHtml(rawHtml: string): string {
  // WikiLink: [[filename]] 或 [[display|filename]]
  rawHtml = rawHtml.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target, display) => {
      const text = display || target
      return `<a href="wikilink://${encodeURIComponent(target)}" class="wikilink">${escapeHtml(text)}</a>`
    }
  )
  return rawHtml
}

self.onmessage = async (e: MessageEvent<{ content: string; id: number }>) => {
  const { content, id } = e.data

  // Pre-load prism languages
  const langMatches = content.match(/```([a-zA-Z0-9_-]+)/g)
  if (langMatches) {
    const langs = [...new Set(langMatches.map(m => m.slice(3)))]
    await Promise.all(langs.map(loadPrismLanguage))
  }

  const rawHtml = md.render(content)
  const html = postProcessHtml(rawHtml)

  self.postMessage({ id, html })
}
