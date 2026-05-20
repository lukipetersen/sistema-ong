import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, '.'),
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  css: {
    postcss: resolve(__dirname, 'postcss.config.js'),
  },
  server: {
    port: 5173,
    hmr: { overlay: false },
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
