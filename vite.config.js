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
const rootShared = path.join(repoRoot, 'shared')
const sharedDir = existsSync(rootShared)
  ? rootShared
  : path.join(__dirname, 'shared')
// Log which shared is used so Render build logs show if deploy is using correct source
if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined') {
  console.log('[vite] @shared resolved to:', sharedDir, existsSync(rootShared) ? '(repo root shared)' : '(FrontEnd/shared fallback)')
}

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': sharedDir,
      '@apps': appsDir,
      '@frontend': path.resolve(__dirname, 'src'),
      // Resolve these from FrontEnd node_modules when imported by root apps/ or shared/
      'stream-chat': path.resolve(__dirname, 'node_modules', 'stream-chat'),
      'stream-chat-react': path.resolve(__dirname, 'node_modules', 'stream-chat-react'),
      'prop-types': path.resolve(__dirname, 'node_modules', 'prop-types'),
      'react-icons': path.resolve(__dirname, 'node_modules', 'react-icons'),
      'react-router-dom': path.resolve(__dirname, 'node_modules', 'react-router-dom'),
      'date-fns': path.resolve(__dirname, 'node_modules', 'date-fns'),
      'react-datepicker': path.resolve(__dirname, 'node_modules', 'react-datepicker'),
      'emailjs-com': path.resolve(__dirname, 'node_modules', 'emailjs-com')
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