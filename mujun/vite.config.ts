import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  resolve: {
    alias: { '@': '/src' }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'public/index.html'
    }
  }
})
