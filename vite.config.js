import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
// Prefer FrontEnd/apps (single source of truth for tournament-bracket, ladder, etc.); fallback to repo apps when FrontEnd/apps missing (e.g. deploy)
const frontEndApps = path.join(__dirname, 'apps')
const appsDir = existsSync(frontEndApps)
  ? frontEndApps
  : path.join(repoRoot, 'apps')
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