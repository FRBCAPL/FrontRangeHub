import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanHandle, defaultMethod, handlesToSave, leagueMethods, methodOptions, methodsToSave, paymentLines, timeZoneOptions,
} from './duezyLeaguePrefs.js';
import { METHODS } from '../data/duezyOptions.js';

test('cleanHandle strips links and @ / $', () => {
  assert.equal(cleanHandle('venmo', '@Sam-Pool'), 'Sam-Pool');
  assert.equal(cleanHandle('venmo', 'https://venmo.com/u/sampool?txn=1'), 'sampool');
  assert.equal(cleanHandle('cashapp', '$frpool'), 'frpool');
  assert.equal(cleanHandle('paypal', 'paypal.me/frpool/'), 'frpool');
  assert.equal(cleanHandle('zelle', ' 303-555-1212 '), '303-555-1212');
  assert.equal(cleanHandle('venmo', '  '), '');
});

test('handlesToSave drops blanks', () => {
  assert.deepEqual(handlesToSave({ venmo: '@a', cashapp: '', zelle: 'a@b.co' }), { venmo: 'a', zelle: 'a@b.co' });
  assert.equal(handlesToSave({ venmo: ' ' }), null);
});

test('paymentLines puts the note first, then tap-to-pay links', () => {
  assert.deepEqual(paymentLines({ payment_note: 'Cash at the table', pay_handles: { cashapp: 'fr', venmo: 'sam' } }), [
    'Cash at the table',
    'Venmo: https://venmo.com/u/sam',
    'Cash App: https://cash.app/$fr',
  ]);
  assert.deepEqual(paymentLines({}), []);
});

test('league methods, default and options', () => {
  assert.deepEqual(leagueMethods({}), METHODS);
  const league = { payment_methods: ['Venmo', 'Cash'], default_method: 'Venmo' };
  assert.deepEqual(leagueMethods(league), ['Cash', 'Venmo']);
  assert.equal(defaultMethod(league), 'Venmo');
  assert.equal(defaultMethod({ payment_methods: ['Zelle'], default_method: 'Cash' }), 'Zelle');
  assert.deepEqual(methodOptions(league, 'Check'), ['Cash', 'Venmo', 'Check']);
  assert.equal(methodsToSave(METHODS), null);
  assert.equal(methodsToSave([]), null);
  assert.deepEqual(methodsToSave(['Venmo', 'Cash']), ['Cash', 'Venmo']);
});

test('timeZoneOptions adds unlisted zones once', () => {
  const ids = timeZoneOptions('Europe/London', 'America/Denver').map((z) => z.id);
  assert.ok(ids.includes('Europe/London'));
  assert.equal(ids.filter((id) => id === 'America/Denver').length, 1);
});
