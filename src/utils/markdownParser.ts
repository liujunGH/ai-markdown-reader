import MarkdownIt from 'markdown-it'
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
import 'prismjs/components/prism-html'
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

function highlightCode(str: string, lang: string): string {
  if (lang === 'mermaid') {
    const encoded = encodeBase64(str)
    return `<div class="mermaid-code" data-content="${encoded}"></div>`
  }
  
  if (lang && Prism.languages[lang]) {
    try {
      const highlighted = Prism.highlight(str, Prism.languages[lang], lang)
      return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`
    } catch {
      // Fallback to escaped HTML
    }
  }
  const escaped = escapeHtml(str)
  return `<pre class="language-text"><code class="language-text">${escaped}</code></pre>`
}

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: highlightCode
})

export function parseMarkdown(content: string): string {
  return md.render(content)
}

export { md }
