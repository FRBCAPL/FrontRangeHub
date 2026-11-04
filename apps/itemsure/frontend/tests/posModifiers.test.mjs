import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addModifierUse, asSalesRows, guessModifier, modifierNotes, modifierSetup, modifierTotals, modifierUse, ruleOf, ruleText,
} from '../src/utils/itemsurePosModifiers.js';

test('guesses common bar modifiers from their names', () => {
  assert.deepEqual(guessModifier('Double'), { action: 'extra', extraPours: 1 });
  assert.deepEqual(guessModifier('Make it a DBL'), { action: 'extra', extraPours: 1 });
  assert.deepEqual(guessModifier('Add Shot'), { action: 'extra', extraPours: 1 });
  assert.deepEqual(guessModifier('Triple'), { action: 'extra', extraPours: 2 });
  assert.deepEqual(guessModifier('Rocks'), { action: 'none' });
  assert.deepEqual(guessModifier('Neat'), { action: 'none' });
  assert.deepEqual(guessModifier('Add Lime'), { action: 'none' });
  assert.equal(guessModifier('Add Red Bull'), null);
  assert.equal(guessModifier('Pineapple Juice'), null);
  assert.equal(guessModifier(''), null);
});

test('reads saved rules and says them plainly', () => {
  assert.equal(ruleOf({ action: null }), null);
  assert.deepEqual(ruleOf({ action: 'extra', extra_pours: '1.000000' }), { action: 'extra', extraPours: 1 });
  assert.deepEqual(ruleOf({ action: 'item', item_id: 'RB', uses_amount: '1', uses_unit: 'piece' }), { action: 'item', itemId: 'RB', amount: 1, unit: 'piece' });
  assert.equal(ruleText(null), 'Not set yet (counts as nothing)');
  assert.equal(ruleText({ action: 'none' }), 'Nothing extra');
  assert.equal(ruleText({ action: 'extra', extraPours: 1 }), '1 more pour of the drink');
  assert.equal(ruleText({ action: 'extra', extraPours: 2 }), '2 more pours of the drink');
  assert.equal(ruleText({ action: 'item', amount: 1 }, 'Red Bull', 'single'), 'Uses 1 single of Red Bull');
});

test('adds what modifiers used to the right items', () => {
  const hours = [
    { external_id: 'VODKA', modifier_id: 'DBL', quantity: 4 },
    { external_id: 'VODKA', modifier_id: 'DBL', quantity: 2 },
    { external_id: 'VODKA', modifier_id: 'RB', quantity: 3 },
    { external_id: 'VODKA', modifier_id: 'ROCKS', quantity: 9 },
    { external_id: 'VODKA', modifier_id: 'NEW', quantity: 5 },
    { external_id: 'GIN', modifier_id: 'DBL', quantity: 1 },
    { external_id: 'ODD', modifier_id: 'DBL', quantity: 7 },
  ];
  const totals = modifierTotals(hours);
  assert.equal(totals.get('VODKA|DBL'), 6);
  const use = modifierUse({
    keys: [...totals.keys()],
    qtyFor: (cloverId, modifierId) => totals.get(`${cloverId}|${modifierId}`) || 0,
    rules: new Map([
      ['DBL', { action: 'extra', extraPours: 1 }],
      ['RB', { action: 'item', itemId: 'redbull', amount: 1, unit: 'piece' }],
      ['ROCKS', { action: 'none' }],
    ]),
    names: new Map([['DBL', 'Double'], ['RB', 'Add Red Bull']]),
    links: new Map([['VODKA', ['vodka', 'lime']], ['GIN', ['gin']]]),
    pours: new Map([['VODKA|vodka', { amount: 1.5, unit: 'fl_oz' }]]),
    unitCodes: new Map([['vodka', 'bottle'], ['redbull', 'case'], ['gin', 'bottle']]),
    contents: new Map([['vodka', 750]]),
    pieces: new Map([['redbull', 24]]),
  });
  const vodka = use.get('vodka');
  assert.ok(Math.abs(vodka.extra - (6 * 1.5 * 29.5735) / 750) < 1e-9);
  assert.deepEqual(vodka.notes, [{ name: 'Double', qty: 6 }]);
  assert.equal(vodka.incomplete, false);
  assert.equal(use.get('redbull').extra, 3 / 24);
  assert.equal(use.has('lime'), false);
  // Gin's amount per sale isn't set, so its double can't be worked out yet.
  assert.deepEqual(use.get('gin'), { extra: 0, notes: [{ name: 'Double', qty: 1 }], incomplete: true });
  assert.equal(modifierNotes(vodka.notes), '6 Double');
});

test('only modifiers that use stock become rules, and they add into the report', () => {
  const setup = modifierSetup({ rows: [
    { modifier_id: 'A', name: 'Double', action: 'extra', extra_pours: 1 },
    { modifier_id: 'B', name: 'Rocks', action: 'none' },
    { modifier_id: 'C', name: 'New', action: null },
  ] });
  assert.deepEqual([...setup.rules.keys()], ['A']);
  assert.equal(setup.names.get('C'), 'New');
  const expected = new Map([['rum', { expected: 2, sold: 4, missingPour: [], missingContent: false }]]);
  addModifierUse(expected, new Map([
    ['rum', { extra: 1, notes: [{ name: 'Double', qty: 2 }], incomplete: false }],
    ['rb', { extra: 0, notes: [{ name: 'Add Red Bull', qty: 1 }], incomplete: true }],
  ]));
  assert.equal(expected.get('rum').expected, 3);
  assert.deepEqual(expected.get('rb'), { expected: 0, sold: 0, missingPour: [], missingContent: true, modifiers: [{ name: 'Add Red Bull', qty: 1 }] });
  assert.deepEqual(asSalesRows([{ external_id: 'X', modifier_id: 'A', quantity: 1 }])[0].external_id, 'X|A');
});
