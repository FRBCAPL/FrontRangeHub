import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SMART_BUILDER_ENABLED } from './builderFlags.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOURNAMENT = resolve(HERE, '..');
const SRC = resolve(TOURNAMENT, '..', '..');
const FORBIDDEN = /cloud|sync|storage|archive|supabase|persist|Api\b|api\.js|service/i;
const importsOf = (src) => [...src.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] || m[2]);

const REPO = resolve(SRC, '..', '..', '..', '..');
const PACKAGES = new Set(['react']);
const builderFiles = () => readdirSync(HERE).filter((f) => /\.jsx?$/.test(f) && !f.endsWith('.test.js')).map((f) => join(HERE, f));

function walk(start) {
  const seen = new Set();
  const stack = [...start];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    importsOf(readFileSync(file, 'utf8')).forEach((spec) => {
      if (PACKAGES.has(spec)) return;
      assert.ok(spec.startsWith('.'), `${relative(SRC, file)} imports a package: ${spec}`);
      stack.push(resolve(dirname(file), spec));
    });
  }
  return [...seen];
}

test('the Builder reaches no cloud, sync, storage, archive or database module', () => {
  assert.equal(typeof SMART_BUILDER_ENABLED, 'boolean');
  const reached = walk(builderFiles());
  const bad = reached.map((f) => relative(TOURNAMENT, f)).filter((f) => FORBIDDEN.test(f.split(sep).pop()));
  assert.deepEqual(bad, []);
  reached.forEach((f) => {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|\bfetch\(|XMLHttpRequest|supabase/i, relative(TOURNAMENT, f));
  });
  ['smartBuilder.worker.js', 'builderWorkerCore.js', 'builderClient.js', 'builderSearch.js', 'SmartBuilderApp.jsx', 'builderSession.js', 'setupEstimate.worker.js', 'builderSetupEstimate.js'].forEach((name) => {
    assert.ok(reached.some((f) => f.endsWith(`${sep}${name}`)), name);
  });
  assert.ok(reached.some((f) => f.endsWith('showdownEngine.js')));
  assert.ok(reached.some((f) => f.endsWith('cashClimbEngine.js')));
});

const SETUP_ESTIMATE_CLIENT = join(TOURNAMENT, 'showdown', 'operator', 'showdownSetupEstimateClient.js');
const refsOf = (src) => [...importsOf(src), ...[...src.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1])];

test('only the tournament app opens the Builder (gate and lazy screen); setup reaches only the estimate worker', () => {
  const mentions = [];
  const visit = (dir) => readdirSync(dir).forEach((name) => {
    const full = join(dir, name);
    if (['node_modules', 'dist', '.git'].includes(name) || full === HERE) return;
    if (statSync(full).isDirectory()) { visit(full); return; }
    if (/\.(jsx?|tsx?)$/.test(name) && refsOf(readFileSync(full, 'utf8')).some((s) => /smart-builder/i.test(s))) mentions.push(relative(REPO, full));
  });
  const frontendSrc = [join(REPO, 'FrontEnd', 'src'), join(REPO, 'src')].find((dir) => existsSync(dir));
  assert.ok(frontendSrc, 'FrontEnd src folder (monorepo or FrontEnd-only layout)');
  [SRC, frontendSrc, join(REPO, 'shared')].forEach(visit);
  assert.deepEqual(mentions.sort(), [join(TOURNAMENT, 'TournamentBracketApp.jsx'), SETUP_ESTIMATE_CLIENT].map((f) => relative(REPO, f)).sort());
  const specs = refsOf(readFileSync(join(TOURNAMENT, 'TournamentBracketApp.jsx'), 'utf8')).filter((s) => s.includes('smart-builder'));
  assert.deepEqual(specs.sort(), ['./smart-builder/SmartBuilderApp.jsx', './smart-builder/smartBuilderAccess.js']);
  assert.deepEqual(refsOf(readFileSync(SETUP_ESTIMATE_CLIENT, 'utf8')), ['../../smart-builder/setupEstimate.worker.js']);
});
