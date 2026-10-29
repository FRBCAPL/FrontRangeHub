import test from 'node:test';
import assert from 'node:assert/strict';
import { canRemoveEntry, checkAmounts, checkLevels, copyFirstLevels, makeEntry, savePlan, wizardSteps } from '../src/utils/itemsureItemWizard.js';

const opts = { precision: 0, unitName: 'Bottle', canAmounts: true, canLevels: true };
const target = { minimum_text: '2', par_text: '6', updated_at: 't1' };

test('wizardSteps hides Where and Levels without permission', () => {
  assert.deepEqual(wizardSteps({ canView: true, canLevels: true }), ['basics', 'where', 'levels', 'extras', 'review']);
  assert.deepEqual(wizardSteps({ canView: true, canLevels: false }), ['basics', 'where', 'extras', 'review']);
  assert.deepEqual(wizardSteps({ canView: false, canLevels: true }), ['basics', 'extras', 'review']);
});

test('makeEntry fills the typed fields from what is saved', () => {
  const e = makeEntry({ locationId: 'L1', storageAreaId: 'A1', quantity: '4', target });
  assert.equal(e.key, 'L1|A1');
  assert.equal(e.amount, '4');
  assert.equal(e.minimum, '2');
  assert.equal(e.par, '6');
  const fresh = makeEntry({ locationId: 'L1', isNew: true });
  assert.equal(fresh.key, 'L1|');
  assert.equal(fresh.amount, '');
  assert.equal(fresh.storageAreaId, null);
});

test('checkAmounts rejects bad numbers and blanking an existing amount', () => {
  const ok = makeEntry({ locationId: 'L1', isNew: true });
  assert.equal(checkAmounts([ok], 0, 'Bottle'), null);
  assert.match(checkAmounts([{ ...ok, amount: '1.5' }], 0, 'Bottle').error, /whole numbers/);
  const existing = makeEntry({ locationId: 'L2', quantity: '3' });
  const problem = checkAmounts([{ ...existing, amount: '' }], 0, 'Bottle');
  assert.equal(problem.key, 'L2|');
  assert.match(problem.error, /0 if none/);
});

test('checkLevels rejects warn above fill', () => {
  const e = { ...makeEntry({ locationId: 'L1' }), minimum: '8', par: '4' };
  assert.match(checkLevels([e], 0, 'Bottle').error, /cannot be more/);
  assert.equal(checkLevels([{ ...e, minimum: '2' }], 0, 'Bottle'), null);
});

test('savePlan only includes what changed', () => {
  const same = makeEntry({ locationId: 'L1', quantity: '4', target });
  assert.equal(savePlan([same], opts).empty, true);

  const changed = { ...same, amount: '7', par: '10' };
  const plan = savePlan([changed], opts);
  assert.deepEqual(plan.amounts, [{ key: 'L1|', quantity: '7', seen: '4' }]);
  assert.deepEqual(plan.levels, [{ key: 'L1|', minimum: '2', par: '10', expectedUpdatedAt: 't1' }]);
  assert.deepEqual(plan.places, []);
});

test('savePlan treats 4 and 4.0 as the same amount', () => {
  const e = { ...makeEntry({ locationId: 'L1', quantity: '4' }), amount: '4.0' };
  assert.equal(savePlan([e], { ...opts, precision: 1 }).amounts.length, 0);
});

test('savePlan remembers a new empty place, but not one getting an amount', () => {
  const blank = makeEntry({ locationId: 'L1', isNew: true });
  assert.deepEqual(savePlan([blank], opts).places, [{ key: 'L1|' }]);
  const withAmount = { ...makeEntry({ locationId: 'L2', isNew: true }), amount: '3' };
  const plan = savePlan([withAmount], opts);
  assert.deepEqual(plan.places, []);
  assert.deepEqual(plan.amounts, [{ key: 'L2|', quantity: '3', seen: null }]);
});

test('savePlan skips amounts and levels without permission', () => {
  const e = { ...makeEntry({ locationId: 'L1', quantity: '4', target }), amount: '9', par: '12' };
  const plan = savePlan([e], { ...opts, canAmounts: false, canLevels: false });
  assert.equal(plan.empty, true);
});

test('clearing both levels saves a removal', () => {
  const e = { ...makeEntry({ locationId: 'L1', quantity: '4', target }), minimum: '', par: '' };
  assert.deepEqual(savePlan([e], opts).levels, [{ key: 'L1|', minimum: null, par: null, expectedUpdatedAt: 't1' }]);
});

test('removing an empty place only removes it', () => {
  const e = { ...makeEntry({ locationId: 'L1', quantity: '0', kept: true }), remove: true, amount: 'oops' };
  assert.equal(checkAmounts([e], 0, 'Bottle'), null);
  const plan = savePlan([e], opts);
  assert.deepEqual(plan.amounts, []);
  assert.deepEqual(plan.removals, [{ key: 'L1|' }]);
  assert.equal(plan.empty, false);
});

test('removing a place with stock sets it to 0 first', () => {
  const e = { ...makeEntry({ locationId: 'L1', quantity: '3', target }), remove: true, par: '99' };
  const plan = savePlan([e], opts);
  assert.deepEqual(plan.amounts, [{ key: 'L1|', quantity: '0', seen: '3', note: 'Removed this place from the item' }]);
  assert.deepEqual(plan.levels, []);
  assert.deepEqual(plan.removals, [{ key: 'L1|' }]);
});

test('a place with stock or levels cannot be removed without permission', () => {
  const stocked = makeEntry({ locationId: 'L1', quantity: '3' });
  const leveled = makeEntry({ locationId: 'L2', target });
  assert.equal(canRemoveEntry(stocked, { amounts: false, levels: true }), false);
  assert.equal(canRemoveEntry(leveled, { amounts: true, levels: false }), false);
  assert.equal(canRemoveEntry(makeEntry({ locationId: 'L3', isNew: true }), { amounts: true, levels: true }), false);
  assert.equal(savePlan([{ ...stocked, remove: true }], { ...opts, canAmounts: false }).empty, true);
});

test('copyFirstLevels copies the first place to the rest', () => {
  const a = { ...makeEntry({ locationId: 'L1' }), minimum: '2', par: '5' };
  const b = makeEntry({ locationId: 'L2' });
  const [, copied] = copyFirstLevels([a, b]);
  assert.equal(copied.minimum, '2');
  assert.equal(copied.par, '5');
  assert.deepEqual(copyFirstLevels([]), []);
});
