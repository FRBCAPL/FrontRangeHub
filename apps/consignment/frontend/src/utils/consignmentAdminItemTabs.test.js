import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES } from '../data/consignmentConstants.js';
import { ACTION_TABS, ITEM_STATUS_TABS, ITEM_TAB_IDS, itemTabLabel } from './consignmentAdminItemTabs.js';

test('a tab for every item status, plus the shortcuts and All', () => {
  for (const s of STATUSES) assert.ok(ITEM_TAB_IDS.includes(s.id), `missing tab for ${s.id}`);
  for (const id of ['expiring', 'seller_unpaid', 'all']) assert.ok(ITEM_TAB_IDS.includes(id));
  assert.equal(new Set(ITEM_TAB_IDS).size, ITEM_TAB_IDS.length);
  assert.ok(ITEM_STATUS_TABS.every((t) => t.label && t.hint));
});

test('labels and attention tabs', () => {
  assert.equal(itemTabLabel('pending'), 'Needs approval');
  assert.equal(itemTabLabel('mystery'), 'mystery');
  for (const id of ACTION_TABS) assert.ok(ITEM_TAB_IDS.includes(id));
});
