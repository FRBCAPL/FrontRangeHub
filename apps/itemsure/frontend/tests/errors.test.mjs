import test from 'node:test';
import assert from 'node:assert/strict';
import { readableDatabaseError } from '../src/utils/itemsureErrors.js';

test('owner and self rules from the database are shown as written', () => {
  for (const message of [
    'Only an owner can change or remove another owner.',
    'You cannot remove yourself from this business.',
    'Only the owner can archive or restore this business.',
  ]) {
    assert.equal(readableDatabaseError({ code: '42501', message }), message);
  }
});

test('other permission errors stay generic', () => {
  assert.equal(
    readableDatabaseError({ code: '42501', message: 'new row violates row-level security policy' }),
    'You do not have permission to do that.',
  );
});
