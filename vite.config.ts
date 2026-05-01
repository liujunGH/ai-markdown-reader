import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Mermaid is loaded with dynamic import in the renderer. Advanced diagram
    // layouts can pull in ELK as a large async chunk, so keep the warning limit
    // above that known on-demand artifact while still surfacing unexpected bloat.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-markdown': ['markdown-it', 'markdown-it-emoji', 'markdown-it-texmath'],
          'katex': ['katex'],
          'prism': ['prismjs'],
          'mermaid': ['mermaid'],
        }
      }
    }
  }
})
