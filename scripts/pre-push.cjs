#!/usr/bin/env node
/**
 * Pre-push check. It never copies, stages or commits anything.
 *   - Blocks the push when FrontEnd apps/ or shared/ have uncommitted changes, so what is pushed is
 *     exactly what was committed.
 *   - Warns (does not block) when root apps/ or shared/ differ from FrontEnd: run `npm run sync:preview`.
 *   - If the check itself fails, it reports the error and lets the push continue.
 */
const fs = require('fs');
const path = require('path');
const { plan, dirtyFiles, defaultDirs } = require('./frontendSync.cjs');

function runPrePush(dirs = defaultDirs(), log = console.log, warn = console.error) {
  try {
    const dirty = dirtyFiles(dirs.frontendDir);
    if (dirty.length) {
      warn(`[pre-push] Blocked: FrontEnd apps/ or shared/ has uncommitted changes. Commit or discard them first:\n  ${dirty.join('\n  ')}`);
      return 1;
    }
    if (fs.existsSync(path.join(dirs.rootDir, 'shared'))) {
      const p = plan(dirs);
      const pending = p.add.length + p.change.length + p.delete.length;
      if (pending) warn(`[pre-push] Note: root has ${pending} file change(s) not in FrontEnd (${p.held.length} held back). Run \`npm run sync:preview\` to review. Pushing what is committed.`);
    }
    return 0;
  } catch (err) {
    warn(`[pre-push] Check failed, push continues: ${err.message}`);
    return 0;
  }
}

if (require.main === module) process.exitCode = runPrePush();

module.exports = { runPrePush };
