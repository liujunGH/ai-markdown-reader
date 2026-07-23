/**
 * Markdown 解析器配置（单一真相源）
 *
 * 复刻现有 worker 的 markdown-it 配置：html:false / linkify / typographer /
 * KaTeX dollars / emoji / Prism 高亮（含 mermaid/diff 特殊处理）。
 *
 * tokenizer 只产出 markdown-it 实例 + Prism，不负责渲染成整篇 HTML。
 * blockModel 用 md.parse 拿 token 流来切块，renderer 用 md.render 渲染单块。
 *
 * 被 parse.worker 和主线程 fallback 共用，保证两路解析结果一致。
 */
import type MarkdownIt from 'markdown-it'
import type PrismType from 'prismjs'

type ParserBundle = {
  md: MarkdownIt
  prism: typeof PrismType
}

type ModuleWithDefault<T> = {
  default?: T
}

const loadedLanguages = new Set<string>(['markup'])

function moduleDefault<T>(module: T | ModuleWithDefault<T>): T {
  return (module as ModuleWithDefault<T>).default ?? (module as T)
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binString)
}

export function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

/** 解析器单例（记忆化，避免每篇文档都重新 import 整个解析栈） */
let parserPromise: Promise<ParserBundle> | null = null

/**
 * 创建并配置 markdown-it 实例（含 KaTeX/emoji/Prism 高亮）。
 * 配置必须与旧 worker.getParser 逐项对齐，否则渲染结果会变。
 *
 * 记忆化：首次调用装配解析栈（import markdown-it/prism/katex/emoji + 11 语言），
 * 后续直接返回缓存的 Promise。装配成本只付一次。
 */
export function createParser(): Promise<ParserBundle> {
  if (parserPromise) return parserPromise
  parserPromise = doCreateParser()
  return parserPromise
}

async function doCreateParser(): Promise<ParserBundle> {
  // Prism 在 worker 内注册自己的 message handler，会干扰我们的协议。
  // 必须在 import prismjs 之前设这个 flag。
  ;(self as unknown as { Prism?: { disableWorkerMessageHandler: boolean } }).Prism = {
    disableWorkerMessageHandler: true,
  }

  const [MarkdownItModule, PrismModule, texmathModule, katexModule, emojiModule] = await Promise.all([
    import('markdown-it'),
    import('prismjs'),
    import('markdown-it-texmath'),
    import('katex'),
    import('markdown-it-emoji'),
  ])

  const Prism = moduleDefault<typeof PrismType>(PrismModule)
  // 预加载常用语言（与旧 worker 一致）
  await Promise.all([
    import('prismjs/components/prism-markup'),
    import('prismjs/components/prism-css'),
    import('prismjs/components/prism-javascript'),
    import('prismjs/components/prism-typescript'),
    import('prismjs/components/prism-jsx'),
    import('prismjs/components/prism-tsx'),
    import('prismjs/components/prism-python'),
    import('prismjs/components/prism-java'),
    import('prismjs/components/prism-bash'),
    import('prismjs/components/prism-json'),
    import('prismjs/components/prism-markdown'),
  ])
  ;['javascript', 'typescript', 'python', 'java', 'bash', 'json', 'css', 'markdown', 'jsx', 'tsx'].forEach(
    (lang) => loadedLanguages.add(lang)
  )

  const MarkdownItCtor = moduleDefault<typeof MarkdownIt>(MarkdownItModule)
  const texmath = moduleDefault(texmathModule)
  const katexExports = katexModule as unknown as { default?: { renderToString?: unknown } }
  const katex = katexExports.default?.renderToString ? katexExports.default : katexModule
  const emojiExports = emojiModule as typeof emojiModule & { default?: typeof emojiModule }
  const emojiFull = emojiExports.full ?? emojiExports.default?.full

  const md: MarkdownIt = new MarkdownItCtor({
    html: false,
    linkify: true,
    typographer: true,
    highlight: (str: string, lang: string) => highlightCode(Prism, str, lang),
  })

  md.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: {
      output: 'html',
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    },
  })
  if (emojiFull) {
    md.use(emojiFull)
  }

  return { md, prism: Prism }
}

/** 按需加载 Prism 语言（文档内出现 ```lang 时） */
export async function loadPrismLanguage(prism: typeof PrismType, lang: string): Promise<void> {
  if (loadedLanguages.has(lang)) return
  if (!lang || prism.languages[lang]) return
  try {
    await import(/* @vite-ignore */ `prismjs/components/prism-${lang}`)
    loadedLanguages.add(lang)
  } catch {
    // 语言不可用，静默降级为纯文本
  }
}

/** 预扫描文档内出现的代码语言，返回需加载的语言列表 */
export function scanCodeLanguages(content: string): string[] {
  const langMatches = content.match(/```([a-zA-Z0-9_-]+)/g)
  if (!langMatches) return []
  return [...new Set(langMatches.map((m) => m.slice(3)))]
}

/**
 * 代码高亮（含 mermaid/diff 特殊处理）。与旧 worker.highlightCode 一致。
 * - mermaid: 输出占位 div（主线程异步渲染 SVG）
 * - diff: +/-/@@ 行着色
 * - 其它: prism.highlight
 */
export function highlightCode(prism: typeof PrismType, str: string, lang: string): string {
  if (lang === 'mermaid') {
    const encoded = encodeBase64(str)
    return `<div class="mermaid-code" data-content="${encoded}"></div>`
  }

  if (lang === 'diff') {
    const lines = str.split('\n')
    const highlighted = lines
      .map((line) => {
        if (line.startsWith('+ ')) return `<span class="diff-add">${escapeHtml(line)}</span>`
        if (line.startsWith('- ')) return `<span class="diff-del">${escapeHtml(line)}</span>`
        if (line.startsWith('@@')) return `<span class="diff-meta">${escapeHtml(line)}</span>`
        return escapeHtml(line)
      })
      .join('\n')
    const lineCount = lines.length
    const codeHash = simpleHash(str.slice(0, 20))
    return `<pre class="language-diff" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-diff">${highlighted}</code></pre>`
  }

  const lineCount = str.split('\n').length
  const codeHash = simpleHash(str.slice(0, 20))

  if (lang && prism.languages[lang]) {
    try {
      const highlighted = prism.highlight(str, prism.languages[lang], lang)
      return `<pre class="language-${lang}" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-${lang}">${highlighted}</code></pre>`
    } catch {
      // 降级到纯文本
    }
  }
  const escaped = escapeHtml(str)
  return `<pre class="language-text" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-text">${escaped}</code></pre>`
}

/**
 * WikiLink 后处理：[[target]] / [[target|display]] → <a class="wikilink">
 * 与旧 worker.postProcessHtml 一致。
 */
export function processWikiLinks(rawHtml: string): string {
  return rawHtml.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, display) => {
    const text = display || target
    const altTarget = display ? ` data-alt-target="${encodeURIComponent(display)}"` : ''
    return `<a href="wikilink://${encodeURIComponent(target)}" class="wikilink"${altTarget}>${escapeHtml(text)}</a>`
  })
}
