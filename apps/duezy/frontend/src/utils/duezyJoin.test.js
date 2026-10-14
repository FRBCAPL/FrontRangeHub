import test from 'node:test';
import assert from 'node:assert/strict';
import { JOIN_CODE_RE, JOIN_NOT_SET_UP, joinErrorText, makeJoinCode } from './duezyJoin.js';

test('join codes are 12 safe characters that match the database check', () => {
  const code = makeJoinCode();
  assert.equal(code.length, 12);
  assert.match(code, JOIN_CODE_RE);
  assert.doesNotMatch(code, /[01IOlo]/);
  assert.equal(makeJoinCode(4, () => [0, 1, 55, 56]), 'AB9A');
});

test('join errors read plainly', () => {
  assert.match(joinErrorText('duezy_join_taken'), /already in this league/);
  assert.match(joinErrorText('P0001: duezy_join_closed'), /turned off/);
  assert.equal(joinErrorText('Could not find the function public.duezy_join_info(p_code) in the schema cache'), JOIN_NOT_SET_UP);
  assert.equal(joinErrorText('network down'), 'network down');
  assert.match(joinErrorText(''), /went wrong/);
});
