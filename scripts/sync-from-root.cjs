#!/usr/bin/env node
/**
 * Sync root shared/ and apps/ into FrontEnd/ (when run from monorepo).
 * Used by pre-push hook so you never have to remember to sync manually.
 */
const fs = require('fs');
const path = require('path');

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.vite', '.cursor']);
const frontendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(frontendDir, '..');
const sharedSrc = path.join(rootDir, 'shared');
const appsSrc = path.join(rootDir, 'apps');
const sharedDst = path.join(frontendDir, 'shared');
const appsDst = path.join(frontendDir, 'apps');

function shouldSkip(name) {
  return SKIP.has(name);
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return false;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (shouldSkip(name)) continue;
      copyRecursive(path.join(src, name), path.join(dst, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return true;
}

// Only sync if we're in the monorepo (parent has shared/)
if (!fs.existsSync(sharedSrc)) {
  process.exit(0); // No parent shared - skip silently
}

copyRecursive(sharedSrc, sharedDst);
copyRecursive(appsSrc, appsDst);
console.log('[pre-push] Synced shared and apps from root');
