#!/usr/bin/env node
/**
 * Pre-push hook: sync shared and apps from root, commit if changed.
 * Runs automatically before every git push. No need to remember.
 */
const { execSync } = require('child_process');
const path = require('path');

const frontendDir = path.resolve(__dirname, '..');

try {
  // 1. Sync from root (no-op if not in monorepo)
  require('./sync-from-root.cjs');

  // 2. Add shared and apps
  execSync('git add shared apps', { cwd: frontendDir, stdio: 'pipe' });

  // 3. Check if there are staged changes
  const status = execSync('git status --short shared apps', {
    cwd: frontendDir,
    encoding: 'utf8'
  });
  if (status.trim()) {
    execSync('git commit -m "Sync shared and apps from root"', {
      cwd: frontendDir,
      stdio: 'inherit'
    });
    console.log('[pre-push] Committed synced shared and apps');
  }
} catch (e) {
  // Don't block push on errors (e.g. not in monorepo)
}
