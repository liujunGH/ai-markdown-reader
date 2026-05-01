declare module 'markdown-it-texmath' {
  import MarkdownIt from 'markdown-it'
  import type { KatexOptions } from 'katex'

  interface TexmathOptions {
    engine?: {
      renderToString: (tex: string, options?: KatexOptions) => string
    }
    delimiters?: string | string[]
    katexOptions?: KatexOptions
    macros?: KatexOptions['macros']
    outerSpace?: boolean
  }

  const plugin: MarkdownIt.PluginWithOptions<TexmathOptions>
  export default plugin
}
