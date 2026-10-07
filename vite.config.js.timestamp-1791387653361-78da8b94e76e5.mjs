// vite.config.js
import { defineConfig } from "file:///C:/MY%20APPS/Front%20Range%20Pool%20Hub%20App/FrontEnd/node_modules/vite/dist/node/index.js";
import react from "file:///C:/MY%20APPS/Front%20Range%20Pool%20Hub%20App/FrontEnd/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, copyFileSync } from "fs";
var __vite_injected_original_import_meta_url = "file:///C:/MY%20APPS/Front%20Range%20Pool%20Hub%20App/Frontend/vite.config.js";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var repoRoot = path.resolve(__dirname, "..");
var rootApps = path.join(repoRoot, "apps");
var frontEndApps = path.join(__dirname, "apps");
var appsDir = existsSync(rootApps) ? rootApps : frontEndApps;
var rootShared = path.join(repoRoot, "shared");
var sharedDir = existsSync(rootShared) ? rootShared : path.join(__dirname, "shared");
if (typeof process !== "undefined") {
  const usingRootApps = existsSync(rootApps);
  const usingRootShared = existsSync(rootShared);
  console.log(
    "[vite] @apps resolved to:",
    appsDir,
    usingRootApps ? "(repo root apps)" : "(FrontEnd/apps fallback)"
  );
  if (process.env.NODE_ENV === "production") {
    console.log(
      "[vite] @shared resolved to:",
      sharedDir,
      usingRootShared ? "(repo root shared)" : "(FrontEnd/shared fallback)"
    );
  }
}
function copyPdfWorkerPlugin() {
  const src = path.join(__dirname, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
  const destDir = path.join(__dirname, "public", "usapl");
  const dest = path.join(destDir, "pdf.worker.min.js");
  return {
    name: "copy-pdf-worker",
    buildStart() {
      if (!existsSync(src))
        return;
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);
    }
  };
}
function arcadeTvAliasBuildPlugin() {
  return {
    name: "arcade-tv-alias-build",
    closeBundle() {
      const outDir = path.join(__dirname, "dist");
      const src = path.join(outDir, "arcade-tv", "index.html");
      const destDir = path.join(outDir, "arcade", "tv");
      const dest = path.join(destDir, "index.html");
      if (!existsSync(src))
        return;
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);
    }
  };
}
function staticSubappIndexPlugin() {
  const apps = ["arcade-kiosk-lite", "arcade-tv", "arcade-events", "arcade-player", "dues-tracker"];
  const tvAliases = ["/arcade/tv", "/arcade/leaderboard-tv"];
  return {
    name: "static-subapp-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url || "").split("?")[0];
        for (const alias of tvAliases) {
          if (url === alias || url === alias + "/") {
            req.url = "/arcade-tv/index.html";
            break;
          }
        }
        for (const app of apps) {
          if (url === `/${app}` || url === `/${app}/`) {
            req.url = `/${app}/index.html`;
            break;
          }
        }
        next();
      });
    }
  };
}
var vite_config_default = defineConfig({
  root: __dirname,
  plugins: [react(), copyPdfWorkerPlugin(), staticSubappIndexPlugin(), arcadeTvAliasBuildPlugin()],
  resolve: {
    alias: {
      "@shared": sharedDir,
      "@apps": appsDir,
      "@frontend": path.resolve(__dirname, "src"),
      // Resolve these from FrontEnd node_modules when imported by root apps/ or shared/
      "stream-chat": path.resolve(__dirname, "node_modules", "stream-chat"),
      "stream-chat-react": path.resolve(__dirname, "node_modules", "stream-chat-react"),
      "prop-types": path.resolve(__dirname, "node_modules", "prop-types"),
      "react-icons": path.resolve(__dirname, "node_modules", "react-icons"),
      "react-router-dom": path.resolve(__dirname, "node_modules", "react-router-dom"),
      "date-fns": path.resolve(__dirname, "node_modules", "date-fns"),
      "react-datepicker": path.resolve(__dirname, "node_modules", "react-datepicker"),
      "emailjs-com": path.resolve(__dirname, "node_modules", "emailjs-com"),
      "pdfjs-dist": path.resolve(__dirname, "node_modules", "pdfjs-dist"),
      canvas: path.resolve(__dirname, "src", "empty-module.js"),
      "@stripe/react-stripe-js": path.resolve(__dirname, "node_modules", "@stripe/react-stripe-js"),
      "@stripe/stripe-js": path.resolve(__dirname, "node_modules", "@stripe/stripe-js")
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
      "/api": {
        target: "http://127.0.0.1:3080",
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ["pdfjs-dist"]
  },
  build: {
    outDir: "dist",
    // Source maps for this bundle are ~14 MB and exhaust the heap on Render's
    // build container. Opt in locally with VITE_SOURCEMAP=true.
    sourcemap: process.env.VITE_SOURCEMAP === "true"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxNWSBBUFBTXFxcXEZyb250IFJhbmdlIFBvb2wgSHViIEFwcFxcXFxGcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcTVkgQVBQU1xcXFxGcm9udCBSYW5nZSBQb29sIEh1YiBBcHBcXFxcRnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L01ZJTIwQVBQUy9Gcm9udCUyMFJhbmdlJTIwUG9vbCUyMEh1YiUyMEFwcC9Gcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcclxuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBjb3B5RmlsZVN5bmMgfSBmcm9tICdmcydcclxuXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpXHJcbmNvbnN0IHJlcG9Sb290ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJylcclxuLy8gUHJlZmVyIHJlcG8tcm9vdCBhcHBzLyAobW9ub3JlcG8gc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCk7IGZhbGwgYmFjayB0byBGcm9udEVuZC9hcHBzIGZvciBGcm9udEVuZC1vbmx5IHRyZWVzXHJcbmNvbnN0IHJvb3RBcHBzID0gcGF0aC5qb2luKHJlcG9Sb290LCAnYXBwcycpXHJcbmNvbnN0IGZyb250RW5kQXBwcyA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdhcHBzJylcclxuY29uc3QgYXBwc0RpciA9IGV4aXN0c1N5bmMocm9vdEFwcHMpID8gcm9vdEFwcHMgOiBmcm9udEVuZEFwcHNcclxuY29uc3Qgcm9vdFNoYXJlZCA9IHBhdGguam9pbihyZXBvUm9vdCwgJ3NoYXJlZCcpXHJcbmNvbnN0IHNoYXJlZERpciA9IGV4aXN0c1N5bmMocm9vdFNoYXJlZClcclxuICA/IHJvb3RTaGFyZWRcclxuICA6IHBhdGguam9pbihfX2Rpcm5hbWUsICdzaGFyZWQnKVxyXG4vLyBMb2cgd2hpY2ggc291cmNlcyBhcmUgdXNlZCBzbyBSZW5kZXIgLyBsb2NhbCBsb2dzIHNob3cgY29ycmVjdCByZXNvbHZlIHBhdGhzXHJcbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICBjb25zdCB1c2luZ1Jvb3RBcHBzID0gZXhpc3RzU3luYyhyb290QXBwcylcclxuICBjb25zdCB1c2luZ1Jvb3RTaGFyZWQgPSBleGlzdHNTeW5jKHJvb3RTaGFyZWQpXHJcbiAgY29uc29sZS5sb2coXHJcbiAgICAnW3ZpdGVdIEBhcHBzIHJlc29sdmVkIHRvOicsXHJcbiAgICBhcHBzRGlyLFxyXG4gICAgdXNpbmdSb290QXBwcyA/ICcocmVwbyByb290IGFwcHMpJyA6ICcoRnJvbnRFbmQvYXBwcyBmYWxsYmFjayknXHJcbiAgKVxyXG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcclxuICAgICAgJ1t2aXRlXSBAc2hhcmVkIHJlc29sdmVkIHRvOicsXHJcbiAgICAgIHNoYXJlZERpcixcclxuICAgICAgdXNpbmdSb290U2hhcmVkID8gJyhyZXBvIHJvb3Qgc2hhcmVkKScgOiAnKEZyb250RW5kL3NoYXJlZCBmYWxsYmFjayknXHJcbiAgICApXHJcbiAgfVxyXG59XHJcblxyXG4vKiogQ29weSBwZGYuanMgd29ya2VyIHNvIHRoZSBieS1sYXdzIHZpZXdlciBjYW4gZHJhdyBwYWdlcyB3aXRob3V0IENocm9tZSdzIFBERi9BZG9iZSBiYXIuICovXHJcbmZ1bmN0aW9uIGNvcHlQZGZXb3JrZXJQbHVnaW4oKSB7XHJcbiAgY29uc3Qgc3JjID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ25vZGVfbW9kdWxlcycsICdwZGZqcy1kaXN0JywgJ2J1aWxkJywgJ3BkZi53b3JrZXIubWluLmpzJylcclxuICBjb25zdCBkZXN0RGlyID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ3B1YmxpYycsICd1c2FwbCcpXHJcbiAgY29uc3QgZGVzdCA9IHBhdGguam9pbihkZXN0RGlyLCAncGRmLndvcmtlci5taW4uanMnKVxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnY29weS1wZGYtd29ya2VyJyxcclxuICAgIGJ1aWxkU3RhcnQoKSB7XHJcbiAgICAgIGlmICghZXhpc3RzU3luYyhzcmMpKSByZXR1cm5cclxuICAgICAgbWtkaXJTeW5jKGRlc3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICAgIGNvcHlGaWxlU3luYyhzcmMsIGRlc3QpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKiogQ29weSBhcmNhZGUtdHYgaW5kZXggdG8gL2FyY2FkZS90di8gc28gcHJvZHVjdGlvbiBzdGF0aWMgaG9zdHMgc2VydmUgdGhlIFRWIGFwcCBhdCB0aGF0IFVSTC4gKi9cclxuZnVuY3Rpb24gYXJjYWRlVHZBbGlhc0J1aWxkUGx1Z2luKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnYXJjYWRlLXR2LWFsaWFzLWJ1aWxkJyxcclxuICAgIGNsb3NlQnVuZGxlKCkge1xyXG4gICAgICBjb25zdCBvdXREaXIgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnZGlzdCcpXHJcbiAgICAgIGNvbnN0IHNyYyA9IHBhdGguam9pbihvdXREaXIsICdhcmNhZGUtdHYnLCAnaW5kZXguaHRtbCcpXHJcbiAgICAgIGNvbnN0IGRlc3REaXIgPSBwYXRoLmpvaW4ob3V0RGlyLCAnYXJjYWRlJywgJ3R2JylcclxuICAgICAgY29uc3QgZGVzdCA9IHBhdGguam9pbihkZXN0RGlyLCAnaW5kZXguaHRtbCcpXHJcbiAgICAgIGlmICghZXhpc3RzU3luYyhzcmMpKSByZXR1cm5cclxuICAgICAgbWtkaXJTeW5jKGRlc3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICAgIGNvcHlGaWxlU3luYyhzcmMsIGRlc3QpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKiogU3RhdGljIHN1YmFwcHMgbXVzdCBzZXJ2ZSBwdWJsaWMgc3ViZm9sZGVyIGluZGV4LCBub3QgdGhlIFJlYWN0IFNQQS4gKi9cclxuZnVuY3Rpb24gc3RhdGljU3ViYXBwSW5kZXhQbHVnaW4oKSB7XHJcbiAgY29uc3QgYXBwcyA9IFsnYXJjYWRlLWtpb3NrLWxpdGUnLCAnYXJjYWRlLXR2JywgJ2FyY2FkZS1ldmVudHMnLCAnYXJjYWRlLXBsYXllcicsICdkdWVzLXRyYWNrZXInXVxyXG4gIGNvbnN0IHR2QWxpYXNlcyA9IFsnL2FyY2FkZS90dicsICcvYXJjYWRlL2xlYWRlcmJvYXJkLXR2J11cclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ3N0YXRpYy1zdWJhcHAtaW5kZXgnLFxyXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIF9yZXMsIG5leHQpID0+IHtcclxuICAgICAgICBjb25zdCB1cmwgPSAocmVxLnVybCB8fCAnJykuc3BsaXQoJz8nKVswXVxyXG4gICAgICAgIGZvciAoY29uc3QgYWxpYXMgb2YgdHZBbGlhc2VzKSB7XHJcbiAgICAgICAgICBpZiAodXJsID09PSBhbGlhcyB8fCB1cmwgPT09IGFsaWFzICsgJy8nKSB7XHJcbiAgICAgICAgICAgIHJlcS51cmwgPSAnL2FyY2FkZS10di9pbmRleC5odG1sJ1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGNvbnN0IGFwcCBvZiBhcHBzKSB7XHJcbiAgICAgICAgICBpZiAodXJsID09PSBgLyR7YXBwfWAgfHwgdXJsID09PSBgLyR7YXBwfS9gKSB7XHJcbiAgICAgICAgICAgIHJlcS51cmwgPSBgLyR7YXBwfS9pbmRleC5odG1sYFxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBuZXh0KClcclxuICAgICAgfSlcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcm9vdDogX19kaXJuYW1lLFxyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBjb3B5UGRmV29ya2VyUGx1Z2luKCksIHN0YXRpY1N1YmFwcEluZGV4UGx1Z2luKCksIGFyY2FkZVR2QWxpYXNCdWlsZFBsdWdpbigpXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQHNoYXJlZCc6IHNoYXJlZERpcixcclxuICAgICAgJ0BhcHBzJzogYXBwc0RpcixcclxuICAgICAgJ0Bmcm9udGVuZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcclxuICAgICAgLy8gUmVzb2x2ZSB0aGVzZSBmcm9tIEZyb250RW5kIG5vZGVfbW9kdWxlcyB3aGVuIGltcG9ydGVkIGJ5IHJvb3QgYXBwcy8gb3Igc2hhcmVkL1xyXG4gICAgICAnc3RyZWFtLWNoYXQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzJywgJ3N0cmVhbS1jaGF0JyksXHJcbiAgICAgICdzdHJlYW0tY2hhdC1yZWFjdCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCAnc3RyZWFtLWNoYXQtcmVhY3QnKSxcclxuICAgICAgJ3Byb3AtdHlwZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzJywgJ3Byb3AtdHlwZXMnKSxcclxuICAgICAgJ3JlYWN0LWljb25zJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ25vZGVfbW9kdWxlcycsICdyZWFjdC1pY29ucycpLFxyXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCAncmVhY3Qtcm91dGVyLWRvbScpLFxyXG4gICAgICAnZGF0ZS1mbnMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzJywgJ2RhdGUtZm5zJyksXHJcbiAgICAgICdyZWFjdC1kYXRlcGlja2VyJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ25vZGVfbW9kdWxlcycsICdyZWFjdC1kYXRlcGlja2VyJyksXHJcbiAgICAgICdlbWFpbGpzLWNvbSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCAnZW1haWxqcy1jb20nKSxcclxuICAgICAgJ3BkZmpzLWRpc3QnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzJywgJ3BkZmpzLWRpc3QnKSxcclxuICAgICAgY2FudmFzOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJywgJ2VtcHR5LW1vZHVsZS5qcycpLFxyXG4gICAgICAnQHN0cmlwZS9yZWFjdC1zdHJpcGUtanMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzJywgJ0BzdHJpcGUvcmVhY3Qtc3RyaXBlLWpzJyksXHJcbiAgICAgICdAc3RyaXBlL3N0cmlwZS1qcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCAnQHN0cmlwZS9zdHJpcGUtanMnKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIGZzOiB7XHJcbiAgICAgIGFsbG93OiBbcmVwb1Jvb3RdXHJcbiAgICB9LFxyXG4gICAgd2F0Y2g6IHtcclxuICAgICAgLy8gSGVscHMgZGV0ZWN0IGNoYW5nZXMgdG8gc2hhcmVkLyAob3V0c2lkZSBGcm9udEVuZCByb290KSBvbiBXaW5kb3dzXHJcbiAgICAgIHVzZVBvbGxpbmc6IHRydWVcclxuICAgIH0sXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjMwODAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFsncGRmanMtZGlzdCddXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICAvLyBTb3VyY2UgbWFwcyBmb3IgdGhpcyBidW5kbGUgYXJlIH4xNCBNQiBhbmQgZXhoYXVzdCB0aGUgaGVhcCBvbiBSZW5kZXInc1xyXG4gICAgLy8gYnVpbGQgY29udGFpbmVyLiBPcHQgaW4gbG9jYWxseSB3aXRoIFZJVEVfU09VUkNFTUFQPXRydWUuXHJcbiAgICBzb3VyY2VtYXA6IHByb2Nlc3MuZW52LlZJVEVfU09VUkNFTUFQID09PSAndHJ1ZSdcclxuICB9XHJcbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VSxTQUFTLG9CQUFvQjtBQUNyVyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsWUFBWSxXQUFXLG9CQUFvQjtBQUptSixJQUFNLDJDQUEyQztBQU14UCxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUM3RCxJQUFNLFdBQVcsS0FBSyxRQUFRLFdBQVcsSUFBSTtBQUU3QyxJQUFNLFdBQVcsS0FBSyxLQUFLLFVBQVUsTUFBTTtBQUMzQyxJQUFNLGVBQWUsS0FBSyxLQUFLLFdBQVcsTUFBTTtBQUNoRCxJQUFN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
