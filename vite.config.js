import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use repo root apps/shared so dev and production build use the same code
      '@shared': path.resolve(__dirname, '..', 'shared'),
      '@apps': path.resolve(__dirname, '..', 'apps'),
      '@frontend': path.resolve(__dirname, 'src'),
      // Resolve these from FrontEnd node_modules when imported by root apps/ or shared/
      'stream-chat': path.resolve(__dirname, 'node_modules', 'stream-chat'),
      'stream-chat-react': path.resolve(__dirname, 'node_modules', 'stream-chat-react'),
      'prop-types': path.resolve(__dirname, 'node_modules', 'prop-types')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})