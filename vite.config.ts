import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-markdown': ['markdown-it', 'markdown-it-emoji', 'markdown-it-katex'],
          'mermaid': ['mermaid'],
          'katex': ['katex'],
          'prism': ['prismjs'],
        }
      }
    }
  }
})
