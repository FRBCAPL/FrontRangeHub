import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE_BASICS } from '../src/data/itemsureGuideBasics.js';
import { GUIDE_STOCK } from '../src/data/itemsureGuideStock.js';
import { GUIDE_TEAM } from '../src/data/itemsureGuideTeam.js';

test('every help topic has its own id', () => {
  const ids = [...GUIDE_BASICS, ...GUIDE_STOCK, ...GUIDE_TEAM].map((s) => s.id);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});
