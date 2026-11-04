import test from 'node:test';
import assert from 'node:assert/strict';
import { addModifiers, lineModifiers, modifierKey } from '../../../../supabase/functions/itemsure-clover/modifierTally.js';

test('keys a modification by its Clover modifier, else by name', () => {
  assert.deepEqual(modifierKey({ name: 'Double', modifier: { id: 'M1' } }), { id: 'M1', name: 'Double' });
  assert.deepEqual(modifierKey({ name: ' Add Red Bull ' }), { id: 'name:add red bull', name: 'Add Red Bull' });
  assert.equal(modifierKey({}), null);
  assert.deepEqual(lineModifiers({}), []);
});

test('counts modifiers per drink per hour, keeping refunds apart', () => {
  const buckets = new Map();
  const names = new Map();
  const line = { modifications: { elements: [{ name: 'Double', modifier: { id: 'M1' } }, { name: 'Rocks', modifier: { id: 'M2' } }] } };
  addModifiers(buckets, names, line, 'VODKA', 1000, 1);
  addModifiers(buckets, names, line, 'VODKA', 1000, 1);
  addModifiers(buckets, names, { ...line, refunded: true }, 'VODKA', 1000, 1);
  addModifiers(buckets, names, { modifications: { elements: [] } }, 'BEER', 1000, 1);
  assert.deepEqual(buckets.get('VODKA|M1|1000'), { sold: 2, refunded: 1 });
  assert.deepEqual(buckets.get('VODKA|M2|1000'), { sold: 2, refunded: 1 });
  assert.equal(buckets.size, 2);
  assert.equal(names.get('M1'), 'Double');
});
