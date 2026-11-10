import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHIP_RULES, itemShipQuote, shipBase, shipPriceFor, shipRulesFrom } from './consignmentShipPrice.js';

test('automatic price matches the SQL examples', () => {
  const p = (category, value) => shipPriceFor({ category, value });
  assert.equal(p('cues', 100), 40);
  assert.equal(p('cues', 101), 45);
  assert.equal(p('cues', 300), 45);
  assert.equal(p('cues', 800), 55);
  assert.equal(p('cues', 2500), 80);
  assert.equal(p('shafts', 80), 30);
  assert.equal(p('balls_accessories', 50), 25);
  assert.equal(p('mystery', 50), 30);
  assert.equal(shipPriceFor({ category: 'cues', value: 900, fixed: 22 }), 22);
  assert.equal(shipPriceFor({ category: 'cues', value: 900, fixed: '' }), 55);
});

test('rules from the database, with defaults for gaps', () => {
  const rules = shipRulesFrom({ base_rates: { cues: 50 }, insurance_per_100: 2, included_coverage: 0 });
  assert.equal(shipBase('cues', rules), 50);
  assert.equal(shipBase('cases', rules), DEFAULT_SHIP_RULES.baseRates.cases);
  assert.equal(shipPriceFor({ category: 'cues', value: 300 }, rules), 60);
  assert.deepEqual(shipRulesFrom(null), { ...DEFAULT_SHIP_RULES, baseRates: { ...DEFAULT_SHIP_RULES.baseRates } });
});

test('item page quote', () => {
  const shelf = { category: 'cues', sale_method: 'fixed', selling_price: 300 };
  assert.equal(itemShipQuote(shelf, null, null), null);
  assert.deepEqual(itemShipQuote(shelf, null, { fixed: null }), { price: 45, estimate: false });
  const lot = { category: 'cues', sale_method: 'auction' };
  assert.deepEqual(itemShipQuote(lot, { status: 'live', bid_count: 0, opening_bid: 150 }, { fixed: null }), { price: 45, estimate: true });
  assert.deepEqual(itemShipQuote(lot, { status: 'live', bid_count: 3, current_bid: 800 }, { fixed: 30 }), { price: 30, estimate: false });
  assert.deepEqual(itemShipQuote(lot, { status: 'awaiting_payment', winning_bid: 800 }, { fixed: null }), { price: 55, estimate: false });
});
