import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/lm': {
        target: 'http://localhost:1234/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lm/, '')
      }
    }
  }
})
