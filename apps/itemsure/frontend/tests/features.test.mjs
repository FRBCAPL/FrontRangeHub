// Feature switches: missing keys mean "on"; only an explicit false switches something off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FEATURES_ON, FEATURES, readFeatures } from '../src/utils/itemsureFeatures.js';

test('no saved switches (older business or no database change) means everything on', () => {
  for (const raw of [null, undefined, {}, [], 'spots', 3]) {
    assert.deepEqual(readFeatures(raw), { spots: true, packaging: true, transfers: true, approvals: true });
  }
  assert.deepEqual(ALL_FEATURES_ON, { spots: true, packaging: true, transfers: true, approvals: true });
});

test('a new business starts simple', () => {
  assert.deepEqual(
    readFeatures({ spots: false, packaging: false, transfers: false, approvals: false }),
    { spots: false, packaging: false, transfers: false, approvals: false },
  );
});

test('only an explicit false switches a feature off; unknown keys are ignored', () => {
  assert.deepEqual(readFeatures({ spots: false, transfers: 'no', colour: false }), {
    spots: false, packaging: true, transfers: true, approvals: true,
  });
});

test('every switch has a label and a hint', () => {
  assert.deepEqual(FEATURES.map((f) => f.key), ['spots', 'packaging', 'transfers', 'approvals']);
  FEATURES.forEach((f) => assert.ok(f.label && f.hint));
});
