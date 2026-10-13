import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAYER_OTHER, asksWhoPaid, methodFrom, parsePlayers, payerChoice, playersWith, teamPayers,
} from './duezyPayers.js';

test('asksWhoPaid for anything but cash', () => {
  assert.equal(asksWhoPaid('Cash'), false);
  assert.equal(asksWhoPaid(' cash '), false);
  assert.equal(asksWhoPaid('Venmo'), true);
  assert.equal(asksWhoPaid('Bar tab'), true);
  assert.equal(asksWhoPaid(null), false);
});

test('teamPayers lists captain first without repeats', () => {
  const team = { captain: 'Bobby King', players: ['Ana', 'bobby king', ' ', 'Ana', 'Lee'] };
  assert.deepEqual(teamPayers(team), [
    { name: 'Bobby King', role: 'captain' },
    { name: 'Ana', role: 'player' },
    { name: 'Lee', role: 'player' },
  ]);
  assert.deepEqual(teamPayers({ name: 'X' }), []);
});

test('playersWith adds new names only', () => {
  const team = { captain: 'Bobby', players: ['Ana'] };
  assert.deepEqual(playersWith(team, '  Lee  Park '), ['Ana', 'Lee Park']);
  assert.equal(playersWith(team, 'ana'), null);
  assert.equal(playersWith(team, 'BOBBY'), null);
  assert.equal(playersWith(team, '   '), null);
});

test('parsePlayers splits, cleans and skips the captain', () => {
  assert.deepEqual(parsePlayers('Ana, Lee\nbobby\n\nana, Sam ', 'Bobby'), ['Ana', 'Lee', 'Sam']);
});

test('payerChoice reads the form dropdown', () => {
  const team = { captain: 'Bobby', players: [] };
  assert.deepEqual(payerChoice({ pick: '' }, team), { name: null, isNew: false });
  assert.deepEqual(payerChoice({ pick: 'Bobby' }, team), { name: 'Bobby', isNew: false });
  assert.deepEqual(payerChoice({ pick: PAYER_OTHER, other: ' Lee ' }, team), { name: 'Lee', isNew: true });
  assert.deepEqual(payerChoice({}, { name: 'No names' }), { name: null, isNew: false });
  assert.deepEqual(payerChoice({ other: 'Sam' }, { name: 'No names' }), { name: 'Sam', isNew: true });
});

test('methodFrom', () => {
  assert.equal(methodFrom('Venmo', 'Ana'), 'Venmo from Ana');
  assert.equal(methodFrom('Venmo', null), 'Venmo');
});
