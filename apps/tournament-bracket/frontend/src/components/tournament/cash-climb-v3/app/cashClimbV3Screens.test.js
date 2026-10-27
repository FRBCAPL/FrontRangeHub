import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCashClimbV3Record } from './cashClimbV3Record.js';
import { randomPlacement } from './cashClimbV3Draw.js';
import { postCashClimbV3Result, settleCashClimbV3Record, startCashClimbV3Tournament } from './cashClimbV3Play.js';
import { bracketRounds, matchCard, money } from './cashClimbV3View.js';
import { financialSummary, playerEarnings } from './cashClimbV3Earnings.js';
import { OUTCOME_OPTIONS, outcomeExplanation, submissionFrom } from './cashClimbV3Outcomes.js';
import { previewCashClimbV3Result } from './cashClimbV3Play.js';
import { seededRandomInt } from './cashClimbV3AppTestKit.js';
import { render } from './cashClimbV3RenderKit.test-support.mjs';
import { matchOccupants, readyMatchIds } from '../cashClimbV3Progress.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';

const NOW = '2026-10-30T19:00:00.000Z';
function setupRecord(n, seed = 4) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Shooter ${i + 1}` }));
  const r = createCashClimbV3Record({
    name: 'Screen Test', tournamentDate: '2026-10-30', players, entryFeeCents: 2000, addedMoneyCents: 10000, raceTo: 5,
    rules: { game: '8-Ball', notes: '' }, placement: randomPlacement(players.map((p) => p.id), seededRandomInt(seed)), draw: { adjusted: false },
  }, { id: `s${n}`, now: NOW });
  return r.record;
}
const startedRecord = (n) => startCashClimbV3Tournament(setupRecord(n), { now: NOW }).record;
const seated = (rec, id) => matchOccupants(rec.event, id).map((o) => o.id);
const postOk = (rec, id, submitted) => postCashClimbV3Result(rec, id, submitted, { now: NOW }).record;
function finish(rec) {
  let r = rec;
  for (let ready = readyMatchIds(r.event); ready.length; ready = readyMatchIds(r.event)) {
    ready.forEach((id) => { r = postOk(r, id, { outcome: 'completed', winner: seated(r, id)[0], loserRacks: 2 }); });
  }
  return r;
}
const count = (html, re) => (html.match(re) || []).length;

describe('Cash Climb (V3) display data', () => {
  it('shows pending, vacant and resolved positions with the match money', () => {
    let rec = startedRecord(12);
    const p1 = rec.event.matches.P1;
    const card = matchCard(rec, p1.feedsTo.matchId);
    assert.equal(card.positions[p1.feedsTo.slot].name, 'Winner of Preliminary 1');
    assert.equal(card.readiness, 'waiting');
    assert.equal(card.moneyLabel, 'Match reserve');
    assert.deepEqual(bracketRounds(rec.event).map((r) => r.label), ['Preliminary round', 'Opening round', 'Semifinal', 'Championship']);
    rec = postOk(rec, 'P1', { outcome: 'double-forfeit' });
    const after = matchCard(rec, p1.feedsTo.matchId);
    assert.equal(after.status, 'walkover');
    assert.equal(after.positions[p1.feedsTo.slot].kind, 'vacant');
    assert.match(after.resultText, /advances automatically/);
    assert.equal(after.paidCents + after.unawardedCents, after.allocationCents);
  });

  it('reads the financial summary and player earnings straight from the ledger', () => {
    const base = startedRecord(8);
    const [winner] = seated(base, 'O1');
    const valid = postOk(base, 'O1', { outcome: 'completed', winner, loserRacks: 0 });
    const s = ledgerSummary(valid.event.ledger);
    const lines = Object.fromEntries(financialSummary(valid).map((l) => [l.key, l.cents]));
    assert.deepEqual(lines, {
      prize: s.prizePoolCents, opening: s.openingReserveCents, later: s.laterScheduledCents, earned: s.earnedCents,
      unsettled: s.unsettledCents, pending: s.pendingAllocationCents, unawarded: s.unawardedCents,
    });
    const rows = playerEarnings(valid);
    rows.forEach((r) => assert.equal(r.totalCents, s.earnedByPlayer[r.id] || 0));
    rows.forEach((r) => assert.equal(r.byMatch.reduce((a, e) => a + e.cents, 0), r.totalCents));
    const top = rows.find((r) => r.id === winner);
    assert.ok(top.alive && top.next && /a win adds/.test(top.next.possible), 'the possible next payout is labelled separately');
    assert.equal(rows.filter((r) => r.alive).length, 7);
  });

  it('explains every outcome and builds engine submissions from the form', () => {
    const rec = startedRecord(8);
    ['O1', 'L1-1', 'L2-1'].forEach((id) => OUTCOME_OPTIONS.forEach((o) => assert.ok(outcomeExplanation(rec.event.matches[id], o.value).includes('already earned'), `${id} ${o.value}`)));
    const [a, b] = seated(rec, 'O1');
    assert.deepEqual(submissionFrom({ outcome: 'completed', winner: a, loserRacks: '3' }, [a, b]), { outcome: 'completed', winner: a, loserRacks: 3 });
    assert.deepEqual(submissionFrom({ outcome: 'withdrawal', player: b, racks: ['2', '0'] }, [a, b]), { outcome: 'withdrawal', withdrawing: b, racks: { [a]: 2, [b]: 0 } });
    assert.equal(previewCashClimbV3Result(rec, 'O1', submissionFrom({ outcome: 'completed', winner: a, loserRacks: '' }, [a, b])).status, 'invalid', 'a blank score is never read as zero');
    assert.equal(money(4500), '$45');
  });
});

describe('Cash Climb (V3) screens', () => {
  it('shows the complete draw before the start, with Start Tournament and editing', async () => {
    const rec = setupRecord(12);
    const html = await render('./CashClimbV3StartView.jsx', { record: rec, onEdit() {}, onStart() {} });
    rec.players.forEach((p) => assert.ok(html.includes(p.name), p.name));
    assert.match(html, /Not official yet/);
    assert.match(html, /Random draw/);
    assert.match(html, /Start Tournament/);
    assert.match(html, /Edit setup and draw/);
    assert.equal(count(html, /<strong>Preliminary \d+<\/strong>/g), 4);
    assert.equal(count(html, /<strong>Opening \d+<\/strong>/g), 4);
  });

  it('draw editor: one button per player and fixed preliminary-winner positions', async () => {
    const rec = setupRecord(12);
    const html = await render('./CashClimbV3DrawEditor.jsx', { players: rec.players, draw: { placement: rec.placement, adjusted: true, notice: '' }, onSwap() {}, onRedraw() {} });
    assert.equal(count(html, /class="ccv3-seat"/g), 12);
    assert.equal(count(html, /ccv3-seat is-fixed/g), 4);
    assert.match(html, /Random draw, adjusted by hand/);
    assert.match(html, /Redraw/);
  });

  it('live view: ready matches can be entered; a settled tournament is read-only', async () => {
    const rec = startedRecord(8);
    const live = await render('./CashClimbV3LiveView.jsx', { record: rec, onPost() {}, onSettle() {} });
    assert.equal(count(live, />Enter result</g), readyMatchIds(rec.event).length, 'each ready match appears once, in the ready list');
    assert.match(live, /Ready to play \(4\)/);
    const done = settleCashClimbV3Record(finish(rec), { now: NOW }).record;
    const settled = await render('./CashClimbV3LiveView.jsx', { record: done, onPost() {}, onSettle() {} });
    assert.equal(count(settled, /Enter result/g), 0);
    assert.match(settled, /read-only/);
    assert.match(settled, /Final result/);
    assert.match(settled, /Champion: Shooter/);
  });

  it('money view shows earned totals and labels possible payouts as not earned', async () => {
    const rec = postOk(startedRecord(8), 'O1', { outcome: 'completed', winner: seated(startedRecord(8), 'O1')[0], loserRacks: 1 });
    const html = await render('./CashClimbV3Money.jsx', { record: rec });
    assert.match(html, /Total prize pool/);
    assert.match(html, /Unawarded funds/);
    assert.match(html, /Possible next/);
    assert.match(html, /not earned yet/);
  });

  it('result entry offers every submitted outcome', async () => {
    const rec = startedRecord(8);
    const html = await render('./CashClimbV3ResultDialog.jsx', { record: rec, matchId: 'O1', onPost() {}, onClose() {} });
    OUTCOME_OPTIONS.forEach((o) => assert.ok(html.includes(o.label), o.label));
    assert.match(html, /Review result/);
  });
});
