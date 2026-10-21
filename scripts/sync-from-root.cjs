#!/usr/bin/env node
/**
 * Kept for `npm run sync-from-root`: same as `npm run sync:apply` (clean-tree check, held-back files
 * skipped, deletions mirrored, nothing staged or committed).
 */
const { main } = require('./sync.cjs');

try {
  process.exitCode = main(['apply']);
} catch (err) {
  console.error(`[sync] ${err.message}`);
  process.exitCode = 1;
}
