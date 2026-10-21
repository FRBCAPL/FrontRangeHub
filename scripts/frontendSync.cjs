/**
 * Explicit root → FrontEnd sync for apps/ and shared/. Nothing here stages or commits.
 *   plan()  — what a sync would add, change and delete, plus held-back files (read-only)
 *   apply() — refuses unless FrontEnd apps/ and shared/ are clean in git, then mirrors root into
 *             FrontEnd (deleting only git-tracked files that root no longer has) and leaves the
 *             changes unstaged for review
 * Symlinks and junctions are never followed, and directories are never deleted recursively.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const AREAS = ['apps', 'shared'];
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.vite', '.cursor']);
const HOLD_FILE = 'sync-hold.txt';

const toPosix = (p) => p.split(path.sep).join('/');

function git(frontendDir, args) {
  return execFileSync('git', args, { cwd: frontendDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Paths (relative to root, posix) listed in sync-hold.txt. A trailing "/" holds a whole folder. */
function readHoldList(frontendDir) {
  const file = path.join(frontendDir, HOLD_FILE);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function isHeld(rel, holds) {
  return holds.some((h) => (h.endsWith('/') ? rel.startsWith(h) : rel === h));
}

/** Regular files under dir (relative posix paths), skipping SKIP names and never following links. */
function listFiles(baseDir, area) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(baseDir, rel);
    for (const name of fs.readdirSync(abs)) {
      if (SKIP.has(name)) continue;
      const childRel = path.join(rel, name);
      const st = fs.lstatSync(path.join(baseDir, childRel));
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(childRel);
      else if (st.isFile()) out.push(toPosix(childRel));
    }
  };
  if (fs.existsSync(path.join(baseDir, area)) && !fs.lstatSync(path.join(baseDir, area)).isSymbolicLink()) walk(area);
  return out;
}

function trackedFiles(frontendDir) {
  return git(frontendDir, ['ls-files', '-z', '--', ...AREAS]).split('\0').filter(Boolean);
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Synced files whose relative imports point at a held-back file (applying them would break the build). */
function heldImports(rootDir, syncedRels, holds) {
  const problems = [];
  syncedRels.filter((r) => /\.(jsx?|mjs|cjs|tsx?)$/.test(r)).forEach((rel) => {
    const src = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const target = toPosix(path.normalize(path.join(path.dirname(rel), m[1])));
      if (isHeld(target, holds)) problems.push({ file: rel, imports: target });
    }
  });
  return problems;
}

function plan({ rootDir, frontendDir }) {
  const holds = readHoldList(frontendDir);
  const rootFiles = AREAS.flatMap((a) => listFiles(rootDir, a));
  const rootSet = new Set(rootFiles);
  const add = []; const change = []; const held = []; const del = [];
  rootFiles.forEach((rel) => {
    const dst = path.join(frontendDir, rel);
    const differs = !fs.existsSync(dst) || !fs.readFileSync(path.join(rootDir, rel)).equals(fs.readFileSync(dst));
    if (!differs) return;
    if (isHeld(rel, holds)) held.push(rel);
    else (fs.existsSync(dst) ? change : add).push(rel);
  });
  trackedFiles(frontendDir).forEach((rel) => {
    if (rootSet.has(rel) || rel.split('/').some((part) => SKIP.has(part))) return;
    if (!fs.existsSync(path.join(rootDir, AREAS.find((a) => rel.startsWith(`${a}/`)) || '__none__'))) return;
    if (isHeld(rel, holds)) held.push(rel);
    else del.push(rel);
  });
  return { add, change, delete: del, held, holds, heldImports: heldImports(rootDir, [...add, ...change], holds) };
}

function dirtyFiles(frontendDir) {
  return git(frontendDir, ['status', '--porcelain', '--', ...AREAS]).split(/\r?\n/).filter(Boolean);
}

function removeEmptyParents(frontendDir, rel) {
  let dir = path.dirname(path.join(frontendDir, rel));
  const stop = AREAS.map((a) => path.join(frontendDir, a));
  while (!stop.includes(dir) && dir.startsWith(frontendDir)) {
    if (fs.readdirSync(dir).length) return;
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function apply({ rootDir, frontendDir }) {
  const dirty = dirtyFiles(frontendDir);
  if (dirty.length) throw new Error(`FrontEnd apps/ or shared/ has uncommitted changes; commit or discard them first:\n  ${dirty.join('\n  ')}`);
  const p = plan({ rootDir, frontendDir });
  if (p.heldImports.length) {
    throw new Error(`These files import held-back files; hold them too (sync-hold.txt) or remove the import:\n  ${p.heldImports.map((h) => `${h.file} -> ${h.imports}`).join('\n  ')}`);
  }
  [...p.add, ...p.change].forEach((rel) => {
    const dst = path.join(frontendDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(rootDir, rel), dst);
  });
  p.delete.forEach((rel) => {
    const abs = path.join(frontendDir, rel);
    const st = fs.lstatSync(abs, { throwIfNoEntry: false });
    if (!st) return;
    if (!st.isFile()) throw new Error(`Refusing to delete non-file ${rel}`);
    fs.unlinkSync(abs);
    removeEmptyParents(frontendDir, rel);
  });
  return p;
}

function describe(p) {
  const lines = [];
  const section = (title, list) => { if (list.length) lines.push(`${title} (${list.length}):`, ...list.map((r) => `  ${r}`)); };
  section('Add', p.add);
  section('Change', p.change);
  section('Delete', p.delete);
  section('Held back (sync-hold.txt)', p.held);
  if (p.heldImports.length) lines.push('BLOCKED: synced files import held-back files:', ...p.heldImports.map((h) => `  ${h.file} -> ${h.imports}`));
  if (!p.add.length && !p.change.length && !p.delete.length) lines.push('FrontEnd apps/ and shared/ already match root (apart from held-back files).');
  return lines.join('\n');
}

const defaultDirs = () => {
  const frontendDir = path.resolve(__dirname, '..');
  return { frontendDir, rootDir: path.resolve(frontendDir, '..') };
};

module.exports = { plan, apply, describe, readHoldList, isHeld, dirtyFiles, defaultDirs, HOLD_FILE };
