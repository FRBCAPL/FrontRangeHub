import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { SHOWDOWN_FORMAT_VERSION, SHOWDOWN_PAYOUT_VERSION } from './showdownRules.js';
import { legacyFormatProblem } from './showdownState.js';
import { names, operator, startedEvent } from './showdownTestKit.js';
import { fourteenPlayerEvent } from './showdownV2Fixture14.js';
import { toV2Playoffs, v2Event } from './showdownV2TestKit.js';
import { publicShowdown } from './cloud/showdownPublicState.js';
import { screenPublicEvent } from './public/useShowdownPublicEvent.js';
import { createFakeCloud } from './cloud/showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './cloud/showdownCloudTestKit.js';
import { moneyView, payoutPreview } from './operator/showdownBoardView.js';
import { buildShowdownTvBoard } from './public/showdownTvBoard.js';
import { showdownRaceGuide } from './showdownNewPlayerGuide.js';
import { render, loadComponent } from './operator/showdownRenderKit.js';

beforeEach(() => freshStorage());

describe('payout version: new events are V2, existing events stay V1', () => {
  it('new events get payoutVersion 2 without changing the format version, with races fixed at 3 and 5', () => {
    const s = E.createShowdown({ players: names(8), qualifyingRaceTo: 7, playoffRaceTo: 9 }, operator(1)());
    assert.equal(s.payoutVersion, SHOWDOWN_PAYOUT_VERSION);
    assert.equal(s.payoutVersion, 2);
    assert.equal(s.formatVersion, SHOWDOWN_FORMAT_VERSION);
    assert.equal(SHOWDOWN_FORMAT_VERSION, 3);
    assert.deepEqual([s.settings.qualifyingRaceTo, s.settings.playoffRaceTo], [3, 5]);
  });

  it('V2 race lengths cannot be changed by settings, validation or scoring', () => {
    const op = operator(2);
    const s = E.createShowdown({ players: names(8) }, op());
    assert.throws(() => E.updateSettings(s, { playoffRaceTo: 7 }, op()), /races are fixed/);
    assert.throws(() => E.updateSettings(s, { qualifyingRaceTo: 5 }, op()), /races are fixed/);
    const tampered = { ...s, settings: { ...s.settings, playoffRaceTo: 7 } };
    assert.ok(E.setupProblems(tampered).some((p) => /races are fixed/.test(p)));
    assert.throws(() => E.startShowdown(tampered, op()), /races are fixed/);
    const { s: live, op: lop } = toV2Playoffs(8, { seed: 2 });
    const m = E.readyMatches(live.matches).find((x) => x.phase === 'playoff');
    const hacked = { ...live, settings: { ...live.settings, playoffRaceTo: 7 } };
    assert.throws(() => E.recordResult(hacked, m.id, { score1: 7, score2: 6 }, lop()), /exactly 5/);
  });

  it('V1 events (no field, or payoutVersion 1) keep the V1 engine and editable settings', () => {
    const { s } = startedEvent(8, { seed: 3 });
    assert.equal(s.payoutVersion, 1);
    const legacy = { ...s };
    delete legacy.payoutVersion;
    assert.equal(E.payoutVersionOf(legacy), 1);
    assert.equal(E.payoutVersionOf({ ...s, payoutVersion: '2' }), null, 'a malformed version is unsupported, never V1');
    const op = operator(3);
    const draft = E.createShowdown({ players: names(8), payoutVersion: 1 }, op());
    assert.equal(E.updateSettings(draft, { playoffRaceTo: 7 }, op()).settings.playoffRaceTo, 7, 'V1 settings path is unchanged');
  });

  it('completed V1 events stay visible to the operator, phones and TV, with their original money', () => {
    const v1 = fourteenPlayerEvent(1);
    assert.equal(legacyFormatProblem(v1), '');
    const pub = publicShowdown(v1);
    assert.equal(screenPublicEvent(pub).event?.id, v1.id);
    assert.equal(pub.payoutVersion, undefined, 'no field is invented on V1 events');
    const tv = buildShowdownTvBoard(pub);
    assert.equal(tv.mode, 'completed');
    assert.equal(tv.champion.earnings, '$83');
    assert.equal(tv.champion.bonus, '', 'no champion bonus line on V1');
    assert.equal(tv.championship, '$32');
  });

  it('cloud saves and public copies preserve payoutVersion', async () => {
    const fake = createFakeCloud();
    const { sync } = syncFor(apiFor(fake));
    const { s } = v2Event(8, { seed: 4 });
    await sync.queue(s);
    const row = fake.events.get(s.id);
    assert.equal(row.payload.payoutVersion, 2);
    assert.equal(row.publicPayload.payoutVersion, 2);
    const res = await apiFor(fake).load(s.id);
    assert.equal(res.data.payload.payoutVersion, 2);
    assert.equal(E.payoutVersionOf(res.data.payload), 2);
  });
});

describe('V2 screens', () => {
  it('before qualifying locks the schedule is provisional with a truthful budget range', () => {
    const { s } = v2Event(14, { seed: 5 });
    const v = moneyView(s);
    assert.equal(v.locked, false);
    assert.equal(v.ladder.estimate, true);
    assert.ok(v.ladder.range.low.budget < v.ladder.range.high.budget);
    assert.equal(v.ladder.total, v.pool);
    assert.ok(!v.ladder.rows.some((r) => r.key === 'topUp'));
    const pv = payoutPreview(14, 20, 2);
    assert.equal(pv.ladder.range.low.budget, 280 - 70 - 70 - 45);
    assert.equal(pv.ladder.range.high.budget, 280 - 70 - 42 - 45);
    assert.ok(payoutPreview(14, 20, 1).ladder.rows.some((r) => r.key === 'topUp'), 'V1 preview unchanged');
  });

  it('operator money, payout ladder, public money and TV use V2 wording; V1 keeps top-up wording', async () => {
    const v2 = fourteenPlayerEvent(2);
    const html = await render('ShowdownMoney.jsx', { view: moneyView(v2), status: 'completed' });
    for (const text of ['Qualifying games', 'Qualifying wins', 'Playoff games', 'Playoff wins', 'Champion bonus', 'Playoff game reserve']) assert.ok(html.includes(text), text);
    assert.ok(!/\brack/i.test(html.replace(/<[^>]+>/g, ' ')), 'neutral game wording');
    assert.ok(!/top-up/i.test(html), 'no top-up language on V2');
    assert.ok(html.includes('Reconciled: $280 paid of $280'));
    const v1html = await render('ShowdownMoney.jsx', { view: moneyView(fourteenPlayerEvent(1)), status: 'completed' });
    assert.ok(/top-up/i.test(v1html), 'V1 keeps top-up language');

    const preview = await render('ShowdownPayoutLadder.jsx', { ladder: payoutPreview(14, 20, 2).ladder, title: 'Payout schedule' });
    assert.ok(preview.includes('Provisional') && preview.includes('between $95') && preview.includes('$123'));

    const [{ ShowdownPublicMoney, ShowdownPublicResults }, React, server] = await Promise.all([loadComponent('../public/ShowdownPublicMoney.jsx'), import('react'), import('react-dom/server')]);
    const pub = server.renderToStaticMarkup(React.createElement(ShowdownPublicMoney, { event: publicShowdown(v2) }));
    assert.ok(pub.includes('Champion bonus') && !/top-up/i.test(pub));
    const results = server.renderToStaticMarkup(React.createElement(ShowdownPublicResults, { event: publicShowdown(v2) }));
    assert.ok(results.includes('Includes a $5 champion bonus'));

    const tv = buildShowdownTvBoard(publicShowdown(v2));
    assert.equal(tv.champion.earnings, '$83');
    assert.equal(tv.champion.bonus, 'Includes $5 champion bonus');
    assert.equal(tv.championship, '$28 + champion bonus');
  });

  it('the player guides describe each format\u2019s pay: top-ups only for V1, $1 per game won for V2', () => {
    const v1 = JSON.stringify(showdownRaceGuide(1));
    const v2 = JSON.stringify(showdownRaceGuide(2));
    assert.ok(/Every qualifier is topped up to the entry fee/.test(v1));
    assert.ok(!/topped up to the entry fee/.test(v2) && /Qualifiers are not topped up/.test(v2));
    assert.ok(/Every game you win pays \$1/.test(v2) && !/pays \$1/.test(v1));
    assert.ok(/Games won do not pay on their own/.test(v1));
    for (const text of [v1, v2]) assert.ok(!/\brack/i.test(text));
  });
});
