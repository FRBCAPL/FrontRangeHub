// Feature switches: missing keys mean "on"; only an explicit false switches something off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FEATURES_ON, FEATURES, availableFeatures, readFeatures } from '../src/utils/itemsureFeatures.js';

const ALL_ON = { spots: true, packaging: true, transfers: true, approvals: true, details: true };

test('no saved switches (older business or no database change) means everything on', () => {
  for (const raw of [null, undefined, {}, [], 'spots', 3]) {
    assert.deepEqual(readFeatures(raw), ALL_ON);
  }
  assert.deepEqual(ALL_FEATURES_ON, ALL_ON);
});

test('a new business starts simple', () => {
  assert.deepEqual(
    readFeatures({ spots: false, packaging: false, transfers: false, approvals: false }),
    { spots: false, packaging: false, transfers: false, approvals: false, details: true },
  );
});

test('only an explicit false switches a feature off; unknown keys are ignored', () => {
  assert.deepEqual(readFeatures({ spots: false, transfers: 'no', colour: false, details: false }), {
    spots: false, packaging: true, transfers: true, approvals: true, details: false,
  });
});

test('every switch has a label and a hint', () => {
  assert.deepEqual(FEATURES.map((f) => f.key), ['spots', 'packaging', 'transfers', 'approvals', 'details']);
  FEATURES.forEach((f) => assert.ok(f.label && f.hint));
});

test('brand and details is only offered once its database update is applied', () => {
  assert.deepEqual(availableFeatures({}).map((f) => f.key), ['spots', 'packaging', 'transfers', 'approvals']);
  assert.deepEqual(availableFeatures({ detailsAvailable: true }).map((f) => f.key), ['spots', 'packaging', 'transfers', 'approvals', 'details']);
});
