import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { operator, names, settleShootouts } from '../showdownTestKit.js';
import { createFakeCloud } from './showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './showdownCloudTestKit.js';
import { submissionFromRow, settledSubmissions } from './showdownPending.js';
import { publicCopyProblem } from './showdownPublicState.js';
import { sameEvent } from './showdownSync.js';
import { saveShowdown, loadShowdown } from '../operator/showdownStore.js';
import { sendPhoneScore } from '../public/showdownPhoneSubmit.js';
import { buildShowdownTvBoard } from '../public/showdownTvBoard.js';
import { listShowdownsForHub } from './showdownHubActions.js';
import { mergeHubEvents, filterCompletedEvents, filterCurrentEvents } from '../../tournamentHubEvents.js';

beforeEach(() => freshStorage());

/** One operator tablet talking to the stand-in database, plus a phone with no session. */
function dryRun(seed) {
  const fake = createFakeCloud();
  const api = apiFor(fake);
  const phone = apiFor(fake, null);
  let tablet = syncFor(api);
  const op = operator(seed);
  const run = {
    fake, api, phone, op, state: null, phoneCount: 0, operatorCount: 0,
    async commit(next) {
      run.state = next;
      saveShowdown(next);
      await tablet.sync.queue(next);
      assert.notEqual(tablet.sync.status.status, 'conflict');
      return next;
    },
    async publicCopy() {
      const res = await phone.publicGet(run.state.id);
      return res.data?.event || null;
    },
    async refresh() {
      tablet.sync.stop();
      tablet = syncFor(api);
      const reloaded = loadShowdown();
      assert.ok(sameEvent(reloaded, run.state), 'the tablet copy survives a refresh');
      await tablet.sync.hydrate(reloaded);
      assert.equal(tablet.sync.status.status, 'saved');
      run.state = reloaded;
    },
  };
  return run;
}

function decideScore(m, race, random) {
  const loser = Math.floor(random() * race);
  return random() < 0.5 ? [race, loser] : [loser, race];
}

/** Plays a phase one table at a time. Two of every three scores come in by phone. */
async function playPhase(run, phase) {
  for (let guard = 0; guard < 120; guard += 1) {
    const ready = E.readyMatches(run.state.matches).filter((m) => m.phase === phase);
    if (!ready.length) return;
    const next = E.suggestNextMatch(ready);
    await run.commit(E.startOnTable(run.state, next.id, 1, run.op()));
    const race = phase === 'playoff' ? run.state.settings.playoffRaceTo : run.state.settings.qualifyingRaceTo;
    const c = run.op();
    const [a, b] = decideScore(next, race, c.random);
    if (guard % 3 === 2) {
      run.operatorCount += 1;
      await run.commit(E.recordResult(run.state, next.id, { score1: a, score2: b }, c));
      continue;
    }
    const pub = await run.publicCopy();
    const sent = await sendPhoneScore(run.phone, pub, pub.matches.find((m) => m.id === next.id), a, b, 'Phone');
    assert.equal(sent.status, 'pending', sent.message);
    const rows = (await run.api.pending(run.state.id)).data;
    assert.equal(rows.length, 1);
    assert.equal(run.fake.events.get(run.state.id).payload.matches.find((m) => m.id === next.id).status, 'on-table', 'a phone score never finalizes a match');
    await run.commit(E.approvePhoneResult(run.state, submissionFromRow(rows[0]), c));
    for (const s of settledSubmissions(run.state, rows)) await run.api.decide(s.id, s.decision, s.reason);
    assert.equal((await run.phone.submissionStatus(sent.id)).data.status, 'approved');
    run.phoneCount += 1;
  }
  throw new Error(`${phase} did not finish`);
}

async function assertPublicPhase(run, mode) {
  const pub = await run.publicCopy();
  assert.ok(pub, 'public copy exists once the event is running');
  assert.equal(publicCopyProblem(pub), '');
  assert.ok(!pub.audit?.length);
  const tv = buildShowdownTvBoard(pub);
  assert.equal(tv.mode, mode);
  assert.ok(!JSON.stringify(tv).includes('@'), 'no emails on the TV');
  return { pub, tv };
}

const shootoutRuns = [];

async function fullDryRun(n, seed) {
  const run = dryRun(seed);
  let s = E.createShowdown({ name: `Dry run ${n}`, venue: 'Front Range Pool', tournamentDate: '2026-10-24', entryFee: 20, tableCount: 3, players: names(n) }, run.op());
  await run.commit(s);
  assert.equal(await run.publicCopy(), null, 'setup events are not public');
  assert.equal(filterCurrentEvents(mergeHubEvents({ showdownSaved: await listShowdownsForHub(run.api) })).length, 1);

  await run.commit(E.startShowdown(run.state, run.op()));
  const qMatches = run.state.matches.filter((m) => m.phase === 'qualifying').length;
  assert.equal(qMatches, n, `${n % 2 ? 'odd' : 'even'} circle: N matches`);
  await assertPublicPhase(run, 'qualifying');

  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i += 1) {
    const ready = E.readyMatches(run.state.matches).filter((m) => m.phase === 'qualifying');
    const next = E.suggestNextMatch(ready);
    const c = run.op();
    await run.commit(E.recordResult(E.startOnTable(run.state, next.id, 2, c), next.id, { score1: 3, score2: i % 3 }, run.op()));
  }
  await run.refresh();
  await playPhase(run, 'qualifying');
  assert.equal(E.qualifyingComplete(run.state), true);

  await run.commit(E.lockQualifying(run.state, run.op()));
  if (run.state.status === 'shootout') {
    shootoutRuns.push(n);
    const { pub } = await assertPublicPhase(run, 'shootout');
    const anyMatch = pub.matches.find((m) => m.phase === 'qualifying');
    const blocked = await run.phone.submit({ eventId: pub.id, matchId: anyMatch.id, phase: 'qualifying', p1: anyMatch.p1, p2: anyMatch.p2, score1: 3, score2: 0, name: 'x' });
    assert.equal(blocked.code, 'event-not-active', 'no phone scores during a shootout');
    await run.commit(settleShootouts(run.state, run.op));
  }
  assert.equal(run.state.status, 'bracket');
  await run.commit(E.drawPlayoff(run.state, run.op()));
  const preview = await run.publicCopy();
  assert.equal(preview.playoff.confirmedAt, null, 'the public copy knows the draw is unconfirmed (pages hide it)');
  await run.commit(E.confirmPlayoff(run.state, run.op()));
  await assertPublicPhase(run, 'playoffs');

  await playPhase(run, 'playoff');
  await run.refresh();
  await run.commit(E.completeShowdown(run.state, run.op()));
  return run;
}

describe('Phase 4 dry run: registration to final payout, every supported field size', () => {
  for (let n = 8; n <= 24; n += 1) {
    it(`${n} entrants`, async () => {
      const run = await fullDryRun(n, 100 + n);
      const row = run.fake.events.get(run.state.id);
      assert.equal(row.status, 'completed');
      assert.ok(sameEvent(row.payload, run.state), 'cloud matches the tablet at the end');
      assert.equal(E.reconciliationProblem(row.payload), '');
      const e = E.computeEarnings(row.payload);
      assert.equal(e.paid, n * 20, '100% of the pool is paid');
      const byes = row.payload.playoff.byes;
      assert.equal(byes.length, row.payload.payoutPlan.byes);
      assert.equal(byes.length, { 12: 3, 13: 3, 14: 2, 15: 2, 16: 1, 17: 1 }[n] || 0);
      byes.forEach((b) => assert.equal(e.byPlayer[b.playerId].bye, row.payload.playoffPlan.bye));
      assert.ok(run.phoneCount > run.operatorCount, 'most scores came by phone');

      const { tv } = await assertPublicPhase(run, 'completed');
      assert.equal(tv.champion.id, row.payload.championId);
      assert.equal(tv.final.length, n);
      assert.equal(tv.paid, tv.pool);
      const hub = mergeHubEvents({ showdownSaved: await listShowdownsForHub(run.api), localShowdown: loadShowdown() });
      assert.deepEqual(filterCompletedEvents(hub).map((x) => x.id), [run.state.id]);
      assert.equal(filterCurrentEvents(hub).length, 0);
      assert.equal((await run.api.pending(run.state.id)).data.length, 0, 'no submission left waiting');
    });
  }

  it('the dry runs included qualification shootouts', () => {
    assert.ok(shootoutRuns.length >= 3, `shootouts in: ${shootoutRuns.join(', ')}`);
  });
});

describe('Phase 4 dry run: administrative situations', () => {
  it('18 entrants with two qualifying double forfeits, a playoff branch that empties, and a Champion by Walkover', async () => {
    const run = dryRun(7);
    await run.commit(E.startShowdown(E.createShowdown({ name: 'Admin dry run', entryFee: 20, tableCount: 3, players: names(18) }, run.op()), run.op()));
    const q = run.state.matches.filter((m) => m.phase === 'qualifying');
    for (const m of q.slice(0, 2)) await run.commit(E.recordForfeit(run.state, m.id, [m.p1, m.p2], run.op()));
    await playPhase(run, 'qualifying');
    await run.commit(E.lockQualifying(run.state, run.op()));
    if (run.state.status === 'shootout') await run.commit(settleShootouts(run.state, run.op));
    await run.commit(E.confirmPlayoff(E.drawPlayoff(run.state, run.op()), run.op()));

    for (const id of ['qf1', 'qf2']) {
      const m = run.state.matches.find((x) => x.id === id);
      await run.commit(E.recordForfeit(run.state, id, [m.p1, m.p2], run.op()));
    }
    const pub = await run.publicCopy();
    const sf1 = pub.matches.find((m) => m.id === 'sf1');
    assert.equal(sf1.result, 'empty');
    const refused = await run.phone.submit({ eventId: pub.id, matchId: 'qf1', phase: 'playoff', p1: 'P1', p2: 'P2', score1: 5, score2: 0, name: 'x' });
    assert.ok(refused.error, 'no phone score for a double-forfeited match');

    await playPhase(run, 'playoff');
    const final = run.state.matches.find((m) => m.id === 'f1');
    assert.equal(final.result, 'champion-walkover');
    const p = run.state.playoffPlan;
    const e = E.computeEarnings(run.state);
    assert.equal(e.championship, p.perRound.final + 2 * run.state.payoutPlan.q + 2 * p.perRound.quarterfinal + p.perRound.semifinal);
    await run.commit(E.completeShowdown(run.state, run.op()));
    const row = run.fake.events.get(run.state.id);
    assert.equal(E.reconciliationProblem(row.payload), '');
    assert.equal(E.computeEarnings(row.payload).paid, 18 * 20);
    const { tv } = await assertPublicPhase(run, 'completed');
    assert.equal(tv.champion.title, 'Champion by Walkover');
    assert.equal(tv.champion.id, final.winnerId);
  });

  it('a championship double forfeit is saved as unresolved; the event cannot complete and the TV says so', async () => {
    const run = dryRun(8);
    await run.commit(E.startShowdown(E.createShowdown({ name: 'Unresolved dry run', entryFee: 20, tableCount: 3, players: names(8) }, run.op()), run.op()));
    await playPhase(run, 'qualifying');
    await run.commit(E.lockQualifying(run.state, run.op()));
    if (run.state.status === 'shootout') await run.commit(settleShootouts(run.state, run.op));
    await run.commit(E.confirmPlayoff(E.drawPlayoff(run.state, run.op()), run.op()));
    for (const id of ['sf1', 'sf2']) {
      await run.commit(E.startOnTable(run.state, id, 1, run.op()));
      await run.commit(E.recordResult(run.state, id, { score1: 5, score2: 2 }, run.op()));
    }
    const f = run.state.matches.find((m) => m.id === 'f1');
    await run.commit(E.recordForfeit(run.state, 'f1', [f.p1, f.p2], run.op()));
    assert.throws(() => E.completeShowdown(run.state, run.op()), /Both championship finalists forfeited/);
    const { tv } = await assertPublicPhase(run, 'playoffs');
    assert.equal(tv.championshipStatus.status, 'unresolved');
    const e = E.computeEarnings(run.state);
    assert.equal(e.paid + e.championship, 8 * 20, 'only the championship payout is held');
    assert.equal(run.fake.events.get(run.state.id).status, 'playoffs');
  });
});
