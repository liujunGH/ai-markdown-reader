type MermaidModule = typeof import('mermaid').default
type MermaidImporter = () => Promise<MermaidModule>

type MermaidSecurityLevel = 'strict' | 'loose' | 'antiscript' | 'sandbox'

interface MermaidInitializeOptions {
  securityLevel?: MermaidSecurityLevel
}

let mermaidModuleCache: MermaidModule | null = null
let mermaidPromiseCache: Promise<MermaidModule> | null = null
let mermaidImporter: MermaidImporter = () => import('mermaid').then((module) => module.default)

export function hasMermaidLoaded(): boolean {
  return mermaidModuleCache !== null
}

export async function loadMermaid(): Promise<MermaidModule> {
  if (mermaidModuleCache) return mermaidModuleCache

  if (!mermaidPromiseCache) {
    mermaidPromiseCache = mermaidImporter()
      .then((mermaid) => {
        mermaidModuleCache = mermaid
        return mermaidModuleCache
      })
      .catch((error) => {
        mermaidPromiseCache = null
        throw error
      })
  }

  return mermaidPromiseCache
}

export async function getInitializedMermaid(options: MermaidInitializeOptions = {}): Promise<MermaidModule> {
  const mermaid = await loadMermaid()
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'

  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: options.securityLevel ?? 'strict',
  })

  return mermaid
}

export function createMermaidRenderId(): string {
  return `mermaid-${Math.random().toString(36).substr(2, 9)}`
}

export function __resetMermaidLoaderForTests(): void {
  mermaidModuleCache = null
  mermaidPromiseCache = null
  mermaidImporter = () => import('mermaid').then((module) => module.default)
}

export function __setMermaidImporterForTests(importer: MermaidImporter): void {
  mermaidModuleCache = null
  mermaidPromiseCache = null
  mermaidImporter = importer
}

export async function renderMermaidSvg(
  code: string,
  options: MermaidInitializeOptions = {}
): Promise<string> {
  const mermaid = await getInitializedMermaid(options)
  const { svg } = await mermaid.render(createMermaidRenderId(), code)
  return svg
}
