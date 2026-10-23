import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../showdownEngine.js';
import { startV3, toBracketV3, toPlayoffsV3, runV3, startNext } from '../../v3/showdownV3WorkflowKit.js';
import { makeOperator, setUpEvent, workBoard } from '../../operator/showdownOperatorKit.js';
import { publicShowdown } from '../../cloud/showdownPublicState.js';
import { render } from '../../operator/showdownRenderKit.js';
import { V3_ESCALATING_FORMULA as D10 } from '../../v3/showdownV3Rules.js';
import { buildShowdownTvBoard } from '../showdownTvBoard.js';
import { sendPhoneScore } from '../showdownPhoneSubmit.js';
import { buildShowdownV3TvBoard } from './showdownV3TvBoard.js';
import { showdownV3Guide } from './showdownV3Guide.js';
import { v3PhoneLimits, v3PhoneRuleText } from './showdownV3PhoneRules.js';
import { queueViewV3 } from '../../operator/v3/showdownV3BoardView.js';

const NOT_GAME_AGNOSTIC = /billiard|\bcue\b|\brack\b|8-ball|9-ball|10-ball|\bballs?\b|\bdarts?\b|\bscratch\b/i;
const clean = (html) => {
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html.replace(/<!-- -->/g, '');
};
const tvHtml = async (b) => clean(await render('../public/v3/ShowdownV3TvBody.jsx', { b }));

function fakeApi(result = { data: { id: 's1', status: 'pending' }, error: null, code: '' }) {
  const calls = [];
  return { calls, submit: async (args) => { calls.push(args); return result; } };
}

const ev = {};
before(() => {
  const st = startV3(8, { games: 6, seed: 2, formula: D10 });
  let [s, m] = startNext(st.s, st.op, 'qualifying');
  ev.qualifying = publicShowdown(s);
  ev.qMatch = m;
  s = E.recordResult(s, m.id, { score1: 3, score2: 3 }, st.op());
  ev.tie = publicShowdown(E.withdrawPlayer(s, s.players[3].id, st.op()));
  ev.bracket = publicShowdown(toBracketV3(8, { seed: 4, formula: D10 }).s);
  const p = toPlayoffsV3(12, { seed: 3, games: 6, formula: D10 });
  const [ps, pm] = startNext(p.s, p.op, 'playoff');
  ev.playoffs = publicShowdown(ps);
  ev.pMatch = pm;
  ev.done = publicShowdown(runV3(8, { seed: 4, formula: D10 }).s);
});

describe('V3 TV', () => {
  it('qualifying: tables with R1/R2 and game count, ties, dollar standings with credits, V3 rates', async () => {
    const b = buildShowdownV3TvBoard(ev.qualifying);
    assert.equal(b.mode, 'qualifying');
    assert.match(b.tables[0].round, /^Round [12].* \u00b7 6 games$|Round 1 \/ Round 2/);
    assert.equal(b.formatLine, 'Showdown V3 \u00b7 6-game qualifying matches \u00b7 playoff races to 5');
    const t = buildShowdownV3TvBoard(ev.tie);
    assert.ok(t.recent.some((r) => r.resultText === '3\u20133 tie'));
    assert.ok(t.standings.hasCredits);
    const html = await tvHtml(t);
    for (const x of ['Qualifying $', 'Games won', 'Credits', 'Every game won pays', 'Qualifying game', 'Semifinal game', 'Championship game', 'Starting fund', 'Champion Fund so far', 'Credits are games credited for a forfeit, not games won.']) assert.ok(html.includes(x), x);
    assert.ok(!html.includes('Winner\u2019s bonus'));
    assert.ok(!html.includes('Round 1 game') && !html.includes('Round 2 game'));
    assert.ok(!NOT_GAME_AGNOSTIC.test(html));
  });

  it('bracket and playoffs: race note, per-game rates by round, bye credits, live table and scores', async () => {
    assert.equal(buildShowdownV3TvBoard(ev.bracket).mode, 'bracket');
    const b = buildShowdownV3TvBoard(ev.playoffs);
    assert.equal(b.mode, 'playoffs');
    assert.equal(b.byes.length, 3);
    assert.match(b.tables[0].round, /race to 5/);
    const html = await tvHtml(b);
    for (const x of ['race to 5', 'Bye to Semifinal', 'bye credit', 'a game', 'There are no match-win bonuses', 'Quarterfinal', 'Semifinal', 'Championship', `On table ${b.tables[0].table}`]) assert.ok(html.includes(x), x);
    assert.ok(!html.includes('winner\u2019s bonus'));
  });

  it('completed: champion, final standings with cent amounts and settlement', async () => {
    const b = buildShowdownV3TvBoard(ev.done);
    assert.equal(b.mode, 'completed');
    assert.equal(b.champion.title, 'Champion');
    const html = await tvHtml(b);
    for (const x of ['Final standings', 'Every cent of the $160 pool was paid to players.', b.champion.earnings]) assert.ok(html.includes(x), x);
  });

  it('V3 never uses the V1/V2 TV board, and an incomplete V3 copy shows nothing', () => {
    assert.equal(buildShowdownTvBoard(ev.qualifying), null);
    const { payoutPlan, ...noPlan } = ev.qualifying;
    assert.ok(payoutPlan);
    assert.equal(buildShowdownV3TvBoard(noPlan), null);
    const o = makeOperator(1);
    const v1 = publicShowdown(workBoard(o, setUpEvent(o, 8, { payoutVersion: 1 }), 'qualifying', () => [3, 1]));
    assert.ok(buildShowdownTvBoard(v1), 'V1 TV unchanged');
  });

  it('the V3 guide is V3-only and game-agnostic', () => {
    const text = JSON.stringify(showdownV3Guide());
    assert.ok(!NOT_GAME_AGNOSTIC.test(text), 'game-agnostic');
    assert.ok(!/\bV1\b|\bV2\b|ladder rung|Qualifying win pays|race to \d+ in qualifying/i.test(text), 'no V1/V2 content');
    assert.ok(/game/i.test(text) && /match/i.test(text));
  });
});

describe('V3 phone scoring', () => {
  it('limits and rule text come from the locked plan', () => {
    const q = v3PhoneLimits(ev.qualifying, ev.qMatch);
    assert.deepEqual(q, { phase: 'qualifying', games: 6, raceTo: 5 });
    assert.match(v3PhoneRuleText(q), /6 games, all played.*A tie is allowed/);
    assert.match(v3PhoneRuleText(v3PhoneLimits(ev.playoffs, ev.pMatch)), /Race to 5/);
  });

  it('qualifying: sums must equal the game count, ties are sent, negatives and fractions refused', async () => {
    const api = fakeApi();
    for (const [a, b] of [[4, 3], [2, 3], [-1, 7], [2.5, 3.5]]) {
      const r = await sendPhoneScore(api, ev.qualifying, ev.qMatch, a, b);
      assert.ok(r.error, `${a}-${b} refused`);
    }
    assert.match((await sendPhoneScore(api, ev.qualifying, ev.qMatch, 4, 3)).error, /add up to 6\. A tie is allowed/);
    assert.equal(api.calls.length, 0, 'nothing invalid reaches the server');
    const tie = await sendPhoneScore(api, ev.qualifying, ev.qMatch, 3, 3, 'Sam');
    assert.equal(tie.status, 'pending');
    assert.deepEqual([api.calls[0].score1, api.calls[0].score2, api.calls[0].name], [3, 3, 'Sam']);
  });

  it('playoffs: exactly one player reaches the race', async () => {
    const api = fakeApi();
    for (const [a, b] of [[5, 5], [4, 3], [6, 2]]) assert.ok((await sendPhoneScore(api, ev.playoffs, ev.pMatch, a, b)).error, `${a}-${b}`);
    assert.equal(api.calls.length, 0);
    assert.equal((await sendPhoneScore(api, ev.playoffs, ev.pMatch, 5, 2)).status, 'pending');
  });

  it('server refusals: stale, finished, duplicate and isolation are explained', async () => {
    const cases = { 'stale-match': /changed since you opened it/, 'match-finished': /already has a result/, duplicate: /already waiting/, 'dev-isolation-required': /never sent to the live database/, 'invalid-games': /add up to 6/ };
    for (const [code, re] of Object.entries(cases)) {
      const r = await sendPhoneScore(fakeApi({ data: null, error: new Error(code), code }), ev.qualifying, ev.qMatch, 3, 3);
      assert.match(r.error, re, code);
    }
  });

  it('the phone modal shows the game count and a tie is allowed', async () => {
    const match = queueViewV3(ev.qualifying, 'qualifying').onTable[0];
    const html = clean(await render('../public/v3/ShowdownV3PhoneScoreModal.jsx', { event: ev.qualifying, match, onSend() {}, onCancel() {} }));
    assert.ok(html.includes(match.p1Name) && html.includes(match.p2Name));
    assert.ok(html.includes('6 games, all played'));
    assert.ok(html.includes('A tie is allowed'));
  });
});
