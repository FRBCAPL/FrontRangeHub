import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent, playOpen, randomRace, settleShootouts, toPlayoffs } from '../showdownTestKit.js';
import { createFakeCloud, OPERATOR, GUEST_OPERATOR, PLAYER } from './showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './showdownCloudTestKit.js';
import { loadSyncMeta } from './showdownSyncStore.js';
import { sameEvent } from './showdownSync.js';
import { publicCopyProblem } from './showdownPublicState.js';
import { saveShowdown, loadShowdown, listArchivedShowdowns, archiveShowdown } from '../operator/showdownStore.js';
import { listShowdownsForHub, openShowdownFromHub, removeShowdownFromHub } from './showdownHubActions.js';
import { mergeHubEvents, filterCurrentEvents, filterCompletedEvents, hubFormatLabel, hubEventDetailLine, isShowdownHubEvent } from '../../tournamentHubEvents.js';
import { buildShowdownTvBoard } from '../public/showdownTvBoard.js';

beforeEach(() => freshStorage());

/** Saves after every engine step, the way the operator screen does. */
function cloudDriver(sync) {
  const saves = [];
  return {
    saves,
    async step(state) { saveShowdown(state); saves.push(sync.queue(state)); await saves[saves.length - 1]; return state; },
  };
}

async function fullEventThroughCloud(n, seed) {
  const fake = createFakeCloud();
  const api = apiFor(fake);
  const { sync } = syncFor(api);
  const d = cloudDriver(sync);
  let { s, op } = startedEvent(n, { seed });
  await d.step(s);
  const tick = () => { const c = op(); return c; };
  for (let guard = 0; guard < 400; guard += 1) {
    const ready = E.readyMatches(s.matches).filter((m) => m.phase === 'qualifying');
    const free = E.freeTables(s.matches, s.settings.tableCount);
    if (ready.length && free.length) { s = await d.step(E.startOnTable(s, E.suggestNextMatch(ready).id, free[0], tick())); continue; }
    const playing = s.matches.find((m) => m.phase === 'qualifying' && m.status === 'on-table');
    if (!playing) break;
    const c = tick();
    const [a, b] = randomRace(3)(playing, c.random);
    s = await d.step(E.recordResult(s, playing.id, { score1: a, score2: b }, c));
  }
  s = await d.step(E.lockQualifying(s, op()));
  s = await d.step(settleShootouts(s, op));
  s = await d.step(E.drawPlayoff(s, op()));
  s = await d.step(E.confirmPlayoff(s, op()));
  s = await d.step(playOpen(s, op, 'playoff', randomRace(5)));
  s = await d.step(E.completeShowdown(s, op()));
  return { fake, api, sync, s, saves: d.saves.length };
}

describe('full events through the cloud', () => {
  for (const [n, seed] of [[8, 11], [16, 12], [24, 13]]) {
    it(`${n} entrants: every step saved, cloud, tablet and public copies reconcile`, async () => {
      const { fake, api, sync, s, saves } = await fullEventThroughCloud(n, seed);
      assert.equal(sync.status.status, 'saved');
      const row = fake.events.get(s.id);
      assert.equal(row.version, saves, 'one version per save, no lost or skipped writes');
      assert.equal(row.status, 'completed');
      assert.ok(sameEvent(row.payload, loadShowdown()), 'cloud equals tablet');
      assert.equal(E.reconciliationProblem(row.payload), '');
      const earned = E.computeEarnings(row.payload);
      assert.equal(earned.paid, n * 20, '100% of the pool is paid');
      const pub = (await api.publicGet(s.id)).data.event;
      assert.equal(publicCopyProblem(pub), '');
      assert.deepEqual(E.computeEarnings(pub).byPlayer, earned.byPlayer, 'public earnings match the operator copy');
      const tv = buildShowdownTvBoard(pub);
      assert.equal(tv.mode, 'completed');
      assert.ok(tv.champion.id);
      assert.equal(tv.champion.id, E.championshipStatus(row.payload).championId);
      assert.equal(tv.champion.title, 'Champion');
      assert.equal(tv.final.length, n);
    });
  }

  it('recovery after a refresh mid-playoffs: the tablet copy and cloud agree and play continues', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const first = syncFor(api);
    let { s, op } = toPlayoffs(16, { seed: 21 });
    s = E.recordResult(E.startOnTable(s, 'qf1', 1, op()), 'qf1', { score1: 5, score2: 1 }, op());
    saveShowdown(s);
    await first.sync.queue(s);
    first.sync.stop();

    const reloaded = loadShowdown();
    assert.ok(sameEvent(reloaded, s), 'refresh keeps the full event on the tablet');
    const second = syncFor(api);
    await second.sync.hydrate(reloaded);
    assert.equal(second.sync.status.status, 'saved');
    let next = E.completeShowdown(playOpen(reloaded, op, 'playoff', randomRace(5)), op());
    await second.sync.queue(next);
    assert.equal(fake.events.get(s.id).status, 'completed');
    assert.equal(E.reconciliationProblem(fake.events.get(s.id).payload), '');
  });

  it('a refresh with unsent changes keeps them and sends them, never replacing them with the older cloud copy', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const first = syncFor(api);
    let { s, op } = startedEvent(8, { seed: 22 });
    await first.sync.queue(s);
    fake.setOffline(true);
    s = E.startOnTable(s, E.suggestNextMatch(s.matches).id, 1, op());
    saveShowdown(s);
    await first.sync.queue(s);
    assert.equal(loadSyncMeta(s.id).dirty, true);
    first.sync.stop();

    fake.setOffline(false);
    const second = syncFor(api);
    await second.sync.hydrate(loadShowdown());
    assert.equal(second.replaced.length, 0);
    assert.ok(sameEvent(fake.events.get(s.id).payload, s));
    assert.equal(loadSyncMeta(s.id).dirty, false);
  });

  it('a playoff double forfeit saves, restores and reconciles through the cloud', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { sync } = syncFor(api);
    let { s, op } = toPlayoffs(16, { seed: 23 });
    const qf1 = s.matches.find((m) => m.id === 'qf1');
    s = E.recordForfeit(s, 'qf1', [qf1.p1, qf1.p2], op());
    await sync.queue(s);
    const restored = (await api.load(s.id)).data.payload;
    assert.equal(restored.matches.find((m) => m.id === 'qf1').result, 'double-forfeit');
    assert.ok(restored.audit.some((a) => a.action === 'forfeit'));
    const done = E.completeShowdown(playOpen(restored, op, 'playoff', randomRace(5)), op());
    await sync.queue(done);
    const row = fake.events.get(s.id);
    assert.equal(E.reconciliationProblem(row.payload), '');
    assert.equal(E.computeEarnings(row.payload).paid, 16 * 20);
    const pub = (await api.publicGet(s.id)).data.event;
    assert.ok(!pub.audit?.length, 'the public sees the bracket result but not the audit log');
    assert.equal(pub.matches.find((m) => m.id === 'qf1').result, 'double-forfeit');
  });
});

describe('Tournament hub listing', () => {
  async function seeded() {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { sync } = syncFor(api);
    const live = startedEvent(8, { seed: 31 }).s;
    const c = startedEvent(8, { seed: 32 });
    const finished = E.completeShowdown(playOpen(E.confirmPlayoff(E.drawPlayoff(settleShootouts(E.lockQualifying(playOpen(c.s, c.op, 'qualifying', randomRace(3)), c.op()), c.op), c.op()), c.op()), c.op, 'playoff', randomRace(5)), c.op());
    const setupOnly = E.createShowdown({ name: 'Draft', players: [] }, { now: '2026-10-18T00:00:00.000Z', newId: () => 'showdown-draft' });
    const named = (st, name, venue) => ({ ...st, name, venue, tournamentDate: '2026-10-18' });
    const a = named({ ...live, id: 'showdown-live' }, 'Friday Showdown', 'Front Range');
    const b = named({ ...finished, id: 'showdown-done' }, 'Last Week', 'Front Range');
    await sync.queue(a);
    await sync.queue(b);
    await sync.queue(setupOnly);
    return { fake, api, a, b };
  }

  it('lists Showdowns under Current and Completed with their name, venue, date, status and id', async () => {
    const { api } = await seeded();
    const rows = await listShowdownsForHub(api);
    const all = mergeHubEvents({ showdownSaved: rows });
    const current = filterCurrentEvents(all);
    const completed = filterCompletedEvents(all);
    assert.ok(current.some((e) => e.id === 'showdown-live' && e.name === 'Friday Showdown' && e.venue === 'Front Range' && e.tournamentDate === '2026-10-18'));
    assert.deepEqual(completed.map((e) => e.id), ['showdown-done']);
    const live = current.find((e) => e.id === 'showdown-live');
    assert.equal(hubFormatLabel(live), 'Cash Climb: Showdown');
    assert.match(hubEventDetailLine(live), /Cash Climb: Showdown • Qualifying • .*Front Range/);
    assert.ok(isShowdownHubEvent(live));
  });

  it('the event open on this tablet is listed once, not twice', async () => {
    const { api, a } = await seeded();
    const rows = await listShowdownsForHub(api);
    const all = mergeHubEvents({ showdownSaved: rows, localShowdown: a });
    assert.equal(all.filter((e) => e.id === a.id).length, 1);
  });

  it('other formats are listed exactly as before', () => {
    const cash = [{ id: 'cc1', name: 'Cash', status: 'in-progress', type: 'cash-climb' }];
    const elim = [{ id: 'el1', name: 'Elim', status: 'completed', type: 'single-elimination' }];
    const before = mergeHubEvents({ cashClimbSaved: cash, elimSaved: elim });
    const after = mergeHubEvents({ cashClimbSaved: cash, elimSaved: elim, showdownSaved: [], localShowdown: null });
    assert.deepEqual(after, before);
    assert.equal(hubFormatLabel(before[0]), 'Cash Climb: King of the Hill');
  });

  it('other operators only see their own events; players see none', async () => {
    const { fake } = await seeded();
    assert.equal((await listShowdownsForHub(apiFor(fake, GUEST_OPERATOR))).length, 0);
    assert.equal((await listShowdownsForHub(apiFor(fake, PLAYER))).length, 0);
    assert.equal((await listShowdownsForHub(apiFor(fake, OPERATOR))).length, 3);
  });

  it('opening from the hub keeps the event already on the tablet in Past events', async () => {
    const { api, a, b } = await seeded();
    const other = { ...startedEvent(8, { seed: 33 }).s, id: 'showdown-tablet' };
    saveShowdown(other);
    const asked = [];
    const opened = await openShowdownFromHub(api, { id: a.id, name: a.name }, { confirm: (m) => { asked.push(m); return true; }, alert: assert.fail });
    assert.equal(opened, true);
    assert.equal(asked.length, 1);
    assert.ok(sameEvent(loadShowdown(), a));
    assert.equal(loadSyncMeta(a.id).version, 1);
    assert.ok(listArchivedShowdowns().some((e) => e.id === 'showdown-tablet'));
    assert.equal(await openShowdownFromHub(api, { id: b.id, name: b.name }, { confirm: () => false, alert: assert.fail }), false, 'declining leaves the tablet alone');
    assert.equal(loadShowdown().id, a.id);
  });

  it('removing from the hub deletes it from the cloud and the tablet after confirmation', async () => {
    const { fake, api, b } = await seeded();
    saveShowdown(b);
    archiveShowdown(b);
    assert.equal(await removeShowdownFromHub(api, { id: b.id, name: b.name }, { confirm: () => false, alert: assert.fail }), false);
    assert.ok(fake.events.has(b.id));
    assert.equal(await removeShowdownFromHub(api, { id: b.id, name: b.name }, { confirm: () => true, alert: assert.fail }), true);
    assert.equal(fake.events.has(b.id), false);
    assert.equal(loadShowdown(), null);
    assert.ok(!listArchivedShowdowns().some((e) => e.id === b.id));
  });

  it('a removal the database refuses keeps the event and says why', async () => {
    const { fake, b } = await seeded();
    const alerts = [];
    const ok = await removeShowdownFromHub(apiFor(fake, GUEST_OPERATOR), { id: b.id, name: b.name }, { confirm: () => true, alert: (m) => alerts.push(m) });
    assert.equal(ok, false);
    assert.ok(fake.events.has(b.id));
    assert.match(alerts[0], /was not removed/);
  });
});
