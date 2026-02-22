import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:59999',
        changeOrigin: true,
        secure: false,
      },
      '/dashboardHub': {
        target: 'ws://127.0.0.1:59999',
        ws: true,
        changeOrigin: true,
        secure: false,
        // Sometimes SignalR needs rewrite if path differs, but here it matches.
        // Adding headers to help backend trust proxy
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('Sending WebSocket Request to the Target:', req.method, req.url);
          });
        }
      }
    }
  }
})
