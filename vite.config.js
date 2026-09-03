import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, copyFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
// Prefer repo-root apps/ (monorepo single source of truth); fall back to FrontEnd/apps for FrontEnd-only trees
const rootApps = path.join(repoRoot, 'apps')
const frontEndApps = path.join(__dirname, 'apps')
const appsDir = existsSync(rootApps) ? rootApps : frontEndApps
const rootShared = path.join(repoRoot, 'shared')
const sharedDir = existsSync(rootShared)
  ? rootShared
  : path.join(__dirname, 'shared')
// Log which sources are used so Render / local logs show correct resolve paths
if (typeof process !== 'undefined') {
  const usingRootApps = existsSync(rootApps)
  const usingRootShared = existsSync(rootShared)
  console.log(
    '[vite] @apps resolved to:',
    appsDir,
    usingRootApps ? '(repo root apps)' : '(FrontEnd/apps fallback)'
  )
  if (process.env.NODE_ENV === 'production') {
    console.log(
      '[vite] @shared resolved to:',
      sharedDir,
      usingRootShared ? '(repo root shared)' : '(FrontEnd/shared fallback)'
    )
  }
}

/** Copy pdf.js worker so the by-laws viewer can draw pages without Chrome's PDF/Adobe bar. */
function copyPdfWorkerPlugin() {
  const src = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js')
  const destDir = path.join(__dirname, 'public', 'usapl')
  const dest = path.join(destDir, 'pdf.worker.min.js')
  return {
    name: 'copy-pdf-worker',
    buildStart() {
      if (!existsSync(src)) return
      mkdirSync(destDir, { recursive: true })
      copyFileSync(src, dest)
    }
  }
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
  plugins: [react(), copyPdfWorkerPlugin(), staticSubappIndexPlugin(), arcadeTvAliasBuildPlugin()],
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
      'emailjs-com': path.resolve(__dirname, 'node_modules', 'emailjs-com'),
      'pdfjs-dist': path.resolve(__dirname, 'node_modules', 'pdfjs-dist'),
      canvas: path.resolve(__dirname, 'src', 'empty-module.js'),
      '@stripe/react-stripe-js': path.resolve(__dirname, 'node_modules', '@stripe/react-stripe-js'),
      '@stripe/stripe-js': path.resolve(__dirname, 'node_modules', '@stripe/stripe-js')
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
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    outDir: 'dist',
    // Source maps for this bundle are ~14 MB and exhaust the heap on Render's
    // build container. Opt in locally with VITE_SOURCEMAP=true.
    sourcemap: process.env.VITE_SOURCEMAP === 'true'
  }
})