import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTopOffPercent, dropWaitingRecs, dropWaitingRows, settleSlot, topOffCanWait, topOffLine } from '../src/utils/itemsureTopOff.js';
import { listTone, topUpCanWait } from '../src/utils/itemsureItemLook.js';

test('topOffLine uses the percent of Fill up to, or halfway from Warn me at by default', () => {
  assert.equal(topOffLine('10', '40', 75), 30);
  assert.equal(topOffLine('10', '40'), 25);
  assert.equal(topOffLine(null, '40'), 20);
  assert.equal(topOffLine('10', null, 75), null);
});

test('small pars wait until at least one whole unit is missing', () => {
  assert.equal(topOffLine('0.5', '2'), 1, 'halfway would be 1.25');
  assert.equal(topOffLine('1', '2'), 1, 'halfway would be 1.5');
  assert.equal(topOffLine('0.5', '2', 90), 1);
  assert.equal(topOffLine(null, '1'), 0, 'fill up to 1 only ever shows as running low or empty');
  assert.equal(topOffCanWait({ status: 'below_par', onHand: '1.5', minimum: '0.5', par: '2' }), true);
  assert.equal(topOffCanWait({ status: 'below_par', onHand: '1', minimum: '0.5', par: '2' }), false);
  assert.equal(topOffLine('3', '6'), 4.5, 'bigger pars are unchanged');
});

test('settleSlot reads as OK while the top-off can wait', () => {
  const slot = { status: 'below_par', quantity: '1.5', target: { minimum_text: '0.5', par_text: '2' } };
  assert.equal(settleSlot(slot).status, 'above_minimum');
  assert.equal(settleSlot({ ...slot, quantity: '1' }).status, 'below_par');
  assert.equal(settleSlot({ ...slot, status: 'low', quantity: '0.5' }).status, 'low');
});

test('topOffCanWait is only true above the line for below-par spots', () => {
  const slot = (onHand, status = 'below_par') => ({ status, onHand, minimum: '10', par: '40' });
  assert.equal(topOffCanWait(slot('31'), 75), true);
  assert.equal(topOffCanWait(slot('30'), 75), false, 'at the line it needs topping up');
  assert.equal(topOffCanWait(slot('26')), true, 'default line is 25');
  assert.equal(topOffCanWait(slot('25')), false);
  assert.equal(topOffCanWait(slot('5', 'low'), 75), false, 'running low never waits');
  assert.equal(topOffCanWait({ status: 'below_par', onHand: null, minimum: '10', par: '40' }), false);
});

test('a percent at or below Warn me at means it only ever shows as running low', () => {
  assert.equal(topOffCanWait({ status: 'below_par', onHand: '11', minimum: '10', par: '40' }, 20), true);
});

test('dropWaitingRows and dropWaitingRecs keep what needs attention', () => {
  const percents = new Map([['a', 90]]);
  const rows = [
    { item_id: 'a', status: 'below_par', on_hand_text: '35', minimum_text: '10', par_text: '40' },
    { item_id: 'b', status: 'below_par', on_hand_text: '35', minimum_text: '10', par_text: '40' },
    { item_id: 'c', status: 'low', on_hand_text: '5', minimum_text: '10', par_text: '40' },
    { item_id: 'd', status: 'not_set_up', on_hand_text: null, minimum_text: '10', par_text: '40' },
  ];
  assert.deepEqual(dropWaitingRows(rows, percents).map((r) => r.item_id), ['a', 'c', 'd']);
  assert.deepEqual(dropWaitingRows(rows, null).map((r) => r.item_id), ['c', 'd']);
  const recs = [
    { item_id: 'a', status: 'below_par', on_hand: '35', minimum: '10', par: '40' },
    { item_id: 'b', status: 'below_par', on_hand: '20', minimum: '10', par: '40' },
  ];
  assert.deepEqual(dropWaitingRecs(recs, new Map()).map((r) => r.item_id), ['b']);
});

test('checkTopOffPercent accepts blank or 1 to 99', () => {
  assert.deepEqual(checkTopOffPercent(''), { value: null });
  assert.deepEqual(checkTopOffPercent(' 75% '), { value: 75 });
  assert.ok(checkTopOffPercent('0').error);
  assert.ok(checkTopOffPercent('100').error);
  assert.ok(checkTopOffPercent('7.5').error);
});

test('the Inventory page tone follows the item percent', () => {
  const summary = { status: 'below_par', total: '28', minimum: '10', par: '40' };
  assert.equal(topUpCanWait(summary), true, 'default line 25');
  assert.equal(listTone(summary), 'ok');
  assert.equal(topUpCanWait(summary, 75), false, 'line 30');
  assert.equal(listTone(summary, 75), 'warn');
});
