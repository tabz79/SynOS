// File: web/vite.config.ts
// Author: Gemini
// Date: 2025-11-13

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Frontend development server port
    open: true, // Open browser automatically
  }
})
