import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent, toPlayoffs, shootoutEvent, playOpen } from '../showdownTestKit.js';
import { createFakeCloud, OPERATOR, PLAYER } from './showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './showdownCloudTestKit.js';
import { pendingView, settledSubmissions, submissionFromRow } from './showdownPending.js';
import { sendPhoneScore, reportableMatches } from '../public/showdownPhoneSubmit.js';

beforeEach(() => freshStorage());

async function liveQualifying(seed = 1) {
  const fake = createFakeCloud();
  const api = apiFor(fake);
  const { sync } = syncFor(api);
  let { s, op } = startedEvent(8, { seed });
  s = E.startOnTable(s, E.suggestNextMatch(s.matches).id, 1, op());
  await sync.queue(s);
  const pub = (await api.publicGet(s.id)).data.event;
  return { fake, api, sync, s, op, pub, onTable: s.matches.find((m) => m.status === 'on-table') };
}

const phone = (fake) => apiFor(fake, null);

describe('phone submissions', () => {
  it('a valid qualifying score is pending only; the event does not change until the operator approves', async () => {
    const { fake, api, sync, s, op, pub, onTable } = await liveQualifying(1);
    const sent = await sendPhoneScore(phone(fake), pub, onTable, 3, 1, 'Player A');
    assert.equal(sent.status, 'pending');
    assert.equal(fake.events.get(s.id).payload.matches.find((m) => m.id === onTable.id).status, 'on-table', 'nothing finalized');

    const rows = (await api.pending(s.id)).data;
    assert.equal(rows.length, 1);
    const [view] = pendingView(s, rows);
    assert.equal(view.problem, '');
    assert.equal(view.submittedName, 'Player A');

    const approved = E.approvePhoneResult(s, submissionFromRow(rows[0]), op());
    const m = approved.matches.find((x) => x.id === onTable.id);
    assert.deepEqual([m.status, m.score1, m.score2, m.result], ['completed', 3, 1, 'played']);
    assert.ok(approved.audit.some((a) => a.action === 'phone-approve' && a.detail.submittedName === 'Player A'));
    assert.ok(approved.audit.some((a) => a.action === 'result'), 'recorded through the normal result path');

    await sync.queue(approved);
    const settle = settledSubmissions(approved, rows);
    assert.deepEqual(settle.map((x) => x.decision), ['approved']);
    await api.decide(settle[0].id, 'approved');
    assert.equal((await phone(fake).submissionStatus(sent.id)).data.status, 'approved');
    assert.equal((await api.pending(s.id)).data.length, 0);
  });

  it('rejection leaves the match open, tells the phone why, and the player can resend', async () => {
    const { fake, api, s, op, pub, onTable } = await liveQualifying(2);
    const sent = await sendPhoneScore(phone(fake), pub, onTable, 3, 2);
    const [row] = (await api.pending(s.id)).data;
    const after = E.rejectPhoneResult(s, submissionFromRow(row), 'Score was 3-1', op());
    assert.equal(after.matches.find((m) => m.id === onTable.id).status, 'on-table');
    await api.decide(row.id, 'rejected', 'Score was 3-1');
    const status = (await phone(fake).submissionStatus(sent.id)).data;
    assert.deepEqual([status.status, status.reason], ['rejected', 'Score was 3-1']);
    assert.equal((await sendPhoneScore(phone(fake), pub, onTable, 3, 1)).status, 'pending');
  });

  it('scores are validated against the race length, in the browser and again by the server', async () => {
    const { fake, pub, onTable } = await liveQualifying(3);
    for (const [a, b] of [[3, 3], [2, 1], [4, 0], [-1, 3], [1.5, 3]]) {
      assert.match((await sendPhoneScore(phone(fake), pub, onTable, a, b)).error, /exactly one player must reach 3/);
      const direct = await phone(fake).submit({ eventId: pub.id, matchId: onTable.id, p1: onTable.p1, p2: onTable.p2, score1: a, score2: b });
      assert.equal(direct.code, 'invalid-score', `server refuses ${a}-${b}`);
    }
  });

  it('blocks duplicates, matches not started, finished matches and stale match details', async () => {
    const { fake, api, sync, s, op, pub, onTable } = await liveQualifying(4);
    const p = phone(fake);
    await sendPhoneScore(p, pub, onTable, 3, 0);
    assert.match((await sendPhoneScore(p, pub, onTable, 3, 1)).error, /already waiting/);

    const waiting = s.matches.find((m) => m.status === 'waiting');
    const notStarted = await p.submit({ eventId: s.id, matchId: waiting.id, p1: waiting.p1, p2: waiting.p2, score1: 3, score2: 0 });
    assert.equal(notStarted.code, 'match-not-started');

    const stale = await p.submit({ eventId: s.id, matchId: onTable.id, p1: onTable.p2, p2: onTable.p1, score1: 3, score2: 0 });
    assert.equal(stale.code, 'stale-match');

    const done = E.recordResult(s, onTable.id, { score1: 3, score2: 2 }, op());
    await sync.queue(done);
    const finished = await p.submit({ eventId: s.id, matchId: onTable.id, p1: onTable.p1, p2: onTable.p2, score1: 3, score2: 0 });
    assert.equal(finished.code, 'match-finished');

    const rows = (await api.pending(s.id)).data;
    const [settle] = settledSubmissions(done, rows);
    assert.deepEqual([settle.decision, settle.reason], ['rejected', 'The director recorded a different result for this match.']);
  });

  it('approval re-checks the event: a match taken off its table can no longer be approved', async () => {
    const { fake, api, s, op, pub, onTable } = await liveQualifying(5);
    await sendPhoneScore(phone(fake), pub, onTable, 3, 1);
    const [row] = (await api.pending(s.id)).data;
    const off = E.takeOffTable(s, onTable.id, op());
    assert.throws(() => E.approvePhoneResult(off, submissionFromRow(row), op()), /has not started yet/);
    assert.match(pendingView(off, [row])[0].problem, /has not started/);
  });

  it('no submissions for shootouts, events not running, withdrawn players, forfeits or walkovers', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { s: shoot } = shootoutEvent(8);
    await api.save(shoot, 0);
    const anyQ = shoot.matches[0];
    assert.equal((await phone(fake).submit({ eventId: shoot.id, matchId: anyQ.id, p1: anyQ.p1, p2: anyQ.p2, score1: 3, score2: 0 })).code, 'event-not-active');
    assert.equal(reportableMatches((await api.publicGet(shoot.id)).data.event).length, 0, 'nothing reportable during a shootout');

    const { s: setup } = { s: E.createShowdown({ players: [] }, { now: '2026-10-18T00:00:00.000Z' }) };
    await api.save(setup, 0);
    assert.equal((await phone(fake).submit({ eventId: setup.id, matchId: 'q1', p1: 'a', p2: 'b', score1: 3, score2: 0 })).code, 'event-not-active');

    const other = createFakeCloud();
    const { s, op } = startedEvent(8, { seed: 6 });
    const m = E.suggestNextMatch(s.matches);
    const withdrawn = E.withdrawPlayer(E.startOnTable(s, m.id, 1, op()), m.p1, op());
    assert.equal((await apiFor(other).save(withdrawn, 0)).code, '');
    const forfeited = withdrawn.matches.find((x) => x.id === m.id);
    assert.equal(forfeited.status, 'completed', 'withdrawal forfeits the match');
    assert.equal(forfeited.result, 'forfeit');
    assert.equal((await phone(other).submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 0, score2: 3 })).code, 'match-finished');
    const later = withdrawn.matches.find((x) => x.status !== 'completed' && [x.p1, x.p2].includes(m.p1));
    if (later) assert.equal((await phone(other).submit({ eventId: s.id, matchId: later.id, p1: later.p1, p2: later.p2, score1: 3, score2: 0 })).code, 'match-finished');
  });

  it('playoff scores use the playoff race; qualifying matches are not reportable once playoffs start', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { s, op } = toPlayoffs(8, { seed: 7 });
    const started = E.startOnTable(s, 'sf1', 1, op());
    await api.save(started, 0);
    const pub = (await api.publicGet(s.id)).data.event;
    const sf = pub.matches.find((m) => m.id === 'sf1');
    assert.match((await sendPhoneScore(phone(fake), pub, sf, 3, 0)).error, /reach 5/);
    assert.equal((await sendPhoneScore(phone(fake), pub, sf, 5, 4)).status, 'pending');
    const q = s.matches.find((m) => m.phase === 'qualifying');
    assert.equal((await phone(fake).submit({ eventId: s.id, matchId: q.id, p1: q.p1, p2: q.p2, score1: 3, score2: 0 })).code, 'match-not-eligible');
  });

  it('only operators approve or reject; the public cannot read the queue or decide', async () => {
    const { fake, s, pub, onTable } = await liveQualifying(8);
    const sent = await sendPhoneScore(phone(fake), pub, onTable, 3, 1);
    assert.equal((await apiFor(fake, null).decide(sent.id, 'approved')).code, 'not-authorized');
    assert.equal((await apiFor(fake, PLAYER).decide(sent.id, 'approved')).code, 'not-authorized');
    assert.equal((await apiFor(fake, PLAYER).pending(s.id)).code, 'not-authorized');
    assert.equal((await apiFor(fake, OPERATOR).decide(sent.id, 'maybe')).code, 'invalid-decision');
    const pubPending = (await phone(fake).publicPending(s.id)).data;
    assert.deepEqual(Object.keys(pubPending[0]).sort(), ['created_at', 'match_id'], 'public sees only which match is waiting');
  });

  it('repeated rejected submissions for one match are rate limited', async () => {
    const { fake, api, s, pub, onTable } = await liveQualifying(9);
    for (let i = 0; i < 5; i += 1) {
      const sent = await sendPhoneScore(phone(fake), pub, onTable, 3, 0);
      await api.decide(sent.id, 'rejected', 'no');
    }
    assert.match((await sendPhoneScore(phone(fake), pub, onTable, 3, 0)).error, /Too many submissions/);
  });

  it('an outage while sending shows a plain error', async () => {
    const { fake, pub, onTable } = await liveQualifying(10);
    fake.setOffline(true);
    assert.match((await sendPhoneScore(phone(fake), pub, onTable, 3, 0)).error, /Could not reach the server/);
  });

  it('phone approvals drive a whole qualifying round to the same standings as operator entry', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { sync } = syncFor(api);
    let { s, op } = startedEvent(8, { seed: 11 });
    let operatorOnly = s;
    for (let guard = 0; guard < 50 && s.matches.some((m) => m.phase === 'qualifying' && m.status !== 'completed'); guard += 1) {
      const next = E.suggestNextMatch(s.matches.filter((m) => m.phase === 'qualifying'));
      s = E.startOnTable(s, next.id, 1, op());
      operatorOnly = E.startOnTable(operatorOnly, next.id, 1, op());
      await sync.queue(s);
      const pub = (await api.publicGet(s.id)).data.event;
      const m = pub.matches.find((x) => x.id === next.id);
      await sendPhoneScore(phone(fake), pub, m, 3, guard % 3);
      const [row] = (await api.pending(s.id)).data;
      s = E.approvePhoneResult(s, submissionFromRow(row), op());
      operatorOnly = E.recordResult(operatorOnly, next.id, { score1: 3, score2: guard % 3 }, op());
      await sync.queue(s);
      await api.decide(row.id, 'approved');
    }
    assert.deepEqual(E.standingsFor(s).rows, E.standingsFor(operatorOnly).rows);
    assert.equal(E.qualifyingComplete(s), true);
    assert.equal(playOpen(s, op, 'qualifying', () => [3, 0]).status, 'qualifying');
  });
});
