import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sqlPath = fileURLToPath(new URL('../../../../../../../../supabase-migrations/cash-climb-showdown-2026-10.sql', import.meta.url));
const v3Path = fileURLToPath(new URL('../../../../../../../../supabase-migrations/cash-climb-showdown-v3-2026-10.sql', import.meta.url));

test('Showdown functions never raise error codes that PostgREST retries forever', () => {
  const sql = readFileSync(sqlPath, 'utf8');
  assert.doesNotMatch(sql, /ERRCODE\s*=\s*'40001'/);
  assert.doesNotMatch(sql, /ERRCODE\s*=\s*'40P01'/);
  assert.match(sql, /showdown:stale-version:%', v_row\.version USING ERRCODE = 'P0001'/);
});

test('the V3 migration never raises them either', () => {
  const sql = readFileSync(v3Path, 'utf8');
  assert.doesNotMatch(sql, /ERRCODE\s*=\s*'40001'/);
  assert.doesNotMatch(sql, /ERRCODE\s*=\s*'40P01'/);
  assert.match(sql, /showdown:stale-version:%', v_row\.version USING ERRCODE = 'P0001'/);
});
