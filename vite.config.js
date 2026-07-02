import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy hacia n8n para que el simulador llame el webhook sin toparse con CORS
    // durante el desarrollo. El frontend usa /n8n/... y aquí se reescribe al host real.
    proxy: {
      '/n8n': {
        target: 'https://n8n-n8n.pzqn6b.easypanel.host',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/n8n/, ''),
      },
    },
  },
})
