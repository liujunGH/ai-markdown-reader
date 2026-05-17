import type MarkdownIt from 'markdown-it'
import type PrismType from 'prismjs'

type ParserBundle = {
  md: MarkdownIt
  prism: typeof PrismType
}

type ModuleWithDefault<T> = {
  default?: T
}

let parserPromise: Promise<ParserBundle> | null = null
const loadedLanguages = new Set<string>(['markup'])

function moduleDefault<T>(module: T | ModuleWithDefault<T>): T {
  return (module as ModuleWithDefault<T>).default ?? module as T
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

async function getParser(): Promise<ParserBundle> {
  if (!parserPromise) {
    parserPromise = (async () => {
      // Prism registers its own worker message listener unless this flag exists
      // before the module is evaluated. Our worker protocol uses objects, not
      // Prism's JSON string payload, so the default handler would throw.
      ;(self as unknown as { Prism?: { disableWorkerMessageHandler: boolean } }).Prism = {
        disableWorkerMessageHandler: true,
      }

      const [
        MarkdownItModule,
        PrismModule,
        texmathModule,
        katexModule,
        emojiModule,
      ] = await Promise.all([
        import('markdown-it'),
        import('prismjs'),
        import('markdown-it-texmath'),
        import('katex'),
        import('markdown-it-emoji'),
      ])

      const Prism = moduleDefault<typeof PrismType>(PrismModule)
      await import('prismjs/components/prism-markup')
      await import('prismjs/components/prism-css')
      await import('prismjs/components/prism-javascript')
      await import('prismjs/components/prism-typescript')
      await import('prismjs/components/prism-jsx')
      await import('prismjs/components/prism-tsx')
      await import('prismjs/components/prism-python')
      await import('prismjs/components/prism-java')
      await import('prismjs/components/prism-bash')
      await import('prismjs/components/prism-json')
      await import('prismjs/components/prism-markdown')
      ;['javascript', 'typescript', 'python', 'java', 'bash', 'json', 'css', 'markdown', 'jsx', 'tsx'].forEach(lang => {
        loadedLanguages.add(lang)
      })

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
    })()
  }

  return parserPromise
}

async function loadPrismLanguage(prism: typeof PrismType, lang: string): Promise<void> {
  if (loadedLanguages.has(lang)) return
  if (!lang || prism.languages[lang]) return
  try {
    await import(/* @vite-ignore */ `prismjs/components/prism-${lang}`)
    loadedLanguages.add(lang)
  } catch {
    // Language not available
  }
}

function highlightCode(prism: typeof PrismType, str: string, lang: string): string {
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

  if (lang && prism.languages[lang]) {
    try {
      const highlighted = prism.highlight(str, prism.languages[lang], lang)
      return `<pre class="language-${lang}" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-${lang}">${highlighted}</code></pre>`
    } catch {
      // Fallback
    }
  }
  const escaped = escapeHtml(str)
  return `<pre class="language-text" data-lines="${lineCount}" data-code-hash="${codeHash}"><code class="language-text">${escaped}</code></pre>`
}

function postProcessHtml(rawHtml: string): string {
  // WikiLink: [[filename]] 或 [[filename|display]]
  return rawHtml.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target, display) => {
      const text = display || target
      const altTarget = display ? ` data-alt-target="${encodeURIComponent(display)}"` : ''
      return `<a href="wikilink://${encodeURIComponent(target)}" class="wikilink"${altTarget}>${escapeHtml(text)}</a>`
    }
  )
}

self.onmessage = async (e: MessageEvent<{ content: string; id: number }>) => {
  const { content, id } = e.data

  try {
    const { md, prism } = await getParser()

    const langMatches = content.match(/```([a-zA-Z0-9_-]+)/g)
    if (langMatches) {
      const langs = [...new Set(langMatches.map(m => m.slice(3)))]
      await Promise.all(langs.map(lang => loadPrismLanguage(prism, lang)))
    }

    const rawHtml = md.render(content)
    const html = postProcessHtml(rawHtml)

    self.postMessage({ id, html })
  } catch (error) {
    self.postMessage({
      id,
      html: `<pre class="language-text"><code class="language-text">${escapeHtml(content)}</code></pre>`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
