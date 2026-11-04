import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// ItemSure must never change anything in a business's Clover account. These checks read the
// itemsure-clover Edge Function's source and fail if anything could send Clover a write.

const dir = new URL('../../../../supabase/functions/itemsure-clover/', import.meta.url);
const files = readdirSync(dir).filter((f) => /\.(ts|js|mjs)$/.test(f));
const source = (f) => readFileSync(new URL(f, dir), 'utf8');
const client = source('clover.ts');
const code = (text) => text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('only clover.ts talks to the network', () => {
  assert.ok(files.includes('clover.ts'));
  for (const f of files.filter((name) => name !== 'clover.ts')) {
    assert.doesNotMatch(code(source(f)), /\bfetch\s*\(/, `${f} must not call fetch`);
    assert.doesNotMatch(source(f), /clover\.com/i, `${f} must not name a Clover address`);
  }
});

test('the Clover client only ever sends GET, with no body', () => {
  const body = code(client);
  assert.equal(body.match(/\bfetch\s*\(/g)?.length, 1, 'exactly one fetch call');
  assert.match(body, /method:\s*'GET'/);
  assert.doesNotMatch(body, /\b(POST|PUT|PATCH|DELETE)\b/);
  assert.doesNotMatch(body, /\bbody\s*:/);
  assert.doesNotMatch(body, /method:(?!\s*'GET')/);
});

test('the Clover addresses are the two fixed API hosts', () => {
  const hosts = [...client.matchAll(/https:\/\/[^'"`\s]+/g)].map((m) => m[0]).sort();
  assert.deepEqual(hosts, ['https://api.clover.com', 'https://apisandbox.dev.clover.com']);
});

test('every path is on the read allowlist, and the allowlist is reads only', () => {
  const block = client.slice(client.indexOf('const READ_PATHS'), client.indexOf(']);', client.indexOf('const READ_PATHS')));
  const allowed = [...block.matchAll(/^\s*\/(\^.*\$)\/,?$/gm)].map((m) => new RegExp(m[1]));
  assert.equal(allowed.length, 4);
  const ok = (path) => allowed.some((r) => r.test(path));

  const used = [...code(client).matchAll(/get\(`([^`]*)`\)|get\('([^']*)'\)/g)].map((m) => (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, 'AB12'));
  assert.ok(used.length >= 4, 'found the calls');
  for (const path of used) assert.ok(ok(path), `not on the allowlist: ${path}`);

  for (const bad of ['/items/AB12', '/items', '/orders/AB12', '/orders/AB12/line_items', '/customers?limit=1', '/orders/AB12/payments?x=1', '/../x?y=1']) {
    assert.equal(ok(bad), false, `should be refused: ${bad}`);
  }
});
