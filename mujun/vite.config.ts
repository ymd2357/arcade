import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/arcade/mujun/',
  resolve: {
    alias: { '@': '/src' }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html'
    }
  }
})
