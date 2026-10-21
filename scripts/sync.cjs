#!/usr/bin/env node
/**
 * npm run sync:preview — list what a root → FrontEnd sync would add, change, delete or hold back.
 * npm run sync:apply   — apply it (needs clean FrontEnd apps/ and shared/); changes stay unstaged,
 *                        so review them with `git diff` and commit them yourself.
 */
const fs = require('fs');
const path = require('path');
const { plan, apply, describe, defaultDirs } = require('./frontendSync.cjs');

function main(argv = process.argv.slice(2), dirs = defaultDirs(), log = console.log) {
  const mode = argv[0] || 'preview';
  if (!['preview', 'apply'].includes(mode)) throw new Error(`Unknown mode "${mode}". Use preview or apply.`);
  if (!fs.existsSync(path.join(dirs.rootDir, 'shared'))) {
    log('No root shared/ next to FrontEnd (not the monorepo); nothing to sync.');
    return 0;
  }
  if (mode === 'preview') {
    log(describe(plan(dirs)));
    log('\nPreview only; nothing was changed. Run `npm run sync:apply` to apply.');
    return 0;
  }
  const p = apply(dirs);
  log(describe(p));
  log('\nApplied. Nothing is staged or committed: review with `git diff -- apps shared`, then commit yourself.');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`[sync] ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main };
