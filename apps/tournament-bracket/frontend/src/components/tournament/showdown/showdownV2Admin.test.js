import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { settleShootouts } from './showdownTestKit.js';
import { v2Event, toV2Playoffs, play, score, rnd, isFinal, isFirstRound, assertSound, finalKeyOf } from './showdownV2TestKit.js';

const first = (s, phase) => E.readyMatches(s.matches).find((m) => m.phase === phase && m.status !== 'completed');

describe('V2 rack bonuses', () => {
  it('pays $1 per rack to the winner and the loser of a played match, in qualifying and playoffs', () => {
    let { s, op } = v2Event(8, { seed: 3 });
    const m = first(s, 'qualifying');
    s = E.recordResult(s, m.id, { score1: 3, score2: 2 }, op());
    let e = E.computeEarnings(s);
    assert.equal(e.byPlayer[m.p1].qualifyingRacks, 3);
    assert.equal(e.byPlayer[m.p2].qualifyingRacks, 2, 'the loser is paid racks too');
    assert.equal(e.byPlayer[m.p1].qualifying, 5);
    assert.equal(e.byPlayer[m.p2].qualifying, 0);

    ({ s, op } = toV2Playoffs(8, { seed: 3 }));
    const pm = first(s, 'playoff');
    const before = E.computeEarnings(s);
    s = E.recordResult(s, pm.id, { score1: 4, score2: 5 }, op());
    e = E.computeEarnings(s);
    assert.equal(e.byPlayer[pm.p1].playoffRacks - before.byPlayer[pm.p1].playoffRacks, 4, 'losing finalist-path player keeps 4 racks');
    assert.equal(e.byPlayer[pm.p2].playoffRacks - before.byPlayer[pm.p2].playoffRacks, 5);
    assert.equal(e.byPlayer[pm.p2].playoff, s.playoffPlan.perRound[pm.roundKey]);
    assert.equal(e.playoffRacksPaid, 9);
  });

  it('administrative forfeits, withdrawals and walkovers never create racks', () => {
    let { s, op } = v2Event(8, { seed: 4 });
    const m = first(s, 'qualifying');
    s = E.recordForfeit(s, m.id, [m.p2], op());
    let e = E.computeEarnings(s);
    assert.equal(s.matches.find((x) => x.id === m.id).score1, 3, 'administrative 3–0 score is stored');
    assert.equal(e.byPlayer[m.p1].qualifyingRacks, 0, 'but pays no racks');
    assert.equal(e.byPlayer[m.p1].qualifying, 5, 'the forfeit win still pays the win');
    s = E.withdrawPlayer(s, 'P5', op());
    e = E.computeEarnings(s);
    const p5Matches = s.matches.filter((x) => x.phase === 'qualifying' && (x.p1 === 'P5' || x.p2 === 'P5'));
    assert.ok(p5Matches.every((x) => x.result === 'forfeit'));
    p5Matches.forEach((x) => assert.equal(e.byPlayer[x.winnerId].qualifyingRacks, 0));

    ({ s, op } = toV2Playoffs(14, { seed: 5 }));
    const pm = first(s, 'playoff');
    s = E.startOnTable(s, pm.id, 1, op());
    s = E.withdrawPlayer(s, pm.p1, op());
    const done = s.matches.find((x) => x.id === pm.id);
    assert.equal(done.result, 'walkover');
    e = E.computeEarnings(s);
    assert.equal(e.byPlayer[pm.p2].playoffRacks, 0, 'a walkover pays the round but no racks');
    assert.equal(e.byPlayer[pm.p2].playoff, s.playoffPlan.perRound[pm.roundKey]);
    assert.equal(e.playoffRacksPaid, 0);
  });
});

describe('V2 unawarded money goes to the champion exactly once', () => {
  it('qualifying double forfeit + playoff walkover: Q and the unused reserve reach the champion, pool exact', () => {
    let { s, op } = v2Event(12, { seed: 6 });
    s = play(s, op, 'qualifying', (m, i, r) => (i === 2 ? { forfeit: [m.p1, m.p2] } : score(rnd(3)(r))));
    s = settleShootouts(E.lockQualifying(s, op()), op);
    assert.equal(s.playoffPlan.doubleForfeitTransfer, 5);
    s = E.confirmPlayoff(E.drawPlayoff(s, op()), op());
    s = play(s, op, 'playoff', (m, i, r) => (i === 0 ? { forfeit: [m.p1] } : score(rnd(5)(r))), (n) => assertSound(n));
    const e = assertSound(s);
    assert.equal(e.championBonus, e.unusedReserve + 5);
    assert.ok(e.unusedReserve >= 9, 'the walkover’s 9 racks are unused');
    s = E.completeShowdown(s, op());
    const done = assertSound(s);
    assert.equal(done.byPlayer[s.championId].championBonus, e.championBonus);
    const wonRounds = s.matches.filter((m) => m.phase === 'playoff' && m.winnerId === s.championId && ['played', 'walkover', 'champion-walkover'].includes(m.result));
    const roundPay = wonRounds.reduce((x, m) => x + s.playoffPlan.perRound[m.roundKey], 0);
    assert.equal(done.byPlayer[s.championId].playoff, roundPay, 'round pay only; transfers are in the bonus, not the championship');
  });

  it('playoff double forfeit and empty positions: round pay moves to the champion bonus; Champion by Walkover completes', () => {
    let { s, op } = toV2Playoffs(8, { seed: 7 });
    const semi = first(s, 'playoff');
    s = E.recordForfeit(s, semi.id, [semi.p1, semi.p2], op());
    assertSound(s);
    s = play(s, op, 'playoff', (m, i, r) => score(rnd(5)(r)), (n) => assertSound(n));
    const final = s.matches.find((m) => isFinal(s, m));
    assert.equal(final.result, 'champion-walkover');
    const e = assertSound(s);
    assert.equal(e.transfers.playoff.length, 1);
    assert.equal(e.championBonus, e.unusedReserve + s.playoffPlan.perRound.semifinal);
    assert.equal(e.unusedReserve, 27 - e.playoffRacksPaid);
    s = E.completeShowdown(s, op());
    const done = assertSound(s);
    const champ = done.byPlayer[s.championId];
    assert.equal(champ.playoff, s.playoffPlan.perRound.semifinal + s.playoffPlan.perRound.final, 'semifinal + championship base, no transfer inside it');
    assert.equal(champ.championBonus, e.championBonus);
  });

  it('a championship double forfeit blocks completion and holds the unawarded money', () => {
    let { s, op } = toV2Playoffs(16, { seed: 8 });
    s = play(s, op, 'playoff', (m, i, r, st) => (isFinal(st, m) ? { forfeit: [m.p1, m.p2] } : score(rnd(5)(r))), (n) => assertSound(n));
    assert.equal(E.championshipStatus(s).status, 'unresolved');
    assert.throws(() => E.completeShowdown(s, op()), /Championship unresolved/);
    const e = assertSound(s);
    assert.equal(Object.values(e.byPlayer).reduce((x, r) => x + r.championBonus, 0), 0);
    assert.equal(e.paid + e.held + s.playoffPlan.perRound[finalKeyOf(s)], e.pool, 'held bonus + unpaid championship + paid = pool');
    assert.notEqual(E.reconciliationProblem(s), '');
  });

  it('a first-round walkover from a withdrawal after the draw reconciles to the pool', () => {
    let { s, op } = toV2Playoffs(18, { seed: 9 });
    const m = first(s, 'playoff');
    s = E.withdrawPlayer(s, m.p2, op());
    s = play(s, op, 'playoff', (x, i, r) => score(rnd(5)(r)), (n) => assertSound(n));
    s = E.completeShowdown(s, op());
    assertSound(s);
    assert.ok(s.matches.some((x) => isFirstRound(s, x) && x.result === 'walkover'));
  });
});
