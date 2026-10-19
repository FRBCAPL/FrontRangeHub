import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../showdownRenderKit.js';
import { makeOperator } from '../showdownOperatorKit.js';
import * as E from '../../showdownEngine.js';
import { createV3, startV3, toBracketV3, toPlayoffsV3, runV3, startNext, playQualifyingV3, CONFIRM } from '../../v3/showdownV3WorkflowKit.js';
import { V3_NOT_READY_MESSAGE } from '../../v3/showdownV3Format.js';
import { v3PlanPreview, v3PlanView } from './showdownV3PlanView.js';
import { v3LimitsOf, v3ScoreProblem, v3PartialProblem, v3PartialEntry, emptyPartial, V3_VOLUNTARY_MESSAGE } from './showdownV3ScoreDraft.js';
import { queueViewV3 } from './showdownV3BoardView.js';
import { standingsViewV3 } from './showdownV3StandingsView.js';
import { moneyViewV3 } from './showdownV3MoneyView.js';
import { nextStep } from '../showdownOperatorActions.js';

const h = new Proxy({}, { get: () => () => true });
const handlers = { act: () => true, ask: () => true, board: h, lock: h.x, reopenQualifying: h.x, reopenShootout: h.x, confirmBracket: h.x, complete: h.x, withdraw: h.x, reinstate: h.x };
const tab = (state, name, corrections = false) => render('ShowdownTabContent.jsx', { state, tab: name, corrections, h: handlers });
const setup = (state, v3Preview = false) => render('ShowdownSetup.jsx', { state, act: () => true, onStart() {}, onDiscard() {}, onLeave() {}, onChangeFormat() {}, v3Preview });
const qual = (s) => s.matches.filter((m) => m.phase === 'qualifying');
const playoff = (s) => s.matches.filter((m) => m.phase === 'playoff');

function clean(html) {
  assert.ok(!/\\u[0-9a-f]{4}/i.test(html), 'no escaped unicode shown as text');
  assert.ok(!/undefined|NaN|\[object Object\]|Infinity/.test(html), 'no broken values');
  return html;
}

/** Everyone left in an 8-player bracket leaves, confirmed as involuntary: nobody is eligible afterwards. */
function everyoneLeaves(seed) {
  const { s: po, op } = toPlayoffsV3(8, { seed });
  const [semi1, semi2] = playoff(po).filter((m) => m.roundKey === 'semifinal');
  let state = E.withdrawPlayer(po, semi1.p1, op(), { voluntary: false });
  state = E.withdrawPlayer(state, semi1.p2, op(), { voluntary: false });
  const on = E.startOnTable(state, semi2.id, 1, op());
  state = E.recordForfeit(on, semi2.id, [semi2.p1, semi2.p2], op(), { score1: 1, score2: 2, voluntary: false });
  return { state, op };
}

const states = {};
before(() => {
  states.setup12 = createV3(12, { fee: 20, games: 8, raceTo: 5 });
  const started = startV3(12, { games: 8, raceTo: 5, seed: 7 });
  states.op = started.op;
  states.qualifying = started.s;
  [states.onTable, states.tableMatch] = startNext(started.s, started.op, 'qualifying');
  states.tie = E.recordResult(states.onTable, states.tableMatch.id, { score1: 4, score2: 4 }, started.op());
  const [on2, m2] = startNext(states.tie, started.op, 'qualifying');
  states.forfeitMatch = m2;
  states.forfeit = E.recordForfeit(on2, m2.id, [m2.p1], started.op(), { score1: 2, score2: 1 });
  states.bracket13 = (() => { const b = toBracketV3(13, { seed: 25 }); return E.drawPlayoff(b.s, b.op()); })();
  const po = toPlayoffsV3(13, { seed: 25 });
  states.playoffs13 = po.s;
  states.playoffOp = po.op;
  states.completed = runV3(12, { seed: 9 }).s;
  for (let seed = 1; seed <= 300 && !states.shootout; seed += 1) {
    const t = startV3(8, { seed, games: 6 });
    const locked = E.lockQualifying(playQualifyingV3(t.s, t.op, () => [3, 3]), t.op());
    if (locked.status === 'shootout') states.shootout = locked;
  }
});

describe('V3 setup: match lengths and the payout plan preview', () => {
  it('shows games and race controls, every plan term, and keeps the start disabled without the dev preview', async () => {
    const html = clean(await setup(states.setup12));
    for (const t of ['Games per qualifying match', 'Playoff race', '8 games', 'Race to 5', 'Proposed V3 payout plan', 'Entry pool', '$240',
      'Qualifying games', 'Playoff games', 'Match-win bonuses', 'Round 1 game win', 'Round 2 game win', 'Playoff game win', 'Quarterfinal bye',
      'Championship guarantee tier', 'Guaranteed:', V3_NOT_READY_MESSAGE]) {
      assert.ok(html.includes(t), t);
    }
    assert.match(html, /disabled=""[^>]*>Start qualifying/);
    assert.ok(!/Qualifying race|9-Ball|ruleset/i.test(html.replace(/class="[^"]*"/g, '')));
  });

  it('the dev preview enables the start and says it is a local preview', async () => {
    const html = clean(await setup(states.setup12, true));
    assert.doesNotMatch(html, /disabled=""[^>]*>Start qualifying/);
    assert.ok(html.includes('Development preview: V3 starts are enabled on this device only'));
    assert.ok(html.includes('locks the entrants and the entry fee'));
    assert.ok(!html.includes(`<li>${V3_NOT_READY_MESSAGE}</li>`), 'not listed as a start blocker');
  });

  it('invalid configurations show why there is no plan instead of a plan', async () => {
    const few = clean(await setup(createV3(5)));
    assert.ok(few.includes('The payout plan appears once there are'));
    assert.ok(!few.includes('Locked V3 payout plan'));
    const bad = E.updateSettings(states.setup12, { entryFee: 0 }, states.op());
    assert.ok(v3PlanPreview(bad).problems.length > 0);
    assert.equal(v3PlanPreview(bad).view, null);
  });

  it('the operator start is refused without the dev preview; with it, the locked plan is exactly the preview', () => {
    const o = makeOperator(5);
    assert.equal(o.tryTap(states.setup12, 'start').error, V3_NOT_READY_MESSAGE);
    const preview = v3PlanPreview(states.setup12).view;
    const started = o.tap(states.setup12, 'start', { v3Preview: true });
    assert.deepEqual(v3PlanView(started.payoutPlan), preview);
    assert.ok(o.tryTap(started, 'updateSettings', { entryFee: 30 }).error, 'financial terms cannot change after the start');
  });

  it('after the start the money tab shows the plan as locked', async () => {
    const html = clean(await tab(states.qualifying, 'money'));
    for (const t of ['Locked V3 payout plan', 'cannot be edited', 'Payout reconciliation', 'Still to be won']) assert.ok(html.includes(t), t);
    assert.ok(!html.includes('Proposed V3 payout plan'));
  });
});

describe('V3 qualifying screens', () => {
  it('match cards show the round, fixed game count and pay; no race wording', async () => {
    const html = clean(await tab(states.onTable, 'run'));
    for (const t of ['Round 1', '8 games, all played (ties allowed)', 'per game won', 'Qualifying matches']) assert.ok(html.includes(t), t);
    assert.ok(!/Race to \d/.test(html), 'qualifying is never a race');
  });

  it('a completed tie is accepted and shown as a tie', async () => {
    const limits = v3LimitsOf(states.qualifying, 'qualifying');
    assert.equal(v3ScoreProblem(limits, 4, 4), '');
    assert.ok(v3ScoreProblem(limits, 4, 3), 'the games must add up');
    const done = queueViewV3(states.tie, 'qualifying').done.find((m) => m.id === states.tableMatch.id);
    assert.equal(done.resultText, '4\u20134 tie');
    const paid = standingsViewV3(states.tie).rows.filter((r) => r.actualWins === 4);
    assert.equal(paid.length, 2, 'both players are credited with the 4 games they won');
    clean(await tab(states.tie, 'standings'));
  });

  it('the score modal: fixed games with ties in qualifying, a race in the playoffs, forfeits behind a second step', async () => {
    const m = queueViewV3(states.onTable, 'qualifying').onTable[0];
    const q = clean(await render('v3/ShowdownV3ScoreModal.jsx', { match: m, limits: v3LimitsOf(states.onTable, 'qualifying'), onSave() {}, onForfeit() {}, onCancel() {} }));
    for (const t of ['8 games, all played', 'A tie is allowed', 'Forfeit or no-show', 'administrative credit']) assert.ok(q.includes(t), t);
    assert.match(q, /disabled=""[^>]*>Save result/);
    const pm = queueViewV3(states.playoffs13, 'playoff').ready[0];
    const p = clean(await render('v3/ShowdownV3ScoreModal.jsx', { match: pm, limits: v3LimitsOf(states.playoffs13, 'playoff'), onSave() {}, onForfeit() {}, onCancel() {} }));
    for (const t of ['Race to 5', 'walkover', 'match-win bonus']) assert.ok(p.includes(t), t);
    const limits = v3LimitsOf(states.playoffs13, 'playoff');
    assert.ok(v3ScoreProblem(limits, 5, 5));
    assert.equal(v3ScoreProblem(limits, 5, 3), '');
  });
});

describe('V3 partial forfeits and withdrawals', () => {
  it('a partial score is never assumed: blank is refused, games played or an explicit no-games confirmation is required', () => {
    const q = v3LimitsOf(states.qualifying, 'qualifying');
    assert.match(v3PartialProblem(q, emptyPartial()), /Enter the games already played/);
    assert.match(v3PartialProblem(q, { ...emptyPartial(), score1: 2 }), /Enter the games already played/);
    assert.equal(v3PartialProblem(q, { ...emptyPartial(), noGamesPlayed: true }), '');
    assert.ok(v3PartialProblem(q, { ...emptyPartial(), noGamesPlayed: true, score1: 1, score2: 0 }));
    assert.equal(v3PartialProblem(q, { ...emptyPartial(), score1: 2, score2: 1 }), '');
    assert.ok(v3PartialProblem(q, { ...emptyPartial(), score1: 8, score2: 0 }), 'a finished match is not a partial score');
    assert.deepEqual(v3PartialEntry({ ...emptyPartial(), noGamesPlayed: true }), { noGamesPlayed: true });
  });

  it('playoff forfeits require the voluntary/involuntary choice', () => {
    const p = v3LimitsOf(states.playoffs13, 'playoff');
    const draft = { ...emptyPartial(), score1: 1, score2: 2 };
    assert.equal(v3PartialProblem(p, draft, { needVoluntary: true }), V3_VOLUNTARY_MESSAGE);
    assert.equal(v3PartialProblem(p, { ...draft, voluntary: false }, { needVoluntary: true }), '');
    assert.deepEqual(v3PartialEntry({ ...draft, voluntary: true }), { score1: 1, score2: 2, voluntary: true });
  });

  it('the forfeit through the operator action keeps the games played and gives the opponent a provisional credit', async () => {
    const o = makeOperator(8);
    const out = o.tryTap(states.tie, 'forfeit', states.forfeitMatch.id, [states.forfeitMatch.p1]);
    assert.match(out.error, /Enter the games already played/, 'no silent 0–0');
    const v = standingsViewV3(states.forfeit);
    assert.ok(v.hasCredits);
    const html = clean(await tab(states.forfeit, 'standings'));
    for (const t of ['Qualifying $', 'Games won', 'Credit games', 'Game pay', 'Credit pay', 'provisional']) assert.ok(html.includes(t), t);
    const done = queueViewV3(states.forfeit, 'qualifying').done.find((m) => m.id === states.forfeitMatch.id);
    assert.match(done.resultText, /after 2\u20131 \(games played are kept/);
  });

  it('the withdrawal modal asks for the games of a match on a table, and in the playoffs whether it was voluntary', async () => {
    const p = states.onTable.players.find((x) => x.id === states.tableMatch.p1);
    const q = clean(await render('v3/ShowdownV3WithdrawModal.jsx', { state: states.onTable, player: p, onConfirm() {}, onCancel() {} }));
    for (const t of ['games already played', 'I confirm no games were played in this match.', 'administrative credit']) assert.ok(q.includes(t), t);
    assert.ok(!q.includes('3–0') && !q.includes('Why is'));
    assert.match(q, /disabled=""[^>]*>Withdraw player/);
    const pp = states.playoffs13.players.find((x) => x.id === playoff(states.playoffs13).find((m) => m.p1 && m.p2).p1);
    const po = clean(await render('v3/ShowdownV3WithdrawModal.jsx', { state: states.playoffs13, player: pp, onConfirm() {}, onCancel() {} }));
    for (const t of ['Why is', 'By choice (voluntary)', 'involuntary', 'walkover']) assert.ok(po.includes(t), t);
    assert.match(po, /disabled=""[^>]*>Withdraw player/);
  });
});

describe('V3 shootouts, bracket, byes and walkovers', () => {
  it('a qualifying shootout uses the existing shootout screen', async () => {
    assert.ok(states.shootout, 'a seed produced a cutoff shootout');
    const html = clean(await tab(states.shootout, 'run'));
    assert.match(html, /shootout/i);
    assert.ok(html.includes('Qualifying $'));
  });

  it('the bracket shows byes, the race, game pay and winner\'s bonuses in cents', async () => {
    const html = clean(await tab(states.bracket13, 'bracket'));
    for (const t of ['Quarterfinal byes (3)', 'race to 5', 'Each game won pays', 'winner&#x27;s bonus', 'Confirm bracket', 'Straight to Semifinal']) assert.ok(html.includes(t), t);
    assert.ok(!html.includes('per win'), 'no V1/V2 wording');
    const board = clean(await tab(states.playoffs13, 'run'));
    for (const t of ['Playoff matches', 'Race to 5', 'per game won', 'winner&#x27;s bonus']) assert.ok(board.includes(t), t);
  });

  it('a playoff withdrawal shows as a walkover', async () => {
    const m = playoff(states.playoffs13).find((x) => x.p1 && x.p2);
    const gone = E.withdrawPlayer(states.playoffs13, m.p1, states.playoffOp(), { voluntary: false });
    const html = clean(await tab(gone, 'bracket'));
    assert.ok(html.includes('Walkover'));
  });
});

describe('V3 money, results and endings', () => {
  it('a completed event reconciles to the cent and shows the locked plan', async () => {
    const html = clean(await tab(states.completed, 'money'));
    for (const t of ['Payout reconciliation', 'Reconciled', 'Locked V3 payout plan', 'Bonus / split']) assert.ok(html.includes(t), t);
    const results = clean(await tab(states.completed, 'results'));
    assert.ok(results.includes('Final results'));
    assert.match(nextStep(states.completed), /Every cent/);
  });

  it('the settle tab: interruption form while running, abandonment only in the playoffs and only when allowed', async () => {
    const q = clean(await tab(states.onTable, 'settle'));
    for (const t of ['Interrupt the event', 'Type RESET', 'still eligible immediately before the interruption', 'games already played']) assert.ok(q.includes(t), t);
    assert.ok(!q.includes('Voluntary abandonment'));
    const p = clean(await tab(states.playoffs13, 'settle'));
    assert.ok(p.includes('Voluntary abandonment') && p.includes('Players are still in the playoffs'));
    assert.match(p, /disabled=""[^>]*>Record voluntary abandonment/);
    assert.ok(p.includes('not approved'));
  });

  it('nobody eligible: the preview requires acknowledging unresolved money; after settling, review and adjustments are shown', async () => {
    const { state, op } = everyoneLeaves(38);
    const form = clean(await render('v3/ShowdownV3InterruptForm.jsx', { state, onInterrupt() {} }));
    for (const t of ['Nobody is still eligible', 'left unresolved for operator review', 'I understand']) assert.ok(form.includes(t), t);
    assert.match(form, /disabled=""[^>]*>Interrupt and settle/);
    const o = makeOperator(9);
    assert.match(o.tryTap(state, 'interrupt', {}, CONFIRM).error, /left unresolved for your review/);
    const end = o.tap(state, 'interrupt', { acknowledgeUnresolved: true }, CONFIRM);
    const v = moneyViewV3(end);
    assert.ok(v.unresolvedCents > 0 && v.reconciled);
    assert.match(nextStep(end), /unresolved and needs your review/);
    const settle = clean(await tab(end, 'settle'));
    for (const t of ['Unresolved', 'not assigned to anyone automatically', 'Payout adjustments', 'Available for adjustments']) assert.ok(settle.includes(t), t);
    assert.ok(!settle.includes('Interrupt the event'));
    const adjusted = o.tap(end, 'adjustPayout', { playerId: end.players[0].id, amountCents: 500, reason: 'Venue closure refund' });
    assert.equal(moneyViewV3(adjusted).unresolvedCents, v.unresolvedCents - 500);
    const log = clean(await tab(adjusted, 'log'));
    for (const t of ['Event interrupted and settled', 'unresolved for review', 'Payout adjustment', '$5 from the remainder: Venue closure refund', 'involuntary']) assert.ok(log.includes(t), t);
    void op;
  });

  it('an interruption during qualifying settles among the eligible entrants', () => {
    const o = makeOperator(10);
    const m = qual(states.onTable).find((x) => x.status === 'on-table');
    assert.match(o.tryTap(states.onTable, 'interrupt', {}, CONFIRM).error, /Enter the games already played/);
    const end = o.tap(states.onTable, 'interrupt', { scores: { [m.id]: { score1: 2, score2: 3 } } }, CONFIRM);
    const v = moneyViewV3(end);
    assert.equal(v.outcome, 'interrupted');
    assert.ok(v.reconciled && !v.unresolvedCents && v.recipients.length === 12);
  });
});
