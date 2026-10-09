import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Development: the Laravel API runs on :8000 and is proxied, so the app talks
// to its own origin. Production: `npm run build` writes into the Laravel app
// (backend/public/app/), which serves the SPA and the API from one domain.
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/app/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: process.env.BUILD_OUT_DIR || '../backend/public/app',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': backend,
      '/uploads': backend,
    },
  },
}))
