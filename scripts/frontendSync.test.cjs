/** Sync workflow tests. Every test builds throwaway root and FrontEnd repos in the OS temp folder. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { plan, apply } = require('./frontendSync.cjs');
const { runPrePush } = require('./pre-push.cjs');
const { main } = require('./sync.cjs');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const write = (base, rel, text) => { fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true }); fs.writeFileSync(path.join(base, rel), text); };
const read = (base, rel) => fs.readFileSync(path.join(base, rel), 'utf8');
const exists = (base, rel) => fs.existsSync(path.join(base, rel));

function setup() {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'frph-sync-'));
  const rootDir = top;
  const frontendDir = path.join(top, 'FrontEnd');
  write(rootDir, 'shared/a.js', 'export const a = 2;\n');
  write(rootDir, 'apps/x/new.js', 'export const n = 1;\n');
  write(rootDir, 'apps/x/same.js', 'same\n');
  write(rootDir, 'apps/x/node_modules/dep.js', 'ignored\n');
  write(rootDir, 'apps/x/held.js', 'held root version\n');
  write(frontendDir, 'shared/a.js', 'export const a = 1;\n');
  write(frontendDir, 'apps/x/same.js', 'same\n');
  write(frontendDir, 'apps/x/gone/old.js', 'deleted in root\n');
  write(frontendDir, 'apps/x/held.js', 'held FrontEnd version\n');
  write(frontendDir, 'sync-hold.txt', '# test\napps/x/held.js\napps/x/later/\n');
  git(frontendDir, 'init', '-q');
  git(frontendDir, 'config', 'user.email', 't@t');
  git(frontendDir, 'config', 'user.name', 't');
  git(frontendDir, 'config', 'core.autocrlf', 'false');
  git(frontendDir, 'add', '-A');
  git(frontendDir, 'commit', '-qm', 'init');
  return { top, rootDir, frontendDir, head: git(frontendDir, 'rev-parse', 'HEAD').trim() };
}

const cleanup = (d) => fs.rmSync(d.top, { recursive: true, force: true });

test('plan lists adds, changes, deletions and held files without touching anything', () => {
  const d = setup();
  try {
    const p = plan(d);
    assert.deepEqual(p.add, ['apps/x/new.js']);
    assert.deepEqual(p.change, ['shared/a.js']);
    assert.deepEqual(p.delete, ['apps/x/gone/old.js']);
    assert.deepEqual(p.held, ['apps/x/held.js']);
    assert.equal(read(d.frontendDir, 'shared/a.js'), 'export const a = 1;\n');
    assert.equal(git(d.frontendDir, 'status', '--porcelain'), '');
  } finally { cleanup(d); }
});

test('apply mirrors root, deletes removed tracked files, keeps held files, and stages nothing', () => {
  const d = setup();
  try {
    apply(d);
    assert.equal(read(d.frontendDir, 'shared/a.js'), 'export const a = 2;\n');
    assert.equal(read(d.frontendDir, 'apps/x/new.js'), 'export const n = 1;\n');
    assert.equal(exists(d.frontendDir, 'apps/x/gone/old.js'), false);
    assert.equal(exists(d.frontendDir, 'apps/x/gone'), false, 'empty folder removed');
    assert.equal(read(d.frontendDir, 'apps/x/held.js'), 'held FrontEnd version\n');
    assert.equal(exists(d.frontendDir, 'apps/x/node_modules/dep.js'), false);
    assert.equal(git(d.frontendDir, 'diff', '--cached', '--name-only'), '', 'nothing staged');
    assert.equal(git(d.frontendDir, 'rev-parse', 'HEAD').trim(), d.head, 'no commit created');
    assert.match(git(d.frontendDir, 'status', '--porcelain'), /apps\/x\/new\.js/);
  } finally { cleanup(d); }
});

test('apply refuses when FrontEnd apps/ or shared/ has uncommitted or untracked changes', () => {
  const d = setup();
  try {
    write(d.frontendDir, 'shared/a.js', 'local edit\n');
    assert.throws(() => apply(d), /uncommitted changes/);
    assert.equal(read(d.frontendDir, 'shared/a.js'), 'local edit\n');
    git(d.frontendDir, 'checkout', '--', 'shared/a.js');
    write(d.frontendDir, 'apps/x/scratch.js', 'untracked\n');
    assert.throws(() => apply(d), /uncommitted changes/);
    assert.equal(exists(d.frontendDir, 'apps/x/new.js'), false);
  } finally { cleanup(d); }
});

test('an untracked FrontEnd file that root lacks is never deleted (only git-tracked files are)', () => {
  const d = setup();
  try {
    write(d.frontendDir, 'apps/x/.gitignore', 'local-only.js\n');
    git(d.frontendDir, 'add', 'apps/x/.gitignore');
    git(d.frontendDir, 'commit', '-qm', 'ignore');
    write(d.rootDir, 'apps/x/.gitignore', 'local-only.js\n');
    write(d.frontendDir, 'apps/x/local-only.js', 'ignored local file\n');
    apply(d);
    assert.equal(read(d.frontendDir, 'apps/x/local-only.js'), 'ignored local file\n');
  } finally { cleanup(d); }
});

test('apply refuses when a synced file imports a held-back file', () => {
  const d = setup();
  try {
    write(d.rootDir, 'apps/x/later/estimator.js', 'export const e = 1;\n');
    write(d.rootDir, 'apps/x/uses.js', "import { e } from './later/estimator.js';\n");
    const p = plan(d);
    assert.deepEqual(p.heldImports, [{ file: 'apps/x/uses.js', imports: 'apps/x/later/estimator.js' }]);
    assert.throws(() => apply(d), /import held-back files/);
    assert.equal(exists(d.frontendDir, 'apps/x/new.js'), false, 'nothing applied');
  } finally { cleanup(d); }
});

test('links and junctions in root are skipped, never followed', () => {
  const d = setup();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'frph-outside-'));
  try {
    write(outside, 'secret.js', 'outside\n');
    const link = path.join(d.rootDir, 'apps/x/linked');
    fs.symlinkSync(outside, link, 'junction');
    try {
      const p = plan(d);
      assert.equal([...p.add, ...p.change].some((r) => r.includes('linked')), false);
      apply(d);
      assert.equal(exists(d.frontendDir, 'apps/x/linked'), false);
    } finally {
      fs.rmdirSync(link);
    }
    assert.equal(read(outside, 'secret.js'), 'outside\n');
  } finally { cleanup(d); fs.rmSync(outside, { recursive: true, force: true }); }
});

test('pre-push never writes: blocks on dirty FrontEnd, warns on drift, allows on internal error', () => {
  const d = setup();
  try {
    const msgs = [];
    const warn = (m) => msgs.push(m);
    assert.equal(runPrePush(d, () => {}, warn), 0);
    assert.match(msgs.join('\n'), /not in FrontEnd/);
    assert.equal(git(d.frontendDir, 'status', '--porcelain'), '', 'pre-push copied nothing');
    assert.equal(git(d.frontendDir, 'rev-parse', 'HEAD').trim(), d.head);
    write(d.frontendDir, 'shared/a.js', 'dirty\n');
    assert.equal(runPrePush(d, () => {}, warn), 1);
    assert.match(msgs.join('\n'), /Blocked/);
    const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'frph-norepo-'));
    assert.equal(runPrePush({ frontendDir: notRepo, rootDir: d.rootDir }, () => {}, warn), 0);
    assert.match(msgs.join('\n'), /Check failed, push continues/);
    fs.rmSync(notRepo, { recursive: true, force: true });
  } finally { cleanup(d); }
});

test('sync CLI preview changes nothing; unknown modes are errors', () => {
  const d = setup();
  try {
    const out = [];
    assert.equal(main(['preview'], d, (m) => out.push(m)), 0);
    assert.match(out.join('\n'), /Add \(1\)[\s\S]*Delete \(1\)[\s\S]*Held back/);
    assert.equal(git(d.frontendDir, 'status', '--porcelain'), '');
    assert.throws(() => main(['push'], d, () => {}), /Unknown mode/);
  } finally { cleanup(d); }
});
