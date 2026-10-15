import test from 'node:test';
import assert from 'node:assert/strict';
import { JOIN_CODE_RE, JOIN_NOT_SET_UP, claimChanges, joinErrorText, makeJoinCode, teamsToPick } from './duezyJoin.js';

test('join codes are 12 safe characters that match the database check', () => {
  const code = makeJoinCode();
  assert.equal(code.length, 12);
  assert.match(code, JOIN_CODE_RE);
  assert.doesNotMatch(code, /[01IOlo]/);
  assert.equal(makeJoinCode(4, () => [0, 1, 55, 56]), 'AB9A');
});

test('join errors read plainly', () => {
  assert.match(joinErrorText('duezy_join_taken'), /already in this league/);
  assert.match(joinErrorText('duezy_join_team'), /isn’t in the league anymore/);
  assert.match(joinErrorText('P0001: duezy_join_closed'), /turned off/);
  assert.equal(joinErrorText('Could not find the function public.duezy_join_info(p_code) in the schema cache'), JOIN_NOT_SET_UP);
  assert.equal(joinErrorText('network down'), 'network down');
  assert.match(joinErrorText(''), /went wrong/);
});

test('captains pick from their division’s teams, or every team in a one-division league', () => {
  const teams = [{ id: 'a', division_id: 'd1' }, { id: 'b', division_id: 'd2' }, { id: 'c', division_id: 'd1' }];
  const two = [{ id: 'd1' }, { id: 'd2' }];
  assert.deepEqual(teamsToPick(teams, two, 'd1').map((t) => t.id), ['a', 'c']);
  assert.deepEqual(teamsToPick(teams, two, ''), []);
  assert.equal(teamsToPick(teams, [], '').length, 3);
  assert.equal(teamsToPick(teams, [{ id: 'd1' }], '').length, 3);
});

test('claiming a team replaces captain and contact and adds only new players', () => {
  const team = { captain: 'Old Cap', contact: '111', players: ['Ana', 'Lee'] };
  const changes = claimChanges(team, { captain: 'Bobby', contact: '719-555-0101', players: ['ana', ' Dee ', 'Dee'] });
  assert.deepEqual(changes, { captain: 'Bobby', contact: '719-555-0101', players: ['Ana', 'Lee', 'Dee'] });
  assert.deepEqual(claimChanges({}, { captain: 'X', contact: 'y@z.com' }).players, []);
});
