import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../showdownEngine.js';
import { startV3, toPlayoffsV3, runV3, startNext, CONFIRM } from '../../v3/showdownV3WorkflowKit.js';
import { makeOperator, setUpEvent, workBoard } from '../../operator/showdownOperatorKit.js';
import { publicShowdown } from '../../cloud/showdownPublicState.js';
import { screenPublicEvent, UNSUPPORTED_PUBLIC_MESSAGE } from '../useShowdownPublicEvent.js';
import { moneyViewV3 } from '../../operator/v3/showdownV3MoneyView.js';
import { standingsViewV3 } from '../../operator/v3/showdownV3StandingsView.js';
import { render } from '../../operator/showdownRenderKit.js';
import { V3_ESCALATING_FORMULA as D10 } from '../../v3/showdownV3Rules.js';
import { buildV3LegacyPlan } from '../../v3/showdownV3PlanLegacy.js';
import { buildV3EqualRatePlan } from '../../v3/showdownV3Plan.js';
import { V3_PLAN_MISSING_MESSAGE, v3PublicProblem, v3PublicFacts, v3PublicSchedule, v3PayoutRules, v3PublicSettlement } from './showdownV3PublicView.js';

const V1V2_WORDS = /Qualifying win pays|Climb|ladder rung|V1|V2|race to \d+ in qualifying/i;
const clean = (html) => {
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html.replace(/<!-- -->/g, '');
};
const tab = async (t, event, extra = {}) => clean(await render('../public/v3/ShowdownV3PublicTabs.jsx', { tab: t, event, pendingIds: [], mine: [], canReport: false, onReport() {}, ...extra }));

const ev = {};
before(() => {
  const st = startV3(8, { games: 6, seed: 2, formula: D10 });
  let [s, m] = startNext(st.s, st.op, 'qualifying');
  ev.started = publicShowdown(s);
  s = E.recordResult(s, m.id, { score1: 3, score2: 3 }, st.op());
  ev.tie = publicShowdown(s);
  ev.tieMatchId = m.id;
  ev.creditsState = E.withdrawPlayer(s, s.players[3].id, st.op());
  ev.credits = publicShowdown(ev.creditsState);
  const p = toPlayoffsV3(12, { seed: 3, games: 6, formula: D10 });
  ev.playoffs = publicShowdown(p.s);
  const qf = p.s.matches.find((x) => x.phase === 'playoff' && x.roundKey === 'quarterfinal');
  ev.walkover = publicShowdown(E.withdrawPlayer(p.s, qf.p1, p.op()));
  ev.walkoverQf = qf;
  ev.doneState = runV3(8, { seed: 4, formula: D10 }).s;
  ev.done = publicShowdown(ev.doneState);
  const i = toPlayoffsV3(8, { seed: 4, formula: D10 });
  ev.interrupted = publicShowdown(E.interruptShowdown(i.s, { acknowledgeUnresolved: true }, CONFIRM, i.op()));
});

describe('V3 public routing', () => {
  it('a valid V3 copy reaches the V3 screens; a missing plan or unknown version never falls back', () => {
    assert.equal(screenPublicEvent(ev.tie).event, ev.tie);
    const { payoutPlan, ...noPlan } = ev.tie;
    assert.ok(payoutPlan);
    assert.equal(screenPublicEvent(noPlan).error, V3_PLAN_MISSING_MESSAGE);
    assert.equal(screenPublicEvent({ ...ev.tie, payoutPlan: { ...payoutPlan, qualifyingGames: 0 } }).error, V3_PLAN_MISSING_MESSAGE);
    assert.equal(screenPublicEvent({ ...ev.tie, payoutPlan: { ...payoutPlan, rates: null } }).error, V3_PLAN_MISSING_MESSAGE);
    assert.equal(screenPublicEvent({ ...ev.tie, payoutVersion: 4 }).error, UNSUPPORTED_PUBLIC_MESSAGE);
    assert.equal(v3PublicProblem(ev.tie), '');
  });

  it('V1 and V2 copies still pass through unchanged', () => {
    for (const v of [1, 2]) {
      const o = makeOperator(v);
      const pub = publicShowdown(workBoard(o, setUpEvent(o, 8, { payoutVersion: v }), 'qualifying', () => [3, 1]));
      assert.equal(screenPublicEvent(pub).event, pub, `v${v}`);
    }
  });

  it('public views equal the operator views (nothing needed is scrubbed)', () => {
    for (const k of ['tie', 'credits', 'playoffs', 'done', 'interrupted']) {
      assert.ok(moneyViewV3(ev[k]).reconciled, `${k} reconciles from the public copy`);
    }
    const row = (r) => [r.playerId, r.total, r.actualWins, r.creditWins, r.status];
    assert.deepEqual(standingsViewV3(ev.credits).rows.map(row), standingsViewV3(ev.creditsState).rows.map(row));
    assert.equal(moneyViewV3(ev.done).paid, moneyViewV3(ev.doneState).paid);
  });
});

describe('V3 player screens', () => {
  it('header facts: entry fee, entrants, fixed games and race', () => {
    assert.deepEqual(v3PublicFacts(ev.tie), ['Showdown V3', 'Entry $20', '8 entrants', 'Qualifying: 6 games per match', 'Playoffs: race to 5']);
  });

  it('schedule: R1/R2 groups, opponents, game counts, ties and pending matches', () => {
    const groups = v3PublicSchedule(ev.tie);
    assert.ok(groups.some((g) => g.title === 'Round 1') && groups.some((g) => g.title === 'Round 2'));
    const all = groups.flatMap((g) => g.matches);
    const tie = all.find((m) => m.id === ev.tieMatchId);
    assert.equal(tie.tie, true);
    assert.match(tie.stateText, /3\u20133 tie/);
    assert.ok(all.every((m) => m.gamesText === '6 games'));
    assert.ok(all.some((m) => !m.done && m.stateText === 'Ready to start'));
  });

  it('standings rank by dollars and separate games won from credits', async () => {
    const html = await tab('standings', ev.credits);
    for (const t of ['Qualifying $', 'Credits', 'Round 1', 'Round 2', '3\u20133 tie']) assert.ok(html.includes(t), t);
    assert.ok(!V1V2_WORDS.test(html), 'no V1/V2 wording');
    const rows = standingsViewV3(ev.credits).rows;
    const credited = rows.find((r) => r.creditWins > 0);
    assert.ok(credited && credited.actualWins === 0, 'credits are not games won');
  });

  it('now tab: on-table match, the fixed game count, phone report button and operator-only note', async () => {
    const onTable = ev.started.matches.find((m) => m.status === 'on-table');
    const me = ev.started.players.find((p) => p.id === onTable.p2);
    const html = await tab('now', ev.started, { canReport: true, me });
    assert.ok(html.includes(`Reporting as <strong>${me.name}</strong>`));
    assert.ok(!(await tab('now', ev.started, { canReport: true })).includes('>Report score<'), 'no name picked: no report button');
    for (const t of ['On the tables', 'Every qualifying match is 6 games, all played. A tie is possible.', 'Report score', 'Forfeits, withdrawals and payout adjustments are entered by the director.']) assert.ok(html.includes(t), t);
    assert.ok(!html.includes('Up next'), 'up next has its own tab');
    const next = await tab('next', ev.started, { me });
    assert.ok(next.includes('Up next') && next.includes('6 games, all played'));
    const viewOnly = await tab('now', ev.started);
    assert.ok(!viewOnly.includes('Report score'));
  });

  it('bracket: race length, byes and walkovers', async () => {
    const html = await tab('bracket', ev.playoffs);
    for (const t of ['race to 5', 'Bye']) assert.ok(html.toLowerCase().includes(t.toLowerCase()), t);
    const w = ev.walkover.matches.find((m) => m.id === ev.walkoverQf.id);
    assert.equal(w.status, 'completed');
    assert.equal(w.winnerId, ev.walkoverQf.p2);
    assert.ok(moneyViewV3(ev.walkover).reconciled);
    const wHtml = await tab('bracket', ev.walkover);
    assert.ok(wHtml.includes('Walkover'), wHtml.slice(0, 3000));
  });

  it('money: locked plan rules in plain language, game pay, bonuses and totals', async () => {
    const rules = v3PayoutRules(ev.tie.payoutPlan);
    assert.equal(rules.length, 7);
    assert.equal(rules[0], 'Every game won earns money. Game values increase as the tournament progresses. Players receiving an opening-round bye earn a bye credit. Unused game money grows the Champion Fund, which is awarded to the tournament champion.');
    assert.match(rules[1], /Every qualifying game you win pays \$1\.75.*6 games/);
    assert.match(rules[3], /races to 5\. Each game won pays more every round: \$2 in the semifinal, \$2\.25 in the championship\. There are no match-win bonuses\./);
    assert.match(rules[5], /Champion Fund starts at \$19\.75.*champion receives the whole fund/);
    assert.match(rules[6], /champion always earns more than every other player, even with forfeits, walkovers or withdrawals/);
    assert.ok(!rules.some((l) => /runner-up/.test(l)), 'the runner-up order is not promised');
    const equal = v3PayoutRules(buildV3EqualRatePlan({ entrants: 8, entryFee: 20, qualifyingGames: 6, playoffRaceTo: 5 }));
    assert.equal(equal[0], 'Every game you win pays $0.75, in qualifying and in the playoffs.');
    assert.match(equal[5], /goes to the champion as the playoff reserve remainder/);
    const legacy = v3PayoutRules(buildV3LegacyPlan({ entrants: 8, entryFee: 20, qualifyingGames: 6, playoffRaceTo: 5 }));
    assert.equal(legacy.length, 6);
    assert.match(legacy[0], /Round 1 qualifying game pays \$0\.50 and a Round 2 game pays \$1\.50/);
    assert.ok(!legacy.some((l) => /reserve/i.test(l)));
    const html = await tab('money', ev.done);
    for (const t of ['How the money works', 'Every cent of the $160 pool', 'Starting Champion Fund', 'Final Champion Fund', 'Champion Fund / split', 'Bye credit', 'Neither are bye credits']) assert.ok(html.includes(t), t);
    assert.ok(!html.includes('Match-win bonuses'));
    assert.ok(!/reserve|retain|operator keeps|house/i.test(html.replace(/playoff reserve remainder/gi, '')), 'no internal or retention wording beyond the approved remainder label');
    assert.ok(!V1V2_WORDS.test(html));
  });

  it('results and settlement: completed, interrupted and under review', async () => {
    const done = v3PublicSettlement(ev.done);
    assert.equal(done.status, 'Completed');
    assert.match(done.lines[0], /Every cent of the \$160 pool was paid to players\. The \$[\d.]+ Champion Fund/);
    assert.equal(done.championFund.final, true);
    const html = await tab('results', ev.done);
    assert.ok(html.includes('Champion'));
    const intr = v3PublicSettlement(ev.interrupted);
    assert.equal(intr.status, 'Interrupted');
    assert.match(intr.lines[0], /ended early\. Players keep everything they earned/);
    const broken = { ...ev.done, v3Adjustments: [{ id: 'a1', playerId: ev.done.players[0].id, amountCents: 999999, at: '', by: 'director', reason: 'x' }] };
    const review = v3PublicSettlement(broken);
    assert.deepEqual(review.lines, ['The director is reviewing the payouts.'], 'problems are never itemized publicly');
  });
});
