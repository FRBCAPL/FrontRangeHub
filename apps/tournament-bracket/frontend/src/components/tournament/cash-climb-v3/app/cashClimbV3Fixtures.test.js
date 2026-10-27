/**
 * Frozen historical Cash Climb (V3) records (fixtures/*.json, schema 1, engine 1, optimizer
 * cash-climb-v3-reference-2026-10-r90). They were saved once by the approved app and must restore and replay
 * identically in every future build. If an engine or optimizer change breaks one, that change must ship as a
 * new engine version (with the version-1 code kept for these records), never as an edit to the fixtures.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { payloadProblem, requiredLevel } from '../cloud/cashClimbV3CloudRules.js';

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const OPTIMIZER = 'cash-climb-v3-reference-2026-10-r90';

const EXPECTED = {
  'v1-setup-8': { status: 'setup', ladder: [22, 36], prize: 16000, earned: 0, retained: 0, entries: 0, mode: null, champion: null },
  'v1-in-progress-12': { status: 'in-progress', ladder: [38, 72], prize: 30000, earned: 8600, retained: 0, entries: 12, mode: null, champion: null },
  'v1-settled-normal-16': { status: 'completed', ladder: [20, 40, 80], prize: 48000, earned: 48000, retained: 0, entries: 26, mode: 'normal', champion: 'p16' },
  'v1-settled-exceptional-8': { status: 'completed', ladder: [22, 36], prize: 16000, earned: 12700, retained: 3300, entries: 11, mode: 'exceptional', champion: 'p3' },
};

/** Reverses every object's key order, as a cloud round trip (Postgres jsonb) may reorder keys. */
const reorder = (v) => (Array.isArray(v) ? v.map(reorder)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map((k) => [k, reorder(v[k])])) : v);

describe('Cash Climb (V3) frozen historical records', () => {
  for (const [name, want] of Object.entries(EXPECTED)) {
    it(`${name} restores and replays exactly, with its locked payout and earnings`, () => {
      const raw = load(name);
      const restored = restoreCashClimbV3Record(raw);
      assert.equal(restored.status, 'ok', restored.problems?.join(' '));
      assert.equal(restored.optimizerCurrent, true);
      assert.deepEqual(restored.record, raw, 'restored exactly as saved, nothing recalculated');
      assert.equal(raw.schemaVersion, 1);
      assert.equal(raw.event.version, 1);
      assert.equal(raw.payout.optimizerId, OPTIMIZER);
      assert.equal(raw.status, want.status);
      assert.deepEqual(raw.payout.ladder, want.ladder);
      const s = ledgerSummary(raw.event.ledger);
      assert.deepEqual([s.prizePoolCents, s.earnedCents, s.operatorRetainedCents, raw.event.ledger.entries.length], [want.prize, want.earned, want.retained, want.entries]);
      assert.equal(raw.event.settlement?.mode ?? null, want.mode);
      assert.equal(raw.event.settlement?.championId ?? null, want.champion);
    });

    it(`${name} still restores after a cloud round trip reorders its keys`, () => {
      assert.equal(restoreCashClimbV3Record(reorder(load(name))).status, 'ok');
    });

    it(`${name} is accepted by the cloud rules at client level 1`, () => {
      const raw = load(name);
      assert.equal(payloadProblem(raw.id, raw), '');
      assert.equal(requiredLevel(raw), 1);
    });
  }

  it('a record from an unknown engine or schema version is refused, never repaired', () => {
    const raw = load('v1-in-progress-12');
    const newerEngine = { ...raw, event: { ...raw.event, version: 2 } };
    const newerSchema = { ...raw, schemaVersion: 2 };
    assert.equal(restoreCashClimbV3Record(newerEngine).status, 'invalid');
    assert.match(restoreCashClimbV3Record(newerSchema).problems[0], /newer version of the app/);
  });

  it('a tampered historical record is refused', () => {
    const raw = load('v1-settled-normal-16');
    raw.event.ledger.entries[0].cents += 100;
    assert.equal(restoreCashClimbV3Record(raw).status, 'invalid');
  });
});
