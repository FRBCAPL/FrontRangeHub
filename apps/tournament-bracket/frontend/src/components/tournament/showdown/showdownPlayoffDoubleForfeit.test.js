import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { toPlayoffs, playOpen } from './showdownTestKit.js';

const match = (s, id) => s.matches.find((m) => m.id === id);
const df = (s, op, id) => { const m = match(s, id); return E.recordForfeit(s, id, [m.p1, m.p2], op()); };
const win = (s, op, id) => E.recordResult(s, id, { score1: 5, score2: 2 }, op());
const playRest = (s, op) => playOpen(s, op, 'playoff', () => [5, 3]);
const earn = (s) => E.computeEarnings(s);

function assertNoInventedResult(m) {
  assert.equal(m.score1, null);
  assert.equal(m.score2, null);
  assert.equal(m.loserId, null);
}

describe('playoff double forfeits', () => {
  it('quarterfinal: nobody advances, the waiting semifinal player advances by administrative bye, both payouts move to the championship', () => {
    const { s, op } = toPlayoffs(18, { seed: 2 });
    let state = df(s, op, 'qf1');
    const r = match(state, 'qf1');
    assert.equal(r.result, 'double-forfeit');
    assert.equal(r.winnerId, null);
    assert.deepEqual(r.forfeitedBy.sort(), [match(s, 'qf1').p1, match(s, 'qf1').p2].sort());
    assert.equal(match(state, 'sf1').empty1, true);
    assert.equal(match(state, 'sf1').status, 'waiting', 'waits until the other position is known');

    state = win(state, op, 'qf2');
    const sf = match(state, 'sf1');
    const survivor = match(state, 'qf2').winnerId;
    assert.equal(sf.result, 'admin-bye');
    assert.equal(sf.winnerId, survivor);
    assert.equal(sf.auto, 'empty-position');
    assertNoInventedResult(sf);
    assert.equal(match(state, 'f1').p1, survivor);
    const auto = state.audit.filter((a) => a.action === 'auto-result');
    assert.deepEqual(auto.map((a) => [a.detail.matchId, a.detail.result]), [['sf1', 'admin-bye']]);
    assert.ok(state.audit.some((a) => a.action === 'forfeit' && a.affected[0] === 'qf1'));

    const e = earn(state);
    const plan = state.playoffPlan;
    assert.equal(e.byPlayer[survivor].playoff, plan.perRound.quarterfinal, 'the bye is not a match win and pays nothing');
    assert.equal(e.championship, plan.perRound.final + plan.perRound.quarterfinal + plan.perRound.semifinal);
    assert.deepEqual(e.transfers.playoff.map((t) => t.result).sort(), ['admin-bye', 'double-forfeit']);

    const done = E.completeShowdown(playRest(state, op), op());
    assert.equal(earn(done).paid, 18 * 20);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('7-player bracket: the bye holder facing an empty position advances by administrative bye and keeps only the original bye payout', () => {
    const { s, op } = toPlayoffs(16, { seed: 3 });
    const byeHolder = s.playoff.byes.find((b) => b.section === 1).playerId;
    assert.equal(match(s, 'sf1').p1, byeHolder);
    const state = df(s, op, 'qf1');
    const sf = match(state, 'sf1');
    assert.equal(sf.result, 'admin-bye');
    assert.equal(sf.winnerId, byeHolder);
    assert.equal(match(state, 'f1').p1, byeHolder);
    const e = earn(state);
    const p = state.playoffPlan;
    assert.equal(e.byPlayer[byeHolder].bye, p.bye, 'original bye kept');
    assert.equal(e.byPlayer[byeHolder].playoff, 0, 'administrative bye is not paid');
    assert.equal(e.championship, p.perRound.final + p.perRound.quarterfinal + p.perRound.semifinal);
    const done = E.completeShowdown(playRest(state, op), op());
    assert.equal(earn(done).paid, 16 * 20);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('6-player bracket: both quarterfinals double-forfeit, both bye holders advance administratively', () => {
    const { s, op } = toPlayoffs(14, { seed: 5 });
    let state = df(df(s, op, 'qf1'), op, 'qf2');
    assert.equal(match(state, 'sf1').result, 'admin-bye');
    assert.equal(match(state, 'sf2').result, 'admin-bye');
    s.playoff.byes.forEach((b) => assert.ok([match(state, 'f1').p1, match(state, 'f1').p2].includes(b.playerId)));
    state = win(state, op, 'f1');
    const done = E.completeShowdown(state, op());
    const e = earn(done);
    const p = done.playoffPlan;
    assert.equal(e.championship, p.perRound.final + 2 * p.perRound.quarterfinal + 2 * p.perRound.semifinal);
    assert.equal(e.paid, 14 * 20);
    assert.equal(e.transfers.playoff.length, 4);
    done.playoff.byes.forEach((b) => assert.equal(e.byPlayer[b.playerId].bye, p.bye));
  });

  it('an entire branch empties: the sole eligible finalist is Champion by Walkover with every transfer counted once', () => {
    const { s, op } = toPlayoffs(18, { seed: 6 });
    let state = df(df(s, op, 'qf1'), op, 'qf2');
    const sf = match(state, 'sf1');
    assert.equal(sf.result, 'empty');
    assert.equal(sf.winnerId, null);
    assertNoInventedResult(sf);
    state = win(win(state, op, 'qf3'), op, 'qf4');
    assert.equal(match(state, 'f1').status, 'waiting', 'waits until the other finalist is known');
    assert.equal(E.championshipStatus(state).status, 'pending');
    state = win(state, op, 'sf2');
    const f = match(state, 'f1');
    const champ = match(state, 'sf2').winnerId;
    assert.equal(f.result, 'champion-walkover');
    assert.equal(f.winnerId, champ);
    assert.equal(f.auto, 'empty-position');
    assertNoInventedResult(f);
    assert.deepEqual(E.championshipStatus(state), { status: 'decided', championId: champ, reason: '' });
    assert.ok(state.audit.some((a) => a.action === 'auto-result' && a.detail.matchId === 'f1' && a.detail.result === 'champion-walkover'));

    const p = state.playoffPlan;
    const e = earn(state);
    assert.equal(e.championship, p.perRound.final + 2 * p.perRound.quarterfinal + p.perRound.semifinal, 'qf1, qf2 and the empty semifinal each move once');
    assert.deepEqual(e.transfers.playoff.map((t) => t.matchId).sort(), ['qf1', 'qf2', 'sf1']);
    assert.equal(e.byPlayer[champ].playoff, p.perRound.quarterfinal + p.perRound.semifinal + e.championship);
    assert.equal(e.byPlayer[champ].matchWins - earn(s).byPlayer[champ].matchWins, 2, 'the walkover is not a played win');

    const done = E.completeShowdown(state, op());
    assert.equal(done.championId, champ);
    assert.equal(earn(done).paid, 18 * 20);
    assert.equal(E.reconciliationProblem(done), '');
    const rows = E.finalStandings(done);
    assert.equal(rows[0].stage, 'Champion by Walkover');
    assert.ok(!rows.some((r) => r.stage === 'Runner-up'), 'nobody is invented as runner-up');
  });

  it('semifinal double forfeit: the other semifinal winner is Champion by Walkover', () => {
    const { s, op } = toPlayoffs(18, { seed: 7 });
    let state = ['qf1', 'qf2', 'qf3', 'qf4'].reduce((t, id) => win(t, op, id), s);
    state = df(win(state, op, 'sf2'), op, 'sf1');
    const champ = match(state, 'sf2').winnerId;
    assert.equal(match(state, 'f1').result, 'champion-walkover');
    const e = earn(state);
    assert.equal(e.championship, state.playoffPlan.perRound.final + state.playoffPlan.perRound.semifinal);
    const done = E.completeShowdown(state, op());
    assert.equal(done.championId, champ);
    assert.equal(earn(done).paid, 18 * 20);
  });

  it('no finalist at all: both semifinals double-forfeit, the championship stays unresolved and nothing is paid for it', () => {
    const { s, op } = toPlayoffs(18, { seed: 15 });
    let state = ['qf1', 'qf2', 'qf3', 'qf4'].reduce((t, id) => win(t, op, id), s);
    state = df(df(state, op, 'sf1'), op, 'sf2');
    const f = match(state, 'f1');
    assert.equal(f.status, 'waiting');
    assert.ok(f.empty1 && f.empty2);
    assert.equal(E.championshipStatus(state).status, 'unresolved');
    assert.match(E.championshipStatus(state).reason, /No player can reach the championship/);
    assert.throws(() => E.completeShowdown(state, op()), /Championship unresolved/);
    assert.equal(earn(state).paid, 18 * 20 - earn(state).championship);
  });

  it('the only finalist has withdrawn and the other position empties: no eligible finalist, unresolved', () => {
    const { s, op } = toPlayoffs(18, { seed: 16 });
    let state = win(win(win(s, op, 'qf3'), op, 'qf4'), op, 'sf2');
    const finalist = match(state, 'sf2').winnerId;
    state = E.withdrawPlayer(state, finalist, op());
    assert.equal(match(state, 'f1').status, 'waiting', 'opponent not known yet, nothing to decide');
    state = df(df(state, op, 'qf1'), op, 'qf2');
    assert.equal(match(state, 'sf1').result, 'empty');
    assert.equal(match(state, 'f1').status, 'waiting', 'a withdrawn player is never crowned');
    assert.equal(E.championshipStatus(state).status, 'unresolved');
    assert.match(E.championshipStatus(state).reason, /No eligible finalist/);
    assert.throws(() => E.completeShowdown(state, op()), /Championship unresolved/);
  });

  it('a correction reverses a Champion by Walkover; the walkover itself cannot be undone directly', () => {
    const { s, op } = toPlayoffs(18, { seed: 17 });
    let state = df(df(s, op, 'qf1'), op, 'qf2');
    state = win(win(win(state, op, 'qf3'), op, 'qf4'), op, 'sf2');
    assert.equal(match(state, 'f1').result, 'champion-walkover');
    assert.throws(() => E.undoPlayoffFrom(state, 'f1', 'RESET', op()), /automatic/);
    state = E.recordResult(state, 'qf1', { score1: 5, score2: 2 }, op());
    assert.equal(match(state, 'sf1').result, 'admin-bye', 'qf2 is still a double forfeit');
    assert.equal(match(state, 'f1').status, 'waiting');
    assert.equal(match(state, 'f1').p1, match(state, 'qf1').winnerId);
    assert.equal(E.championshipStatus(state).status, 'pending');
    assert.equal(earn(state).championship, state.playoffPlan.perRound.final + state.playoffPlan.perRound.quarterfinal + state.playoffPlan.perRound.semifinal);

    const completed = E.completeShowdown(playRest(E.recordResult(state, 'qf2', { score1: 5, score2: 1 }, op()), op), op());
    assert.equal(earn(completed).championship, completed.playoffPlan.perRound.final);
    assert.equal(earn(completed).paid, 18 * 20);
  });

  it('a completed event won by walkover reopens through Undo from here on the earlier match', () => {
    const { s, op } = toPlayoffs(8, { seed: 18 });
    let state = win(df(s, op, 'sf1'), op, 'sf2');
    state = E.completeShowdown(state, op());
    assert.equal(state.status, 'completed');
    assert.throws(() => E.undoPlayoffFrom(state, 'sf1', 'nope', op()), /RESET/);
    state = E.undoPlayoffFrom(state, 'sf1', 'reset', op());
    assert.equal(state.status, 'playoffs');
    assert.equal(state.championId, null);
    assert.equal(match(state, 'f1').status, 'waiting');
    assert.equal(earn(state).championship, state.playoffPlan.perRound.final);
  });

  it('5-player bracket: original byes keep their half-value payout and the walkover champion collects every transfer once', () => {
    const { s, op } = toPlayoffs(12, { seed: 19 });
    const p = s.playoffPlan;
    assert.equal(s.playoff.byes.length, 3);
    let state = df(s, op, 'qf1');
    assert.equal(match(state, 'sf1').result, 'admin-bye');
    state = df(state, op, 'sf2');
    assert.equal(match(state, 'f1').result, 'champion-walkover');
    const champ = match(state, 'sf1').winnerId;
    const e = earn(state);
    assert.equal(e.championship, p.perRound.final + p.perRound.quarterfinal + 2 * p.perRound.semifinal);
    assert.equal(e.transfers.playoff.length, 3);
    assert.equal(e.byPlayer[champ].playoff, e.championship, 'administrative advances are not paid, the championship is');
    state.playoff.byes.forEach((b) => assert.equal(e.byPlayer[b.playerId].bye, p.bye, 'every original bye keeps its half-value payout'));
    const done = E.completeShowdown(state, op());
    assert.equal(earn(done).paid, 12 * 20);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('championship double forfeit: no champion, no championship payout, completion blocked', () => {
    const { s, op } = toPlayoffs(8, { seed: 8 });
    let state = win(win(s, op, 'sf1'), op, 'sf2');
    state = df(state, op, 'f1');
    const status = E.championshipStatus(state);
    assert.equal(status.status, 'unresolved');
    assert.match(status.reason, /Both championship finalists forfeited/);
    const e = earn(state);
    assert.equal(e.paid, 8 * 20 - e.championship);
    [match(state, 'f1').p1, match(state, 'f1').p2].forEach((id) => assert.equal(e.byPlayer[id].playoff, state.playoffPlan.perRound.semifinal));
    assert.throws(() => E.completeShowdown(state, op()), /Both championship finalists forfeited/);
    const fixed = E.recordResult(state, 'f1', { score1: 5, score2: 4 }, op());
    const done = E.completeShowdown(fixed, op());
    assert.equal(earn(done).paid, 8 * 20);
  });

  it('a correction reverses a double forfeit and its administrative advancement', () => {
    const { s, op } = toPlayoffs(18, { seed: 9 });
    let state = win(df(s, op, 'qf1'), op, 'qf2');
    assert.equal(match(state, 'sf1').result, 'admin-bye');
    state = E.recordResult(state, 'qf1', { score1: 5, score2: 3 }, op());
    const sf = match(state, 'sf1');
    assert.equal(sf.status, 'waiting');
    assert.equal(sf.p1, match(state, 'qf1').winnerId);
    assert.equal(earn(state).championship, state.playoffPlan.perRound.final);
    assert.ok(state.audit.some((a) => a.action === 'correct-result' && a.detail.from.result === 'double-forfeit'));
  });

  it('once a later played match depends on it, the double forfeit is changed through Undo from here', () => {
    const { s, op } = toPlayoffs(18, { seed: 10 });
    let state = win(df(s, op, 'qf1'), op, 'qf2');
    state = win(win(win(state, op, 'qf3'), op, 'qf4'), op, 'sf2');
    state = E.startOnTable(state, 'f1', 1, op());
    assert.throws(() => E.recordResult(state, 'qf1', { score1: 5, score2: 0 }, op()), /Undo from here/);
    assert.throws(() => E.undoPlayoffFrom(state, 'sf1', 'RESET', op()), /automatic/);
    state = E.undoPlayoffFrom(state, 'qf1', 'RESET', op());
    assert.equal(match(state, 'qf1').status, 'waiting');
    assert.equal(match(state, 'sf1').status, 'waiting');
    assert.equal(match(state, 'f1').status, 'waiting');
    assert.equal(earn(state).championship, state.playoffPlan.perRound.final);
  });

  it('withdrawals: one-at-a-time withdrawals give a walkover first; a withdrawn player facing an empty position vacates the match', () => {
    const { s, op } = toPlayoffs(18, { seed: 11 });
    const qf1 = match(s, 'qf1');
    let state = E.withdrawPlayer(E.withdrawPlayer(s, qf1.p1, op()), qf1.p2, op());
    assert.equal(match(state, 'qf1').result, 'walkover', 'the first withdrawal already gave a walkover');

    const fresh = toPlayoffs(18, { seed: 12 });
    let t = fresh.s;
    const q2 = match(t, 'qf2');
    t = E.recordResult(t, 'qf2', { score1: 5, score2: 0 }, fresh.op());
    t = E.withdrawPlayer(t, q2.p1, fresh.op());
    t = df(t, fresh.op, 'qf1');
    const sf = match(t, 'sf1');
    assert.equal(sf.result, 'vacated');
    assert.equal(sf.winnerId, null);
    assert.deepEqual(sf.forfeitedBy, [q2.p1]);
    assert.equal(match(t, 'f1').empty1, true);
    assert.equal(E.championshipStatus(t).status, 'pending', 'the other semifinal is still to play');
    t = ['qf3', 'qf4', 'sf2'].reduce((x, id) => win(x, fresh.op, id), t);
    assert.equal(match(t, 'f1').result, 'champion-walkover');
    assert.equal(E.reconciliationProblem(E.completeShowdown(t, fresh.op())), '');
  });

  it('a withdrawn player waiting in the next round gives the arriving opponent a walkover', () => {
    const { s, op } = toPlayoffs(18, { seed: 13 });
    let state = win(s, op, 'qf1');
    const a = match(state, 'qf1').winnerId;
    state = E.withdrawPlayer(state, a, op());
    const q2 = match(state, 'qf2');
    state = E.recordResult(state, 'qf2', { score1: 5, score2: 1 }, op());
    assert.equal(match(state, 'sf1').result, 'walkover', 'a known, present opponent advances by walkover');
    assert.equal(match(state, 'sf1').winnerId, q2.p1);
  });

  it('result kinds stay distinct: played, walkover, double forfeit, administrative bye, empty, original bye', () => {
    const { s, op } = toPlayoffs(16, { seed: 14 });
    let state = df(s, op, 'qf1');
    state = E.withdrawPlayer(state, match(state, 'qf2').p1, op());
    state = win(state, op, 'qf3');
    const kinds = Object.fromEntries(state.matches.filter((m) => m.status === 'completed' && m.phase === 'playoff').map((m) => [m.id, m.result]));
    assert.deepEqual(kinds, { qf1: 'double-forfeit', qf2: 'walkover', qf3: 'played', sf1: 'admin-bye' });
    const e = earn(state);
    const w2 = match(state, 'qf2').winnerId;
    assert.equal(e.byPlayer[w2].playoff, state.playoffPlan.perRound.quarterfinal, 'a walkover is paid');
    const qf1 = match(state, 'qf1');
    [qf1.p1, qf1.p2].forEach((id) => assert.equal(e.byPlayer[id].playoff, 0, 'a double forfeit pays neither player'));
    const byeHolder = state.playoff.byes[0].playerId;
    assert.equal(e.byPlayer[byeHolder].bye, state.playoffPlan.bye, 'the original bye is paid; the administrative bye is not');
    assert.equal(e.byPlayer[byeHolder].playoff, 0);
  });
});
