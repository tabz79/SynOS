import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  worker: {
    plugins: () => [wasm(), topLevelAwait()]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cornerstonejs/tools": "@cornerstonejs/tools/dist/umd/index.js"
    },
  },
  build: {
    outDir: 'dist-build',
    emptyOutDir: true
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
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
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      },
      '/branchOperationsHub': {
        target: 'ws://127.0.0.1:59999',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      },
      '/radiologyCollaborationHub': {
        target: 'ws://127.0.0.1:59999',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      }
    }
  }
})
