import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { v3Event, playQualifying, qualify, playPlayoffs } from './showdownV3TestKit.js';
import { v3CorrectionProblem, v3CorrectionAudit } from './showdownV3Corrections.js';

const config = { entrants: 10, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5, seed: 21 };

describe('V3 result corrections', () => {
  it('accept a valid qualifying correction before the playoffs and audit it', () => {
    const ev = qualify(playQualifying(v3Event(config)));
    const m = ev.qualifying[0];
    const fixed = { ...m, score1: m.score2, score2: m.score1 };
    assert.equal(v3CorrectionProblem(ev.plan, ev.playerIds, ev.qualifying, fixed), '');
    const audit = v3CorrectionAudit(m, fixed, { by: 'op', at: 'now', reason: 'Scores swapped' });
    assert.equal(audit.type, 'v3-result-correction');
    assert.deepEqual([audit.details.before.score1, audit.details.after.score1], [m.score1, m.score2]);
    assert.throws(() => v3CorrectionAudit(m, fixed, { by: 'op', at: 'now', reason: '' }));
  });

  it('reject scores that break the V3 rules', () => {
    const ev = qualify(playQualifying(v3Event(config)));
    const m = ev.qualifying[0];
    assert.match(v3CorrectionProblem(ev.plan, ev.playerIds, ev.qualifying, { ...m, score1: 7, score2: 7 }), /add up to 7/);
    const done = playPlayoffs(ev);
    const all = [...done.qualifying, ...done.playoffs];
    const p = done.playoffs.find((x) => x.result === 'played');
    assert.match(v3CorrectionProblem(done.plan, done.playerIds, all, { ...p, score1: 6, score2: 2 }), /reach exactly 5/);
  });

  it('once a playoff result exists, refuse qualifying corrections that change who qualified', () => {
    const ev = playPlayoffs(qualify(playQualifying(v3Event(config))));
    const all = [...ev.qualifying, ...ev.playoffs];
    const outsider = ev.playerIds.find((id) => !ev.qualifierIds.includes(id));
    const ctx = { byeIds: ev.byeIds, withdrawnIds: [], shootouts: ev.shootouts };
    const flips = ev.qualifying.filter((m) => m.p1 === outsider || m.p2 === outsider).map((m) => ({
      ...m, score1: m.p1 === outsider ? 7 : 0, score2: m.p2 === outsider ? 7 : 0, winnerId: outsider,
    }));
    let matches = all;
    let problem = '';
    flips.forEach((f) => { problem = problem || v3CorrectionProblem(ev.plan, ev.playerIds, matches, f, ctx); matches = matches.map((m) => (m.id === f.id ? f : m)); });
    assert.match(problem, /cannot change who qualified/);
  });
});
