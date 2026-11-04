import test from 'node:test';
import assert from 'node:assert/strict';
import { alsoUses, cloverLinkable, cloverSuggestionsFor, cloverUsesFor } from '../src/utils/itemsureItemClover.js';

const rum = { id: 'rum', name: 'Bacardi', is_active: true };
const mint = { id: 'mint', name: 'Mint', is_active: true };
const vodka = { id: 'vodka', name: 'Titos', is_active: true };
const pos = [
  { external_id: 'p1', name: 'Mojito' },
  { external_id: 'p2', name: 'Bacardi Double' },
  { external_id: 'p3', name: 'Bacardi' },
  { external_id: 'p4', name: 'Bacardi Old', is_deleted: true },
  { external_id: 'p5', name: 'Titos Soda' },
  { external_id: 'p6', name: '$10 Draft Pitcher', not_tracked: true },
];
const links = new Map([['p1', ['rum', 'mint']], ['p2', ['rum']], ['p4', ['rum']]]);

test('lists the Clover items that use an item, removed ones included, by name', () => {
  assert.deepEqual(cloverUsesFor('rum', pos, links).map((p) => p.external_id), ['p2', 'p4', 'p1']);
  assert.deepEqual(cloverUsesFor('vodka', pos, links), []);
});

test('does not offer not-tracked Clover items to match', () => {
  assert.equal(cloverLinkable('rum', pos, links).some((p) => p.id === 'p6'), false);
  assert.equal(cloverSuggestionsFor('rum', pos, links, [rum]).some((p) => p.external_id === 'p6'), false);
});

test('offers only live Clover items not already matched to the item', () => {
  assert.deepEqual(cloverLinkable('rum', pos, links).map((p) => p.id), ['p3', 'p5']);
  assert.deepEqual(cloverLinkable('mint', pos, links).map((p) => p.id), ['p2', 'p3', 'p5']);
});

test('suggests unmatched Clover items whose best guess is the item', () => {
  const items = [rum, mint, vodka];
  assert.deepEqual(cloverSuggestionsFor('rum', pos, links, items).map((p) => p.external_id), ['p3']);
  assert.deepEqual(cloverSuggestionsFor('vodka', pos, links, items).map((p) => p.external_id), ['p5']);
  assert.deepEqual(cloverSuggestionsFor('vodka', pos, links, [rum, mint, { ...vodka, is_active: false }]), []);
});

test('does not suggest ItemSure items marked as not sold in Clover', () => {
  const items = [rum, mint, { ...vodka, notSoldInPos: true }];
  assert.deepEqual(cloverSuggestionsFor('vodka', pos, links, items), []);
});

test('names the other items a Clover item uses', () => {
  const byId = new Map([rum, mint].map((i) => [i.id, i]));
  assert.deepEqual(alsoUses('p1', 'rum', links, byId), ['Mint']);
  assert.deepEqual(alsoUses('p2', 'rum', links, byId), []);
});
