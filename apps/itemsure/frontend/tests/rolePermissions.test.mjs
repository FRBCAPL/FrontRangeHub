import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivePermissions, switchStates } from '../src/utils/itemsureRolePermissions.js';

const STAFF_DEFAULTS = ['items.read', 'counts.view', 'counts.create', 'counts.edit', 'inventory.view'];

test('no choices means the defaults', () => {
  assert.deepEqual(effectivePermissions(STAFF_DEFAULTS).sort(), [...STAFF_DEFAULTS].sort());
});

test('a business choice adds or removes a permission', () => {
  const result = effectivePermissions(STAFF_DEFAULTS, [
    { permission_code: 'counts.submit', granted: true },
    { permission_code: 'counts.edit', granted: false },
  ]);
  assert.ok(result.includes('counts.submit'));
  assert.ok(!result.includes('counts.edit'));
  assert.ok(result.includes('inventory.view'));
});

test('switches show on, partly on, and changed from the default', () => {
  const rows = switchStates(['counts.approve', 'counts.reject'], [{ permission_code: 'counts.reject', granted: false }]);
  const approve = rows.find((r) => r.key === 'approve');
  assert.equal(approve.on, false);
  assert.equal(approve.partly, true);
  assert.equal(approve.changed, true);
  const submit = rows.find((r) => r.key === 'submit');
  assert.deepEqual([submit.on, submit.changed], [false, false]);
});
