import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/users': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/public': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/requisitions': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/applications': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/interviews': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/notifications': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/rm': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/hm': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/candidates': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/settings': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/mail': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ats': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/files': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/jd': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/generate-jd': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  }
})