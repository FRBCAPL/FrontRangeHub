import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
// When Render (or similar) uses Root Directory = FrontEnd, ../apps may not exist; use in-FrontEnd copies if present
const appsDir = existsSync(path.join(repoRoot, 'apps'))
  ? path.join(repoRoot, 'apps')
  : path.join(__dirname, 'apps')
const sharedDir = existsSync(path.join(repoRoot, 'shared'))
  ? path.join(repoRoot, 'shared')
  : path.join(__dirname, 'shared')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': sharedDir,
      '@apps': appsDir,
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