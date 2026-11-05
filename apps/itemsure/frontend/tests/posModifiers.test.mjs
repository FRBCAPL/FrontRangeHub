import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addModifierUse, asSalesRows, doubledItems, guessModifier, modifierNotes, modifierSetup, modifierTotals, modifierUse, ruleLines, ruleOf, ruleText,
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
  assert.equal(ruleText({ action: 'item', amount: 1 }, () => ({ name: 'Red Bull', unit: 'single' })), 'Uses 1 single of Red Bull');
});

test('reads and says modifiers that use several items', () => {
  const row = { action: 'items', lines: [
    { item_id: 'mix', uses_amount: '3.000000', uses_unit: 'fl_oz' },
    { item_id: 'sec', uses_amount: '0.5', uses_unit: 'fl_oz' },
  ] };
  const rule = ruleOf(row);
  assert.deepEqual(rule, { action: 'items', lines: [{ itemId: 'mix', amount: 3, unit: 'fl_oz' }, { itemId: 'sec', amount: 0.5, unit: 'fl_oz' }] });
  const names = { mix: 'Margarita Mix', sec: 'Triple Sec' };
  assert.equal(ruleText(rule, (l) => ({ name: names[l.itemId], unit: 'oz' })), 'Uses 3 oz of Margarita Mix + 0.5 oz of Triple Sec');
  assert.deepEqual(ruleLines({ action: 'item', itemId: 'rb', amount: 1, unit: 'piece' }), [{ itemId: 'rb', amount: 1, unit: 'piece' }]);
  assert.deepEqual(ruleLines({ action: 'extra', extraPours: 1 }), []);
  assert.equal(modifierSetup({ rows: [{ modifier_id: 'M', name: 'Margarita', ...row }] }).rules.get('M').lines.length, 2);
});

test('a Double pours the chosen items, or the first matched one', () => {
  assert.deepEqual(doubledItems(['vodka', 'soda'], null), ['vodka']);
  assert.deepEqual(doubledItems(['rum', 'coke', 'vodka'], new Set(['vodka', 'rum'])), ['rum', 'vodka']);
  assert.deepEqual(doubledItems(['rum', 'coke'], new Set(['gone'])), ['rum']);
  assert.deepEqual(doubledItems(undefined, null), []);
});

const oz = 29.5735;
const setupFor = (overrides) => ({
  keys: [],
  qtyFor: (cloverId, modifierId) => ({ 'VSODA|DBL': 2, 'LIT|DBL': 1, 'VSODA|MARG': 3 })[`${cloverId}|${modifierId}`] || 0,
  rules: new Map([['DBL', { action: 'extra', extraPours: 1 }]]),
  names: new Map([['DBL', 'Double'], ['MARG', 'Margarita']]),
  links: new Map([['VSODA', ['vodka', 'soda']], ['LIT', ['vodka', 'gin', 'rum', 'coke']]]),
  pours: new Map([
    ['VSODA|vodka', { amount: 2, unit: 'fl_oz' }], ['VSODA|soda', { amount: 4, unit: 'fl_oz' }],
    ['LIT|vodka', { amount: 0.5, unit: 'fl_oz' }], ['LIT|gin', { amount: 0.5, unit: 'fl_oz' }],
    ['LIT|rum', { amount: 0.5, unit: 'fl_oz' }], ['LIT|coke', { amount: 3, unit: 'fl_oz' }],
  ]),
  unitCodes: new Map(['vodka', 'soda', 'gin', 'rum', 'coke', 'mix', 'sec'].map((id) => [id, 'milliliter'])),
  contents: new Map(),
  pieces: new Map(),
  ...overrides,
});

test('a Double on a 2 oz drink adds one more 2 oz pour and never doubles the mixer', () => {
  const use = modifierUse(setupFor({ keys: ['VSODA|DBL'] }));
  assert.ok(Math.abs(use.get('vodka').extra - 2 * 2 * oz) < 1e-9);
  assert.equal(use.has('soda'), false);
});

test('a Double pours each chosen liquor at its own amount', () => {
  const use = modifierUse(setupFor({ keys: ['LIT|DBL'], doubles: new Map([['LIT', new Set(['vodka', 'gin', 'rum'])]]) }));
  for (const liquor of ['vodka', 'gin', 'rum']) assert.ok(Math.abs(use.get(liquor).extra - 0.5 * oz) < 1e-9);
  assert.equal(use.has('coke'), false);
});

test('a modifier using several items adds each one, and one item still works as before', () => {
  const rules = new Map([
    ['MARG', { action: 'items', lines: [{ itemId: 'mix', amount: 3, unit: 'fl_oz' }, { itemId: 'sec', amount: 0.5, unit: 'fl_oz' }] }],
  ]);
  const use = modifierUse(setupFor({ keys: ['VSODA|MARG'], rules }));
  assert.ok(Math.abs(use.get('mix').extra - 3 * 3 * oz) < 1e-9);
  assert.ok(Math.abs(use.get('sec').extra - 3 * 0.5 * oz) < 1e-9);
  assert.deepEqual(use.get('mix').notes, [{ name: 'Margarita', qty: 3 }]);
  const single = modifierUse(setupFor({ keys: ['VSODA|MARG'], rules: new Map([['MARG', { action: 'item', itemId: 'mix', amount: 3, unit: 'fl_oz' }]]) }));
  assert.ok(Math.abs(single.get('mix').extra - 3 * 3 * oz) < 1e-9);
  assert.equal(single.has('sec'), false);
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
