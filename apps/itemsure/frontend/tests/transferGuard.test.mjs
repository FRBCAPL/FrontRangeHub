import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmDecision, sameCheck, transferWarning } from '../src/utils/itemsureTransferGuard.js';

const item = { name: 'Beans', unitSymbol: 'ea' };
const check = (level, extra = {}) => ({ level, on_hand: '100', after: '50', minimum: '20', par: '60', ...extra });

test('a transfer that keeps the source at or above par proceeds without a prompt', () => {
  assert.deepEqual(transferWarning(check('ok'), item), { block: false, confirm: false });
});

test('below par asks for confirmation with a warning', () => {
  const w = transferWarning(check('below_par'), item);
  assert.equal(w.block, false);
  assert.equal(w.confirm, true);
  assert.equal(w.tone, 'warn');
  assert.match(w.text, /100 ea on hand now, 50 ea after/);
  assert.match(w.text, /par is 60 ea/);
});

test('reaching the minimum asks for confirmation with a stronger warning', () => {
  const w = transferWarning(check('low', { after: '20' }), item);
  assert.equal(w.confirm, true);
  assert.equal(w.tone, 'danger');
  assert.match(w.title, /low/);
  assert.match(w.text, /minimum is 20 ea/);
});

test('below zero and uncounted sources are blocked, never confirmed', () => {
  for (const level of ['below_zero', 'not_set_up']) {
    const w = transferWarning(check(level), item);
    assert.equal(w.block, true, level);
    assert.notEqual(w.confirm, true, level);
  }
  assert.match(transferWarning(check('below_zero'), item).text, /Only 100 ea on hand/);
  assert.match(transferWarning(check('not_set_up'), item).text, /no starting balance/);
});

test('confirming proceeds only when the fresh check matches what was confirmed', () => {
  const confirmed = check('below_par');
  assert.equal(sameCheck(confirmed, { ...confirmed }), true);
  assert.equal(confirmDecision(confirmed, { ...confirmed }, item).action, 'proceed');
});

test('a stronger warning at confirm time needs a new confirmation', () => {
  const d = confirmDecision(check('below_par'), check('low', { on_hand: '70', after: '20' }), item);
  assert.equal(d.action, 'reconfirm');
  assert.equal(d.warning.changed, true);
  assert.equal(d.warning.tone, 'danger');
});

test('the same warning with different figures needs a new confirmation', () => {
  for (const change of [{ on_hand: '95', after: '45' }, { par: '70' }, { minimum: '10' }]) {
    const d = confirmDecision(check('below_par'), check('below_par', change), item);
    assert.equal(d.action, 'reconfirm', JSON.stringify(change));
  }
});

test('at confirm time, a transfer that became impossible is blocked', () => {
  assert.equal(confirmDecision(check('below_par'), check('below_zero'), item).action, 'block');
  assert.equal(confirmDecision(check('low'), check('not_set_up'), item).action, 'block');
});

test('at confirm time, a transfer that no longer needs a warning proceeds', () => {
  assert.equal(confirmDecision(check('below_par'), check('ok'), item).action, 'proceed');
});

test('an unknown or missing check is blocked rather than allowed', () => {
  assert.equal(transferWarning(null, item).block, true);
  assert.equal(transferWarning({ level: 'something_new' }, item).block, true);
});
