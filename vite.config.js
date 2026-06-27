import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, copyFileSync } from 'fs'

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

/** Copy arcade-tv index to /arcade/tv/ so production static hosts serve the TV app at that URL. */
function arcadeTvAliasBuildPlugin() {
  return {
    name: 'arcade-tv-alias-build',
    closeBundle() {
      const outDir = path.join(__dirname, 'dist')
      const src = path.join(outDir, 'arcade-tv', 'index.html')
      const destDir = path.join(outDir, 'arcade', 'tv')
      const dest = path.join(destDir, 'index.html')
      if (!existsSync(src)) return
      mkdirSync(destDir, { recursive: true })
      copyFileSync(src, dest)
    }
  }
}

/** Static subapps must serve public subfolder index, not the React SPA. */
function staticSubappIndexPlugin() {
  const apps = ['arcade-kiosk-lite', 'arcade-tv', 'arcade-events', 'arcade-player', 'dues-tracker']
  const tvAliases = ['/arcade/tv', '/arcade/leaderboard-tv']
  return {
    name: 'static-subapp-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url || '').split('?')[0]
        for (const alias of tvAliases) {
          if (url === alias || url === alias + '/') {
            req.url = '/arcade-tv/index.html'
            break
          }
        }
        for (const app of apps) {
          if (url === `/${app}` || url === `/${app}/`) {
            req.url = `/${app}/index.html`
            break
          }
        }
        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react(), staticSubappIndexPlugin(), arcadeTvAliasBuildPlugin()],
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
    host: true,
    fs: {
      allow: [repoRoot]
    },
    watch: {
      // Helps detect changes to shared/ (outside FrontEnd root) on Windows
      usePolling: true
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})