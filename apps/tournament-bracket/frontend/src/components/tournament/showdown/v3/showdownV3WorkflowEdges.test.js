import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import {
  CONFIRM, startV3, toBracketV3, toPlayoffsV3, playPlayoffsV3, playQualifyingV3, runV3, startNext, money, auditActions,
} from './showdownV3WorkflowKit.js';

const qual = (s) => s.matches.filter((m) => m.phase === 'qualifying');
const playoff = (s) => s.matches.filter((m) => m.phase === 'playoff');
const byId = (s, id) => s.matches.find((m) => m.id === id);
const exact = (s) => {
  const m = money(s);
  assert.ok(m.settlement.ok, m.settlement.problems.join('; '));
  return m;
};

describe('V3 forfeits and withdrawals in the workflow', () => {
  it('a partial forfeit keeps the games played; the credit is finalized and stored when qualifying locks', () => {
    const { s, op } = startV3(9, { seed: 21 });
    const [on, m] = startNext(s, op, 'qualifying');
    const f = E.recordForfeit(on, m.id, [m.p1], op(), { score1: 2, score2: 1 });
    const rec = byId(f, m.id);
    assert.deepEqual([rec.result, rec.score1, rec.score2, rec.winnerId], ['forfeit', 2, 1, m.p2]);
    assert.throws(() => E.recordForfeit(on, m.id, [m.p1], op(), { score1: 5, score2: 2 }), /fewer than 7/);
    const locked = E.lockQualifying(playQualifyingV3(f, op), op());
    const snap = locked.qualification.v3Credits;
    assert.ok(snap.finalizedAt);
    assert.equal(snap.credits.length, 1);
    assert.deepEqual([snap.credits[0].playerId, snap.credits[0].unplayed, snap.credits[0].provisional], [m.p2, 4, false]);
    const entry = locked.audit.find((a) => a.action === 'lock-qualifying');
    assert.deepEqual(entry.detail.v3Credits, snap.credits);
  });

  it('a double forfeit pays nobody for the match and the event still reconciles', () => {
    const { s, op } = startV3(8, { seed: 22 });
    const [on, m] = startNext(s, op, 'qualifying');
    const f = E.recordForfeit(on, m.id, [m.p1, m.p2], op(), { score1: 1, score2: 1 });
    assert.equal(byId(f, m.id).result, 'double-forfeit');
    let state = E.lockQualifying(playQualifyingV3(f, op), op());
    state = E.confirmPlayoff(E.drawPlayoff(state, op()), op());
    const done = E.completeShowdown(playPlayoffsV3(state, op), op());
    assert.equal(E.reconciliationProblem(done), '');
    assert.equal(done.qualification.v3Credits.credits.length, 0);
  });

  it('a withdrawal mid-match keeps the games already played; later matches become credited forfeits', () => {
    const { s, op } = startV3(9, { seed: 23 });
    const [on, m] = startNext(s, op, 'qualifying');
    const w = E.withdrawPlayer(on, m.p1, op(), { scoresSoFar: { [m.id]: { score1: 3, score2: 2 } } });
    const rec = byId(w, m.id);
    assert.deepEqual([rec.result, rec.score1, rec.score2, rec.auto], ['forfeit', 3, 2, 'withdrawal']);
    const other = qual(w).find((x) => x.id !== m.id && (x.p1 === m.p1 || x.p2 === m.p1));
    assert.deepEqual([byId(w, other.id).result, byId(w, other.id).score1, byId(w, other.id).score2], ['forfeit', 0, 0]);
    let state = E.lockQualifying(playQualifyingV3(w, op), op());
    assert.ok(!state.qualification.qualifierIds.includes(m.p1));
    state = E.confirmPlayoff(E.drawPlayoff(state, op()), op());
    const done = E.completeShowdown(playPlayoffsV3(state, op), op());
    assert.equal(E.reconciliationProblem(done), '');
    assert.ok(money(done).byPlayer[m.p1].totalCents > 0, 'the withdrawn player keeps the games they won');
  });

  it('a playoff withdrawal is a walkover; a semifinal double forfeit gives a Champion by Walkover', () => {
    const { s: po, op } = toPlayoffsV3(8, { seed: 24 });
    const semi = playoff(po).find((m) => m.p1 && m.p2);
    const w1 = E.withdrawPlayer(po, semi.p1, op());
    assert.deepEqual([byId(w1, semi.id).result, byId(w1, semi.id).winnerId], ['walkover', semi.p2]);
    const on = E.startOnTable(po, semi.id, 1, op());
    const both = E.recordForfeit(on, semi.id, [semi.p1, semi.p2], op(), { score1: 2, score2: 1 });
    assert.equal(byId(both, semi.id).result, 'double-forfeit');
    const done = E.completeShowdown(playPlayoffsV3(both, op), op());
    const final = playoff(done).find((m) => m.roundKey === 'final');
    assert.equal(final.result, 'champion-walkover');
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('confirmed byes and walkovers in a 13-player bracket reconcile', () => {
    const { s: po, op } = toPlayoffsV3(13, { seed: 25 });
    assert.equal(po.playoff.byes.length, 3);
    const opening = playoff(po).find((m) => m.p1 && m.p2);
    const done = E.completeShowdown(playPlayoffsV3(E.withdrawPlayer(po, opening.p2, op()), op), op());
    assert.equal(E.reconciliationProblem(done), '');
  });
});

describe('V3 interruptions and abandonment', () => {
  it('during qualifying: matches on a table keep their games and the rest is split among non-withdrawn entrants', () => {
    const { s, op } = startV3(9, { seed: 31 });
    let state = E.withdrawPlayer(s, 'P9', op());
    const [on, m] = startNext(state, op, 'qualifying');
    assert.throws(() => E.interruptShowdown(on, {}, 'no', op()), /Type RESET/);
    state = E.interruptShowdown(on, { scores: { [m.id]: { score1: 2, score2: 1 } } }, CONFIRM, op());
    assert.equal(state.status, 'completed');
    assert.equal(state.v3Outcome.kind, 'interrupted');
    assert.equal(state.v3Outcome.stage, 'qualifying');
    assert.deepEqual([byId(state, m.id).result, byId(state, m.id).score1], ['interrupted', 2]);
    const mo = exact(state);
    assert.equal(mo.paidCents, mo.poolCents);
    assert.equal(state.v3Settlement.recipients.length, 8);
    assert.ok(!state.v3Settlement.recipients.includes('P9'));
    assert.deepEqual(state.v3Settlement.pendingApproval, []);
    assert.equal(state.championId, null);
    const snap = state.qualification.v3Credits;
    assert.ok(snap.finalizedAt && snap.credits.length > 0, 'the withdrawal credits are finalized when play stops');
    assert.ok(snap.credits.every((x) => x.provisional === false));
    assert.deepEqual(money(E.clone(state)).byPlayer, money(state).byPlayer);
  });

  it('the 50\u00a2 indivisible remainder goes in current standings order', () => {
    const { s, op } = startV3(9, { seed: 32 });
    const state = E.interruptShowdown(playQualifyingV3(s, op), {}, CONFIRM, op());
    const rows = money(state).settlement.rows;
    const shares = state.v3Settlement.recipients.map((id) => rows[id].settlementCents);
    assert.ok(shares.every((v, i) => i === 0 || v <= shares[i - 1]), 'earlier standings never receive less');
    assert.ok(Math.max(...shares) - Math.min(...shares) <= 50);
  });

  it('during the playoffs: split among remaining playoff players; only the final left is an interrupted final', () => {
    const { s: po, op } = toPlayoffsV3(20, { seed: 33 });
    const mid = E.interruptShowdown(po, {}, CONFIRM, op());
    assert.equal(mid.v3Outcome.kind, 'interrupted');
    assert.ok(mid.v3Settlement.recipients.every((id) => po.qualification.qualifierIds.includes(id)));
    exact(mid);

    let state = po;
    for (let guard = 0; guard < 40; guard += 1) {
      const open = playoff(state).filter((m) => m.status !== 'completed' && m.roundKey !== 'final' && m.p1 && m.p2);
      if (!open.length) break;
      const m = open[0];
      state = E.startOnTable(state, m.id, 1, op());
      state = E.recordResult(state, m.id, { score1: 5, score2: 2 }, op());
    }
    const final = playoff(state).find((m) => m.roundKey === 'final');
    const onFinal = E.startOnTable(state, final.id, 1, op());
    const end = E.interruptShowdown(onFinal, { scores: { [final.id]: { score1: 3, score2: 4 } } }, CONFIRM, op());
    assert.equal(end.v3Outcome.kind, 'interrupted-final');
    assert.deepEqual([...end.v3Settlement.recipients].sort(), [final.p1, final.p2].sort());
    assert.equal(exact(end).paidCents, end.v3Settlement.poolCents);
  });

  it('a settled interruption is final: no reopening, no undo, no more results', () => {
    const { s: po, op } = toPlayoffsV3(8, { seed: 34 });
    const m = playoff(po).find((x) => x.p1 && x.p2);
    const played = E.recordResult(E.startOnTable(po, m.id, 1, op()), m.id, { score1: 5, score2: 0 }, op());
    const end = E.interruptShowdown(played, {}, CONFIRM, op());
    assert.throws(() => E.reopenQualifying(end, CONFIRM, op()), /interrupted|playoff result/);
    assert.throws(() => E.undoPlayoffFrom(end, m.id, CONFIRM, op()), /final/);
    assert.throws(() => E.interruptShowdown(end, {}, CONFIRM, op()), /running event/);
  });

  /** Everyone left in an 8-player bracket leaves; `voluntary` decides how the operator confirmed each exit. */
  function everyoneLeaves(seed, { voluntary = true, semi2Voluntary = voluntary } = {}) {
    const { s: po, op } = toPlayoffsV3(8, { seed });
    const [semi1, semi2] = playoff(po).filter((m) => m.roundKey === 'semifinal');
    let state = E.withdrawPlayer(po, semi1.p1, op(), { voluntary });
    state = E.withdrawPlayer(state, semi1.p2, op(), { voluntary });
    const on = E.startOnTable(state, semi2.id, 1, op());
    state = E.recordForfeit(on, semi2.id, [semi2.p1, semi2.p2], op(), { score1: 1, score2: 2, voluntary: semi2Voluntary });
    return { po, state, op };
  }

  it('complete voluntary abandonment is recorded separately as proposed operator-retained funds', () => {
    const { po, state, op } = everyoneLeaves(35);
    assert.throws(() => E.abandonShowdown(po, CONFIRM, op()), /still in the playoffs/);
    assert.throws(() => E.completeShowdown(state, op()), /unresolved/i);
    const end = E.abandonShowdown(state, CONFIRM, op());
    assert.equal(end.audit[end.audit.length - 1].detail.voluntaryLeavers.length, 4);
    assert.equal(end.v3Outcome.kind, 'abandoned');
    const snap = end.v3Settlement;
    assert.ok(snap.proposedOperatorRetainedCents > 0);
    assert.equal(snap.retentionApproved, false);
    assert.deepEqual(snap.pendingApproval, ['abandonment-retention']);
    assert.equal(snap.paidCents + snap.proposedOperatorRetainedCents, snap.poolCents);
    assert.ok(snap.paidCents < snap.poolCents, 'not represented as a 100% player payout');
    assert.match(snap.disclosures.join(' '), /not approved yet/);
    const before = money(state).byPlayer;
    Object.entries(money(end).byPlayer).forEach(([id, r]) => assert.ok(r.totalCents >= before[id].totalCents, 'earned pay is kept'));
  });

  it('exits not confirmed as voluntary are not abandonment: the event must be recorded as an interruption', () => {
    const notVoluntary = everyoneLeaves(36, { voluntary: false });
    assert.throws(() => E.abandonShowdown(notVoluntary.state, CONFIRM, notVoluntary.op()), /Not confirmed as voluntary: .*record an interruption/);
    const oneForfeit = everyoneLeaves(36, { voluntary: true, semi2Voluntary: false });
    assert.throws(() => E.abandonShowdown(oneForfeit.state, CONFIRM, oneForfeit.op()), /Not confirmed as voluntary/);
    assert.throws(() => E.interruptShowdown(notVoluntary.state, {}, CONFIRM, notVoluntary.op()), /left unresolved for your review/);
    const before = money(notVoluntary.state).byPlayer;
    const end = E.interruptShowdown(notVoluntary.state, { acknowledgeUnresolved: true }, CONFIRM, notVoluntary.op());
    const snap = end.v3Settlement;
    assert.equal(end.v3Outcome.kind, 'interrupted');
    assert.equal(snap.proposedOperatorRetainedCents, 0);
    assert.deepEqual(snap.recipients, [], 'former playoff players are not paid just because they were not beaten');
    assert.ok(snap.unresolvedCents > 0);
    assert.deepEqual(snap.pendingApproval, ['interruption-review']);
    assert.equal(snap.paidCents + snap.unresolvedCents, snap.poolCents);
    assert.match(snap.disclosures[0], /not assigned to anyone automatically/);
    Object.entries(money(end).byPlayer).forEach(([id, r]) => assert.equal(r.totalCents, before[id].totalCents, 'only earned pay'));
  });

  it('an operator-reviewed adjustment can assign unresolved interruption money, with a reason', () => {
    const { state, op } = everyoneLeaves(38, { voluntary: false });
    const end = E.interruptShowdown(state, { acknowledgeUnresolved: true }, CONFIRM, op());
    const open = end.v3Settlement.unresolvedCents;
    const player = end.players[0].id;
    assert.throws(() => E.adjustPayout(end, { playerId: player, amountCents: open + 50, reason: 'Review' }, op()), /left undistributed/);
    const adjusted = E.adjustPayout(end, { playerId: player, amountCents: 500, reason: 'Operator review: venue closure refund' }, op());
    assert.equal(adjusted.v3Settlement.unresolvedCents, open - 500);
    assert.equal(adjusted.v3Settlement.paidCents + adjusted.v3Settlement.unresolvedCents, adjusted.v3Settlement.poolCents);
  });

  it('an interruption with players still eligible pays only them and needs no acknowledgment', () => {
    const { s: po, op } = toPlayoffsV3(8, { seed: 39 });
    const qf = playoff(po).find((m) => m.p1 && m.p2);
    const gone = E.withdrawPlayer(po, qf.p1, op(), { voluntary: false });
    const end = E.interruptShowdown(gone, {}, CONFIRM, op());
    const recipients = end.v3Settlement.recipients;
    assert.ok(recipients.length > 0 && !recipients.includes(qf.p1), 'a withdrawn player is not eligible');
    assert.equal(end.v3Settlement.unresolvedCents, 0);
    assert.equal(end.v3Settlement.paidCents, end.v3Settlement.poolCents);
  });

  it('an interrupted playoff match rules out abandonment', () => {
    const { s: po, op } = toPlayoffsV3(8, { seed: 37 });
    const stopped = E.interruptShowdown(po, {}, CONFIRM, op());
    assert.throws(() => E.abandonShowdown(stopped, CONFIRM, op()), /Only running playoffs/);
  });
});

describe('V3 partial scores are never assumed', () => {
  it('a forfeit needs the games played or an explicit no-games confirmation', () => {
    const { s, op } = startV3(8, { seed: 61 });
    const [on, m] = startNext(s, op, 'qualifying');
    assert.throws(() => E.recordForfeit(on, m.id, [m.p1], op()), /Enter the games already played/);
    assert.throws(() => E.recordForfeit(on, m.id, [m.p1], op(), { score1: 2 }), /Enter the games already played/);
    assert.throws(() => E.recordForfeit(on, m.id, [m.p1], op(), { score1: 2, score2: 0, noGamesPlayed: true }), /no games played was also confirmed/);
    const none = E.recordForfeit(on, m.id, [m.p1], op(), { noGamesPlayed: true });
    assert.deepEqual([byId(none, m.id).score1, byId(none, m.id).score2], [0, 0]);
    assert.equal(byId(none, m.id).voluntaryForfeit, undefined, 'unclassified is recorded as unclassified, never as a choice');
    const chosen = E.recordForfeit(on, m.id, [m.p1], op(), { noGamesPlayed: true, voluntary: false });
    assert.equal(byId(chosen, m.id).voluntaryForfeit, false);
  });

  it('a withdrawal from a match on a table needs its score; matches never started need none', () => {
    const { s, op } = startV3(9, { seed: 62 });
    const [on, m] = startNext(s, op, 'qualifying');
    assert.throws(() => E.withdrawPlayer(on, m.p1, op()), /Enter the games already played/);
    const w = E.withdrawPlayer(on, m.p1, op(), { scoresSoFar: { [m.id]: { noGamesPlayed: true } }, voluntary: true });
    assert.equal(byId(w, m.id).result, 'forfeit');
    assert.equal(w.players.find((p) => p.id === m.p1).withdrawnVoluntarily, true);
    const idle = qual(s).find((x) => x.p1 !== m.p1 && x.p2 !== m.p1 && x.p1 !== m.p2 && x.p2 !== m.p2);
    assert.equal(E.withdrawPlayer(s, idle.p1, op()).players.find((p) => p.id === idle.p1).withdrawnVoluntarily, false);
  });

  it('an interruption needs the score of every match on a table', () => {
    const { s, op } = startV3(8, { seed: 63 });
    const [on, m] = startNext(s, op, 'qualifying');
    assert.throws(() => E.interruptShowdown(on, {}, CONFIRM, op()), /Enter the games already played/);
    const end = E.interruptShowdown(on, { scores: { [m.id]: { noGamesPlayed: true } } }, CONFIRM, op());
    assert.equal(byId(end, m.id).result, 'interrupted');
  });

  it('V1 and V2 withdrawals and forfeits are unchanged and store no V3 fields', async () => {
    const { startedEvent } = await import('../showdownTestKit.js');
    for (const v of [1, 2]) {
      const { s, op } = startedEvent(9, { seed: 64, payoutVersion: v });
      const m = qual(s)[0];
      const f = E.recordForfeit(E.startOnTable(s, m.id, 1, op()), m.id, [m.p1], op());
      assert.equal(byId(f, m.id).voluntaryForfeit, undefined);
      const w = E.withdrawPlayer(s, 'P9', op());
      assert.equal('withdrawnVoluntarily' in w.players.find((p) => p.id === 'P9'), false);
    }
  });
});

describe('V3 corrections', () => {
  it('before the lock: a correction is audited with the old and new score; an invalid one is refused', () => {
    const { s, op } = startV3(8, { seed: 41 });
    const [on, m] = startNext(s, op, 'qualifying');
    const first = E.recordResult(on, m.id, { score1: 4, score2: 3 }, op());
    const fixed = E.recordResult(first, m.id, { score1: 3, score2: 4 }, op());
    const entry = fixed.audit[fixed.audit.length - 1];
    assert.equal(entry.action, 'correct-result');
    assert.deepEqual([entry.detail.from.score1, entry.detail.to.score1], [4, 3]);
    assert.throws(() => E.recordResult(first, m.id, { score1: 4, score2: 4 }, op()), /add up to 7/);
  });

  it('after the lock: qualifying is closed until reopened, and relocking stores a new credit snapshot', () => {
    const { s, op } = toBracketV3(9, { seed: 42 });
    const m = qual(s)[0];
    assert.throws(() => E.recordResult(s, m.id, { score1: 0, score2: 7 }, op()), /Qualifying is locked/);
    const reopened = E.reopenQualifying(s, CONFIRM, op());
    assert.equal(reopened.qualification, null);
    const fixed = E.recordResult(reopened, m.id, { score1: m.score2, score2: m.score1 }, op());
    const relocked = E.lockQualifying(fixed, op());
    assert.ok(relocked.qualification.v3Credits.finalizedAt > s.qualification.v3Credits.finalizedAt);
  });

  it('after any playoff result qualifying and shootouts cannot be reopened; playoff results can still be corrected', () => {
    const { s: po, op } = toPlayoffsV3(8, { seed: 43 });
    const m = playoff(po).find((x) => x.p1 && x.p2);
    const played = E.recordResult(E.startOnTable(po, m.id, 1, op()), m.id, { score1: 5, score2: 1 }, op());
    assert.throws(() => E.reopenQualifying(played, CONFIRM, op()), /playoff result has been recorded/);
    const fixed = E.recordResult(played, m.id, { score1: 2, score2: 5 }, op());
    assert.equal(byId(fixed, m.id).winnerId, m.p2);
    assert.throws(() => E.recordResult(played, m.id, { score1: 5, score2: 5 }, op()), /exactly 5/);
    assert.ok(E.reopenQualifying(po, CONFIRM, op()).status === 'qualifying', 'allowed while no playoff result exists');
  });

  it('undoing a completed event clears its saved settlement, and completing again re-saves it', () => {
    const { s: done, op } = runV3(8, { seed: 44 });
    const final = playoff(done).find((m) => m.roundKey === 'final');
    const undone = E.undoPlayoffFrom(done, final.id, CONFIRM, op());
    assert.equal(undone.status, 'playoffs');
    assert.equal(undone.v3Outcome, null);
    assert.equal(undone.v3Settlement, null);
    const again = E.completeShowdown(playPlayoffsV3(undone, op), op());
    assert.equal(again.v3Outcome.kind, 'completed');
    assert.equal(E.reconciliationProblem(again), '');
  });
});

describe('V3 operator adjustments in the workflow', () => {
  it('only after settlement, funded from the remainder, audited, and never above the pool', () => {
    const { s: po, op } = toPlayoffsV3(12, { seed: 51 });
    assert.throws(() => E.adjustPayout(po, { playerId: 'P1', amountCents: 100, reason: 'x' }, op()), /after the event is settled/);
    const { s: done } = runV3(12, { seed: 51 });
    const remainder = done.v3Settlement.remainderCents;
    const p = done.players.map((x) => x.id).find((id) => id !== done.championId);
    const adj = E.adjustPayout(done, { playerId: p, amountCents: 100, reason: 'Scoring error' }, op());
    assert.equal(money(adj).byPlayer[p].adjustmentCents, 100);
    assert.equal(adj.v3Settlement.paidCents, adj.v3Settlement.poolCents);
    assert.ok(auditActions(adj).includes('v3-adjustment'));
    assert.equal(adj.v3Adjustments.length, 1);
    assert.throws(() => E.adjustPayout(done, { playerId: p, amountCents: remainder + 50, reason: 'Too much' }, op()), /left undistributed/);
    assert.throws(() => E.adjustPayout(done, { playerId: p, amountCents: -50, reason: 'Reduce' }, op()), /Earned pay cannot be reduced/);
    assert.throws(() => E.adjustPayout(done, { playerId: p, amountCents: 100, reason: ' ' }, op()), /reason/);
    const back = E.adjustPayout(adj, { playerId: p, amountCents: -100, reason: 'Entered twice' }, op());
    assert.equal(money(back).byPlayer[p].adjustmentCents, 0);
    const final = playoff(adj).find((m) => m.roundKey === 'final');
    assert.throws(() => E.undoPlayoffFrom(adj, final.id, CONFIRM, op()), /adjustments were recorded/);
  });

  it('adjustments are saved with the event and survive a reload', () => {
    const { s: done, op } = runV3(9, { seed: 52 });
    const adj = E.adjustPayout(done, { playerId: 'P3', amountCents: 50, reason: 'Late correction' }, op());
    const saved = E.clone(adj);
    assert.deepEqual(saved.v3Adjustments, adj.v3Adjustments);
    assert.deepEqual(money(saved).byPlayer, money(adj).byPlayer);
    assert.equal(E.reconciliationProblem(saved), '');
  });
});
