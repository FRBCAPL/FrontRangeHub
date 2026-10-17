import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { SHOWDOWN_FORMAT_VERSION } from './showdownRules.js';
import { legacyFormatProblem, LEGACY_PUBLIC_MESSAGE } from './showdownState.js';
import { startedEvent, toBracket, runToCompletion, names, operator } from './showdownTestKit.js';
import { createFakeCloud, freshStorage, apiFor } from './cloud/showdownCloudTestKit.js';
import { GUEST_OPERATOR } from './cloud/showdownFakeCloud.js';
import { closeObsoleteShowdown } from './cloud/showdownHubActions.js';
import { publicShowdown } from './cloud/showdownPublicState.js';
import { screenPublicEvent } from './public/useShowdownPublicEvent.js';
import { loadShowdown, saveShowdown, listArchivedShowdowns, SHOWDOWN_STORAGE_KEY } from './operator/showdownStore.js';
import { render, fakeLocalStorage } from './operator/showdownRenderKit.js';

/** An event locked under the earlier rules: same data, older format version. */
function obsolete(state) {
  return { ...state, formatVersion: SHOWDOWN_FORMAT_VERSION - 1 };
}

beforeEach(() => freshStorage());

describe('obsolete test events (started before the restart-on-reduction tiebreakers)', () => {
  it('format version 3 marks the restart rule; anything started earlier is obsolete', () => {
    assert.equal(SHOWDOWN_FORMAT_VERSION, 3);
    const { s } = toBracket(12, { seed: 4 });
    assert.equal(s.formatVersion, 3);
    assert.equal(legacyFormatProblem(s), '');
    for (const v of [undefined, 1, 2]) {
      assert.match(legacyFormatProblem({ ...s, formatVersion: v }), /obsolete test event/);
    }
  });

  it('a setup created under an older version is not blocked and starts under the current rules', () => {
    const op = operator(2);
    const setup = { ...E.createShowdown({ name: 'Old setup', entryFee: 20, tableCount: 4, players: names(8) }, op()), formatVersion: 2 };
    assert.equal(legacyFormatProblem(setup), '');
    const started = E.startShowdown(setup, op());
    assert.equal(started.formatVersion, 3);
    assert.equal(legacyFormatProblem(started), '');
  });

  it('the operator app shows only the close-and-archive notice: no standings, bracket or controls', async () => {
    const { s } = toBracket(12, { seed: 4 });
    fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(obsolete(s)) });
    const html = await render('ShowdownApp.jsx', { onLeave() {} });
    for (const t of ['obsolete test event', 'Close and archive', 'Tournaments menu']) assert.ok(html.includes(t), t);
    for (const t of ['Run event', 'Qualifying standings', 'Draw bracket', 'Lock qualifying', 'Separated from player above by']) assert.ok(!html.includes(t), `hides ${t}`);
    fakeLocalStorage();
  });

  it('Past events labels obsolete events', async () => {
    const { s } = toBracket(12, { seed: 4 });
    const html = await render('ShowdownStart.jsx', { archive: [obsolete(s), s], onNew() {}, onOpen() {}, onRemove() {}, onLeave() {} });
    assert.equal((html.match(/Obsolete test event/g) || []).length, 1);
  });

  it('phones and the TV never receive an obsolete event; current events pass through', () => {
    const { s } = toBracket(12, { seed: 4 });
    assert.deepEqual(screenPublicEvent(publicShowdown(obsolete(s))), { event: null, error: LEGACY_PUBLIC_MESSAGE });
    const ok = screenPublicEvent(publicShowdown(s));
    assert.equal(ok.error, '');
    assert.equal(ok.event.id, s.id);
    assert.deepEqual(screenPublicEvent(null), { event: null, error: '' });
  });

  it('closing deletes the cloud copy (public list and page), archives it on the tablet and clears the tablet', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const old = obsolete(toBracket(12, { seed: 4 }).s);
    assert.equal((await api.save(old, 0)).error, null);
    saveShowdown(old);
    assert.equal((await api.publicList()).data.length, 1);

    assert.equal(await closeObsoleteShowdown(api, old), '');
    assert.equal(loadShowdown(), null);
    assert.ok(listArchivedShowdowns().some((x) => x.id === old.id), 'kept in Past events');
    assert.equal(fake.events.has(old.id), false);
    assert.equal((await api.publicList()).data.length, 0);
    assert.equal((await api.publicGet(old.id)).data, null);
    assert.equal(await closeObsoleteShowdown(api, old), '', 'closing again is harmless');
  });

  it('if the cloud refuses, nothing is cleared and the operator sees why', async () => {
    const fake = createFakeCloud();
    const old = obsolete(toBracket(12, { seed: 4 }).s);
    await apiFor(fake).save(old, 0);
    saveShowdown(old);
    const problem = await closeObsoleteShowdown(apiFor(fake, GUEST_OPERATOR), old);
    assert.match(problem, /cloud copy was not removed/);
    assert.equal(loadShowdown().id, old.id);
    assert.ok(fake.events.has(old.id));
  });
});

describe('new events use the restart rule end to end', () => {
  it('a full current-format event completes, reconciles and renders on the operator, public and TV screens', async () => {
    const { s, op } = startedEvent(14, { seed: 11 });
    const done = runToCompletion(s, op);
    assert.equal(done.formatVersion, 3);
    assert.equal(legacyFormatProblem(done), '');
    assert.equal(E.reconciliationProblem(done), '');
    assert.equal(screenPublicEvent(publicShowdown(done)).event.id, done.id);
    fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(done) });
    const html = await render('ShowdownApp.jsx', { onLeave() {} });
    assert.ok(!html.includes('obsolete test event'));
    fakeLocalStorage();
  });
});
