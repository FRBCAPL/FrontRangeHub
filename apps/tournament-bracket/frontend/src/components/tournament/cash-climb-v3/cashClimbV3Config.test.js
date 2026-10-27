import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CASH_CLIMB_V3_FORMAT, cashClimbV3Config, cashClimbV3ConfigProblems, prizePoolCents } from './cashClimbV3Config.js';
import { cashClimbV3Plan } from './cashClimbV3Plan.js';

const base = { entrants: 16, entryFeeCents: 10000, addedMoneyCents: 0, raceTo: 7, rules: { game: '9-ball' } };

describe('Cash Climb V3 configuration', () => {
  it('uses its own format id, separate from King of the Hill and Showdown', () => {
    assert.equal(CASH_CLIMB_V3_FORMAT, 'cash-climb-v3');
    assert.notEqual(CASH_CLIMB_V3_FORMAT, 'cash-climb');
    assert.notEqual(CASH_CLIMB_V3_FORMAT, 'showdown');
  });

  it('accepts the minimums and keeps playing rules as an independent settings object', () => {
    const c = cashClimbV3Config({ entrants: 8, entryFeeCents: 1000, raceTo: 1 });
    assert.deepEqual([c.entrants, c.entryFeeCents, c.addedMoneyCents, c.raceTo], [8, 1000, 0, 1]);
    assert.deepEqual(cashClimbV3Config(base).rules, { game: '9-ball' });
  });

  it('P = N x E + A in exact cents', () => {
    assert.equal(prizePoolCents(cashClimbV3Config(base)), 160000);
    assert.equal(prizePoolCents(cashClimbV3Config({ ...base, entrants: 13, entryFeeCents: 2500, addedMoneyCents: 30000 })), 13 * 2500 + 30000);
  });

  it('rejects invalid configurations with a reason', () => {
    const bad = [
      [{ ...base, entrants: 7 }, 'at least 8'],
      [{ ...base, entrants: 8.5 }, 'whole number of entrants'],
      [{ ...base, entryFeeCents: 999 }, 'at least $10'],
      [{ ...base, entryFeeCents: 1050 }, 'whole number of dollars'],
      [{ ...base, entryFeeCents: 12.5 }, 'at least $10'],
      [{ ...base, addedMoneyCents: -100 }, 'cannot be negative'],
      [{ ...base, addedMoneyCents: 150 }, 'whole number of dollars'],
      [{ ...base, raceTo: 0 }, 'at least 1'],
      [{ ...base, raceTo: 2.5 }, 'at least 1'],
      [{ ...base, rules: 'cheap' }, 'settings object'],
    ];
    bad.forEach(([config, text]) => {
      const problems = cashClimbV3ConfigProblems(config);
      assert.ok(problems.some((p) => p.includes(text)), `${text}: ${problems.join(' | ')}`);
      assert.throws(() => cashClimbV3Config(config));
      assert.equal(cashClimbV3Plan(config).status, 'invalid');
    });
    assert.deepEqual(cashClimbV3ConfigProblems(null), ['Tournament settings are missing.']);
  });
});
