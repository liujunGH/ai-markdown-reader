import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  worker: {
    format: 'es',
  },
  build: {
    // Mermaid is loaded with dynamic import in the renderer. Advanced diagram
    // layouts can pull in ELK as a large async chunk, so keep the warning limit
    // above that known on-demand artifact while still surfacing unexpected bloat.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined

          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (/\/node_modules\/(markdown-it|markdown-it-emoji|markdown-it-texmath)\//.test(id)) return 'vendor-markdown'
          if (id.includes('/node_modules/katex/')) return 'katex'
          if (id.includes('/node_modules/prismjs/')) return 'prism'
          return undefined
        },
      }
    }
  }
})
