/**
 * D10 settlement through the real engine: randomized events with withdrawals, walkovers, double forfeits and
 * interruptions, checked against an independent ledger rebuilt from the raw match scores.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEscalatingPlan } from './showdownV3Rules.js';
import { v3ChampionFund } from './showdownV3Pay.js';
import { simulate, simulateClean, assertReconciles } from './showdownV3SimKit.js';

const EVENTS = 1500;
const CLEAN_EVENTS = 1000;

/** Each player's earned cents from the scores alone: games × rate, administrative credits, bye credits. */
function independentLedger(ev, e) {
  const plan = ev.plan;
  const out = Object.fromEntries(ev.playerIds.map((id) => [id, { games: 0, cents: 0, bye: 0 }]));
  ev.qualifying.filter((m) => m.status === 'completed').forEach((m) => {
    out[m.p1].cents += (m.score1 || 0) * plan.rates.r1;
    out[m.p2].cents += (m.score2 || 0) * plan.rates.r1;
  });
  e.qualifying.credits.forEach((c) => { out[c.playerId].cents += c.games * plan.rates.r1; });
  (ev.playoffs || []).filter((m) => m.status === 'completed').forEach((m) => {
    const rate = plan.rates.byRound[m.roundKey];
    [[m.p1, m.score1], [m.p2, m.score2]].forEach(([id, s]) => {
      if (!id) return;
      out[id].games += s || 0;
      out[id].cents += (s || 0) * rate;
    });
  });
  (ev.byeIds || []).forEach((id) => { out[id].bye += plan.byeCreditCents; out[id].cents += plan.byeCreditCents; });
  return out;
}

function checkLedger(ev, e, where) {
  const mine = independentLedger(ev, e);
  for (const id of ev.playerIds) {
    const row = e.settlement.rows[id];
    assert.equal(row.earnedCents, mine[id].cents, `${where}: ${id} earned`);
    assert.equal(row.byeCents, mine[id].bye, `${where}: ${id} bye credit`);
    assert.equal(row.playoffMatchWinCents, 0, `${where}: no match-win pay`);
    if (e.playoffs.rows[id]) assert.equal(e.playoffs.rows[id].gameWins, mine[id].games, `${where}: a bye credit is not a game won`);
  }
}

const fundOf = (ev, e) => v3ChampionFund(ev.plan, e.qualifying, ev.playoffs || []);

describe(`D10 randomized events (${EVENTS}): withdrawals, walkovers, double forfeits, interruptions`, () => {
  const runs = Array.from({ length: EVENTS }, (_, i) => simulate(i + 1, 'escalating'));

  it('every event is a D10 plan and reconciles exactly to the pool in 25\u00a2 units', () => {
    assert.ok(runs.every(({ ev }) => isEscalatingPlan(ev.plan)));
    assertReconciles(runs);
  });

  it('every player\u2019s pay matches an independent ledger built from the scores', () => {
    runs.forEach(({ ev, e }, i) => checkLedger(ev, e, `event ${i + 1}`));
  });

  it('completed events: the champion out-earns every other player, by at least the plan\u2019s worst-case margin', () => {
    let checked = 0;
    runs.filter((x) => x.outcome === 'completed').forEach(({ ev, e }, i) => {
      const champ = e.status.championId;
      const rows = e.settlement.rows;
      const best = Math.max(...ev.playerIds.filter((id) => id !== champ).map((id) => rows[id].totalCents));
      assert.ok(rows[champ].totalCents - best >= ev.plan.guarantees.margins.championCents, `event ${i + 1}: ${rows[champ].totalCents} vs ${best}`);
      checked += 1;
    });
    assert.ok(checked > 500, `${checked} completed events`);
  });

  it('the Champion Fund: start + unplayed games; at completion it is exactly what the champion receives on top of earnings', () => {
    runs.forEach(({ ev, e, outcome }, i) => {
      const fund = fundOf(ev, e);
      const where = `event ${i + 1} (${outcome})`;
      assert.equal(fund.startCents, ev.plan.reserves.championFund, where);
      assert.ok(fund.transferredCents >= 0, where);
      if (outcome !== 'completed') return;
      const champ = e.status.championId;
      assert.equal(e.settlement.rows[champ].settlementCents, fund.currentCents, where);
      assert.equal(e.settlement.remainderCents, fund.currentCents, where);
    });
  });

  it('no champion: nothing is kept by the operator; abandoned money is left unawarded, interruptions split among the players still in', () => {
    runs.forEach(({ e, outcome }, i) => {
      const s = e.settlement;
      assert.notEqual(s.retentionApproved, true, `event ${i + 1}`);
      if (outcome === 'abandoned') {
        assert.equal(s.bonusRecipients.length, 0);
        assert.equal(s.unawardedCents, s.remainderCents);
        assert.ok(s.pendingApproval.includes('abandonment-retention'), 'unawarded money waits for review; nobody receives it automatically');
      } else {
        assert.equal(s.proposedOperatorRetainedCents, 0, `event ${i + 1}`);
      }
      if (outcome === 'interrupted' || outcome === 'interrupted-final') {
        assert.ok(s.bonusRecipients.length >= 1);
        assert.ok(s.bonusRecipients.every((id) => e.status.aliveIds.includes(id)));
      }
    });
  });

  it('bye holders keep their credit whether they lose, win, withdraw or become champion', () => {
    const seen = { lost: 0, champion: 0, withdrew: 0 };
    runs.filter((x) => x.ev.byeIds.length).forEach(({ ev, e, withdrawnIds }) => {
      ev.byeIds.forEach((id) => {
        assert.equal(e.settlement.rows[id].byeCents, ev.plan.byeCreditCents);
        if (e.status.championId === id) seen.champion += 1;
        else if (withdrawnIds.includes(id)) seen.withdrew += 1;
        else seen.lost += 1;
      });
    });
    assert.ok(seen.lost > 0 && seen.champion > 0 && seen.withdrew > 0, JSON.stringify(seen));
  });
});

describe(`D10 completed events with every match played (${CLEAN_EVENTS}): finishing order`, () => {
  const runs = Array.from({ length: CLEAN_EVENTS }, (_, i) => simulateClean(i + 1, 'escalating'));

  it('the champion always finishes first; runner-up and semifinal order hold wherever the plan guarantees them', () => {
    const tally = { runnerUp: [0, 0], semifinal: [0, 0] };
    runs.forEach(({ ev, e }, i) => {
      const where = `event ${i + 1} (${ev.plan.entrants}p $${ev.plan.entryFee} G${ev.plan.qualifyingGames} race ${ev.plan.playoffRaceTo})`;
      assert.equal(e.settlement.ok, true, where);
      checkLedger(ev, e, where);
      const total = (id) => e.settlement.rows[id].totalCents;
      const keys = [...new Set(ev.playoffs.map((m) => m.roundKey))];
      const final = ev.playoffs.find((m) => m.roundKey === 'final');
      const semiLosers = ev.playoffs.filter((m) => m.roundKey === 'semifinal').map((m) => m.loserId);
      const qfLosers = ev.playoffs.filter((m) => m.roundKey === 'quarterfinal').map((m) => m.loserId);
      const others = ev.playerIds.filter((id) => id !== final.winnerId);
      assert.ok(others.every((id) => total(final.winnerId) > total(id)), where);
      const ru = semiLosers.every((id) => total(final.loserId) > total(id));
      tally.runnerUp[0] += ru ? 1 : 0; tally.runnerUp[1] += 1;
      if (ev.plan.guarantees.checks.runnerUpOverSemifinalLoser.ok) assert.ok(ru, where);
      if (keys.includes('quarterfinal')) {
        const sf = semiLosers.every((a) => qfLosers.every((b) => total(a) > total(b)));
        tally.semifinal[0] += sf ? 1 : 0; tally.semifinal[1] += 1;
        if (ev.plan.guarantees.checks.semifinalLoserOverQuarterfinalLoser?.ok) assert.ok(sf, where);
      }
    });
    assert.ok(tally.runnerUp[0] / tally.runnerUp[1] > 0.5, JSON.stringify(tally));
  });
});
