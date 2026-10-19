import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { operator, names, startedEvent, runToCompletion } from '../showdownTestKit.js';
import { v3RoundLabelProblems } from './showdownV3Rounds.js';
import { v3LockedPlanProblem } from './showdownV3Event.js';
import {
  v3Op, createV3, startV3, toBracketV3, toPlayoffsV3, playPlayoffsV3, playQualifyingV3, runV3, money, auditActions,
} from './showdownV3WorkflowKit.js';

const qual = (s) => s.matches.filter((m) => m.phase === 'qualifying');

describe('V3 starts are open to operators', () => {
  it('without the development preview flag a valid V3 event starts', () => {
    const op = operator(1);
    const s = createV3(8, {}, op);
    assert.deepEqual(E.setupProblems(s), []);
    const started = E.startShowdown(s, op());
    assert.equal(started.status, 'qualifying');
    assert.equal(v3LockedPlanProblem(started), '');
  });

  it('the preview flag never bypasses a real setup problem', () => {
    const op = v3Op(2);
    assert.throws(() => E.startShowdown(createV3(8, { games: 4 }, op), op()), /Games per qualifying match/);
    assert.throws(() => E.startShowdown(createV3(8, { raceTo: 12 }, op), op()), /playoff race/);
  });
});

describe('complete V3 tournaments through the shared workflow', () => {
  for (const n of [8, 9, 23, 24]) {
    for (const seed of [1, 2, 3]) {
      it(`${n} entrants (seed ${seed}): plays, reconciles to the cent and saves the settlement`, () => {
        const { s: started } = startV3(n, { seed, fee: n > 20 ? 30 : 20 });
        const lockedPlan = started.payoutPlan;
        assert.equal(lockedPlan.payoutVersion, 3);
        assert.deepEqual(v3RoundLabelProblems(qual(started)), []);
        assert.equal(qual(started).filter((m) => m.bridge).length, n % 2);

        const { s: done } = runV3(n, { seed, fee: n > 20 ? 30 : 20 });
        assert.equal(done.status, 'completed');
        assert.deepEqual(done.payoutPlan, lockedPlan, 'the plan locked at the start never changes');
        assert.equal(v3LockedPlanProblem(done), '');
        assert.equal(E.reconciliationProblem(done), '');
        const m = money(done);
        assert.equal(m.paidCents, m.poolCents);
        assert.equal(done.v3Outcome.kind, 'completed');
        assert.equal(done.v3Settlement.paidCents, done.v3Settlement.poolCents);
        assert.equal(done.championId, m.status.championId);
        assert.ok(done.qualification.v3Credits.finalizedAt);
        assert.deepEqual(done.playoffPlan.perRound, lockedPlan.ladder.perRound);
        for (const a of ['start', 'lock-qualifying', 'confirm-bracket', 'complete']) assert.ok(auditActions(done).includes(a), a);
        Object.values(m.byPlayer).forEach((r) => assert.ok(r.totalCents >= 0 && r.totalCents % 50 === 0));
      });
    }
  }

  it('earned money never exceeds the pool at any stage of the event', () => {
    for (const n of [8, 12, 17, 24]) {
      const { s, op } = startV3(n, { seed: n });
      const check = (state, label) => assert.ok(money(state).paidCents <= money(state).poolCents, `${n}: ${label}`);
      check(s, 'start');
      const played = playQualifyingV3(s, op);
      check(played, 'qualifying');
      const { s: bracket } = toBracketV3(n, { seed: n });
      check(bracket, 'bracket');
      const { s: po, op: op2 } = toPlayoffsV3(n, { seed: n });
      check(po, 'confirmed');
      check(playPlayoffsV3(po, op2), 'playoffs');
    }
  });

  it('a 12-player field confirms its 3 byes and still reconciles', () => {
    const { s } = runV3(12, { seed: 5 });
    assert.equal(s.playoff.byes.length, 3);
    assert.equal(E.reconciliationProblem(s), '');
  });

  it('tied qualifying results are recorded with no winner, and an all-tied field is settled by the existing shootouts', () => {
    const { s, op } = startV3(12, { seed: 7, games: 8 });
    const tied = playQualifyingV3(s, op, () => [4, 4]);
    assert.ok(qual(tied).every((m) => m.result === 'played' && m.winnerId === null));
    const locked = E.lockQualifying(tied, op());
    assert.equal(locked.status, 'shootout');
    const { s: done } = runV3(12, { seed: 7, games: 8, decide: () => [4, 4] });
    assert.equal(done.status, 'completed');
    assert.ok(done.shootouts.length >= 1);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('a qualifying score must use every game; playoff scores are races', () => {
    const { s, op } = startV3(8, { seed: 3 });
    const m = qual(s)[0];
    const on = E.startOnTable(s, m.id, 1, op());
    assert.throws(() => E.recordResult(on, m.id, { score1: 4, score2: 2 }, op()), /add up to 7/);
    assert.throws(() => E.recordResult(on, m.id, { score1: 7, score2: 1 }, op()), /add up to 7/);
    assert.equal(E.recordResult(on, m.id, { score1: 7, score2: 0 }, op()).matches.find((x) => x.id === m.id).winnerId, m.p1);
  });
});

describe('the locked payout plan', () => {
  it('cannot change after the start: settings, format and a tampered plan are all refused', () => {
    const { s, op } = startV3(9, { seed: 4 });
    assert.throws(() => E.updateSettings(s, { entryFee: 50 }, op()), /Only the table count/);
    assert.throws(() => E.updateSettings(s, { qualifyingGames: 9 }, op()), /Only the table count/);
    assert.throws(() => E.changeFormat(s, 1, { confirmed: true }, op()), /locked once the event starts/);
    const { s: po, op: op2 } = toPlayoffsV3(9, { seed: 4 });
    const played = playPlayoffsV3(po, op2);
    const tampered = { ...played, payoutPlan: { ...played.payoutPlan, rates: { ...played.payoutPlan.rates, r2: played.payoutPlan.rates.r2 + 50 } } };
    assert.throws(() => E.completeShowdown(tampered, op2()), /damaged|locked/);
    const swapped = { ...played, payoutPlan: { ...played.payoutPlan, championshipTierPct: 100 } };
    assert.throws(() => E.completeShowdown(swapped, op2()), /locked/);
  });

  it('the playoff plan copies the locked ladder; locking qualifying does not rebuild the payouts', () => {
    const { s } = toBracketV3(16, { seed: 2 });
    assert.equal(s.playoffPlan.payoutVersion, 3);
    assert.deepEqual(s.playoffPlan.perRound, s.payoutPlan.ladder.perRound);
    assert.equal(s.playoffPlan.playoffGameReserveCents, s.payoutPlan.reserves.playoffGames);
    assert.deepEqual(s.playoffPlan.qualifierIds, s.qualification.qualifierIds);
  });
});

describe('Round 1 and Round 2 scheduling', () => {
  it('labels are stored on the matches; an odd field has one bridge (Round 1 for one player, Round 2 for the other)', () => {
    const { s } = startV3(9, { seed: 1 });
    const bridge = qual(s).find((m) => m.bridge);
    assert.deepEqual([bridge.p1Round, bridge.p2Round], [1, 2]);
    qual(s).filter((m) => !m.bridge).forEach((m) => assert.equal(m.p1Round, m.p2Round));
  });

  it('the suggestion keeps every player\u2019s Round 1 before their Round 2 when it can', () => {
    for (const n of [8, 9, 23]) {
      let { s, op } = startV3(n, { seed: n, tables: 1 });
      let violations = 0;
      for (let i = 0; i < qual(s).length; i += 1) {
        const next = E.suggestNextMatch(s.matches);
        [[next.p1, next.p1Round], [next.p2, next.p2Round]].forEach(([id, round]) => {
          if (round === 2 && qual(s).some((m) => m.status !== 'completed' && m.id !== next.id && ((m.p1 === id && m.p1Round === 1) || (m.p2 === id && m.p2Round === 1)))) violations += 1;
        });
        s = E.startOnTable(s, next.id, 1, op());
        s = E.recordResult(s, next.id, { score1: 4, score2: 3 }, op());
      }
      assert.equal(violations, 0, `${n} entrants`);
    }
  });

  it('the preference is not required: a Round 2 match can be started first', () => {
    const { s, op } = startV3(8, { seed: 2 });
    const r2 = qual(s).find((m) => m.p1Round === 2);
    assert.equal(E.startOnTable(s, r2.id, 1, op()).matches.find((m) => m.id === r2.id).status, 'on-table');
  });
});

describe('saved V3 events', () => {
  it('a JSON round trip mid-playoffs keeps the plan, credits and labels, and finishes the same way', () => {
    const { s: po, op } = toPlayoffsV3(13, { seed: 6 });
    const saved = E.clone(po);
    assert.deepEqual(saved.payoutPlan, po.payoutPlan);
    assert.deepEqual(saved.qualification.v3Credits, po.qualification.v3Credits);
    assert.deepEqual(money(saved).byPlayer, money(po).byPlayer);
    const opA = v3Op(99); const opB = v3Op(99);
    const a = E.completeShowdown(playPlayoffsV3(po, opA), opA());
    const b = E.completeShowdown(playPlayoffsV3(saved, opB), opB());
    assert.deepEqual(E.clone(a).v3Settlement, E.clone(b).v3Settlement);
    assert.ok(op);
  });

  it('a completed event reloaded from JSON reports the same money and keeps its audit history', () => {
    const { s } = runV3(10, { seed: 8 });
    const saved = E.clone(s);
    assert.deepEqual(money(saved).byPlayer, money(s).byPlayer);
    assert.equal(E.reconciliationProblem(saved), '');
    assert.deepEqual(saved.audit, E.clone(s.audit));
    assert.deepEqual(saved.v3Outcome, s.v3Outcome);
  });
});

describe('V1 and V2 are unchanged', () => {
  for (const v of [1, 2]) {
    it(`V${v}: no V3 labels, no V3 fields, dollar money and an exact payout`, () => {
      const { s, op } = startedEvent(12, { seed: 11, payoutVersion: v });
      assert.ok(qual(s).every((m) => m.p1Round === undefined && m.bridge === undefined));
      const done = runToCompletion(s, op);
      assert.equal(done.status, 'completed');
      assert.equal(E.reconciliationProblem(done), '');
      assert.equal(done.v3Outcome, undefined);
      assert.equal(done.v3Settlement, undefined);
      assert.equal(done.qualification.v3Credits, undefined);
      assert.equal(E.computeEarnings(done).paidCents, undefined);
      assert.throws(() => E.interruptShowdown(done, {}, 'RESET', op()), /Only V3/);
    });
  }

  it('V1 and V2 ignore the preview flag and start exactly as before', () => {
    for (const v of [1, 2]) {
      const a = E.startShowdown(E.createShowdown({ payoutVersion: v, players: names(9) }, operator(5)()), { ...operator(5)(), v3Preview: true });
      const b = E.startShowdown(E.createShowdown({ payoutVersion: v, players: names(9) }, operator(5)()), operator(5)());
      assert.notEqual(a.payoutPlan.payoutVersion, 3);
      assert.equal(a.status, 'qualifying');
      assert.deepEqual(E.clone(a), E.clone(b));
    }
  });
});
