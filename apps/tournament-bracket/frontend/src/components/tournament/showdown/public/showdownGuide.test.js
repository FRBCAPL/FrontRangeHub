import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { showdownRaceGuide, showdownFieldTable } from '../showdownNewPlayerGuide.js';
import { FIELD_RULES } from '../showdownFieldRules.js';
import { buildPayoutPlan } from '../showdownPayout.js';
import {
  SHOWDOWN_GUIDE_HASH, SHOW_OLDER_GUIDE_VERSIONS, isShowdownGuide, showdownGuideVersion, showdownGuideHash, showdownGuideHref, showdownGuideTvHref,
} from './showdownGuideRoute.js';
import { showdownGuideCompare, showdownGuideFor } from './guide/showdownGuides.js';
import { showdownV3Guide } from './v3/showdownV3Guide.js';
import { v3GuideCopy } from '../v3/showdownV3NewEventCopy.js';
import { V3_D10_FOR_NEW_EVENTS } from '../v3/showdownV3Activation.js';
import { raceEventFacts } from './showdownRaceFacts.js';
import { CASH_CLIMB_GUIDE_HASH } from '../../cash-climb/cashClimbGuideRoute.js';
import { loadComponent } from '../operator/showdownRenderKit.js';

async function renderAt(file, url, props = {}) {
  const [{ default: Component }, React, server] = await Promise.all([loadComponent(file), import('react'), import('react-dom/server')]);
  globalThis.__showdownTestUrl = url;
  try {
    return server.renderToStaticMarkup(React.createElement(Component, props));
  } finally {
    delete globalThis.__showdownTestUrl;
  }
}

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;|&rsquo;/g, '\u2019').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const GUIDE = '../../cash-climb/CashClimbPublicGuide.jsx';
const NOT_PROCEDURE = /9-ball|texas|foul|push-out|\brack|\blag\b|\bbreaks?\b/i;
const bodyOf = (g) => g.sections.flatMap((s) => s.body).join(' ');

describe('Showdown V1 and V2 guides', () => {
  it('state the format numbers the engine actually uses', () => {
    for (const v of [1, 2]) {
      const g = showdownRaceGuide(v);
      const all = bodyOf(g);
      assert.equal(g.code, `V${v}`);
      assert.deepEqual(g.stages.map((s) => s.meta), ['Race to 3 games', 'Race to 5 games']);
      assert.match(all, /8\u201324 players/);
      assert.match(all, /exactly 2 qualifying matches/);
      assert.match(all, new RegExp(`\\$${buildPayoutPlan({ entrants: 14, entryFee: 20 }).q} on a \\$20 entry`));
      assert.match(all, /The tournament director will tell you the game and the rules/);
      assert.match(all, /you can win cash even if you do not make the playoffs/);
      assert.match(all, /1\. Match wins .* 6\. Opponents\u2019 game differential/);
    }
  });

  it('never claims one payout rule covers every format', () => {
    for (const v of [1, 2]) assert.ok(!/in every format/i.test(JSON.stringify(showdownRaceGuide(v))), `V${v}`);
  });

  it('the playoff table matches the approved field sizes and byes', () => {
    const rows = showdownFieldTable();
    assert.deepEqual(rows.map((r) => r.qualifiers), FIELD_RULES.map((r) => r.qualifiers));
    assert.deepEqual(rows.map((r) => [r.entrants, r.byes]), [['8\u201311', 0], ['12\u201313', 3], ['14\u201315', 2], ['16\u201317', 1], ['18\u201324', 0]]);
    for (const r of FIELD_RULES) {
      const plan = buildPayoutPlan({ entrants: r.min, entryFee: 20 });
      const row = rows.find((x) => x.qualifiers === plan.qualifiers);
      assert.equal(row.byes, plan.byes, `${r.min} players`);
    }
  });
});

describe('Showdown V3 guide copy', () => {
  it('describes the formula new events use (the activation switch)', () => {
    assert.deepEqual(showdownGuideFor(3), showdownV3Guide(v3GuideCopy(V3_D10_FOR_NEW_EVENTS)));
    assert.deepEqual(showdownGuideCompare(), showdownGuideCompare(v3GuideCopy(V3_D10_FOR_NEW_EVENTS).compare));
  });

  it('equal-rate copy: the equal game rate, match-win bonuses and the leftover to the champion', () => {
    const all = bodyOf(showdownV3Guide(v3GuideCopy(false)));
    assert.match(all, /Every game you win adds to your payout, in qualifying and in the playoffs/);
    assert.match(all, /the match winner also collects a bonus that gets bigger every round/);
    assert.match(all, /Money left over in the playoffs\? It goes to the champion/);
    assert.match(all, /exact dollar amounts\? They are on your event page/);
    assert.ok(!/Champion Fund|bye credit/i.test(JSON.stringify(showdownV3Guide(v3GuideCopy(false)))), 'no D10 wording');
    assert.ok(!/Champion Fund/.test(JSON.stringify(showdownGuideCompare(v3GuideCopy(false).compare))));
  });

  it('D10 copy: escalating game values, bye credits and the Champion Fund, and points to each event page for exact rates', () => {
    const all = bodyOf(showdownV3Guide(v3GuideCopy(true)));
    assert.ok(all.includes('Every game won earns money. Game values increase as the tournament progresses. Players receiving an opening-round bye earn a bye credit. Unused game money grows the Champion Fund, which is awarded to the tournament champion.'));
    assert.match(all, /Every game you win adds to your payout, in qualifying and in the playoffs/);
    assert.match(all, /each playoff round pays more per game than the round before\. There are no match-win bonuses/);
    assert.match(all, /A bye credit is not a game won/);
    assert.match(all, /exact dollar amounts\? They are on your event page/);
    assert.match(all, /The Champion Fund is set aside from the prize pool when the event starts/);
    assert.ok(!/winner.s bonus|bonus that grows/i.test(all), 'no match-win bonus wording');
    assert.match(all, /Some earlier events worked a little differently/);
    assert.match(all, /With an even number of games, a match can end in a tie/);
    assert.ok(!/circle/i.test(all), 'no seating-circle detail');
  });
});

describe('Showdown guide versions', () => {
  it('routes ?format=showdown&v=1|2|3, defaulting to V3; old showdown-v3 links still open V3', () => {
    assert.equal(SHOWDOWN_GUIDE_HASH, `${CASH_CLIMB_GUIDE_HASH}?format=showdown`);
    assert.equal(isShowdownGuide('format=showdown&tv=1'), true);
    assert.equal(isShowdownGuide('format=showdown-v3'), true);
    assert.equal(isShowdownGuide(''), false);
    assert.equal(showdownGuideVersion('format=showdown'), 3);
    assert.equal(showdownGuideVersion('format=showdown&v=1'), 1);
    assert.equal(showdownGuideVersion('format=showdown&v=2&tv=1'), 2);
    assert.equal(showdownGuideVersion('format=showdown&v=9'), 3);
    assert.equal(showdownGuideVersion('format=showdown-v3'), 3);
    assert.equal(showdownGuideHash(1), `${SHOWDOWN_GUIDE_HASH}&v=1`);
    assert.equal(showdownGuideHash(null), SHOWDOWN_GUIDE_HASH);
    assert.match(showdownGuideHref({ version: 2 }), /\?format=showdown&v=2$/);
    assert.match(showdownGuideTvHref({ version: 3 }), /\?format=showdown&v=3&tv=1$/);
    assert.match(showdownGuideTvHref(), /\?format=showdown&tv=1$/);
  });

  it('the comparison has one cell per version for every row, in tab order', () => {
    const { versions, rows } = showdownGuideCompare();
    assert.deepEqual(versions, [3, 2, 1]);
    assert.ok(rows.length >= 8);
    for (const r of rows) assert.equal(r.cells.length, 3, r.label);
    const topUp = rows.find((r) => /topped up/.test(r.label));
    assert.deepEqual(topUp.cells, ['No', 'No', 'Yes']);
  });

  it('players see only V3: no version tabs, no comparison, no earlier-format note', async () => {
    assert.equal(SHOW_OLDER_GUIDE_VERSIONS, false);
    const html = await renderAt(GUIDE, SHOWDOWN_GUIDE_HASH);
    const page = text(html);
    for (const t of ['How Cash Climb Showdown works', 'Who makes the playoffs', 'Follow a Showdown', 'The short version', 'On your phone', 'Good to know']) {
      assert.ok(page.includes(t), t);
    }
    for (const cls of ['sd-guide-versions', 'sd-guide-compare', 'sd-guide-older']) assert.ok(!html.includes(cls), `no ${cls}`);
    assert.ok(!/\bV1\b|\bV2\b|\bV3\b/.test(page), 'no version mentions');
    assert.ok(!page.includes('3 losses out'), 'no original Cash Climb copy');
  });

  it('with older versions shown, V3 comes first with tabs and the comparison', async () => {
    const html = await renderAt('../public/ShowdownPublicGuide.jsx', SHOWDOWN_GUIDE_HASH, { version: 3, showOlder: true });
    const page = text(html);
    assert.ok(page.includes('What\u2019s different') && page.includes('Qualifying dollars'));
    assert.ok(html.indexOf('>V3') < html.indexOf('>V2') && html.indexOf('>V2') < html.indexOf('>V1'), 'tabs ordered V3, V2, V1');
    assert.match(html, /aria-selected="true"[^>]*>V3/);
    assert.ok(!html.includes('sd-guide-older'));
  });

  it('direct V1/V2 links (older event pages) show that version with an earlier-format note', async () => {
    const v1 = text(await renderAt(GUIDE, `${SHOWDOWN_GUIDE_HASH}&v=1`));
    assert.ok(v1.includes('earlier Showdown format') && v1.includes('See how Showdown works now') && !/\bV3\b/.test(v1));
    assert.ok(v1.includes('How Cash Climb Showdown V1 works') && v1.includes('Race to 3') && v1.includes('Race to 5'));
    assert.ok(v1.includes('Every qualifier is topped up to the entry fee'));
    assert.ok(!v1.includes('How Cash Climb Showdown works') && !v1.includes('Every game you win pays $1'));
    const v2 = text(await renderAt(GUIDE, `${SHOWDOWN_GUIDE_HASH}&v=2`));
    assert.ok(v2.includes('How Cash Climb Showdown V2 works') && v2.includes('Every game you win pays $1'));
    assert.ok(!v2.includes('Every qualifier is topped up'));
    const old = text(await renderAt(GUIDE, `${CASH_CLIMB_GUIDE_HASH}?format=showdown-v3`));
    assert.ok(old.includes('How Cash Climb Showdown works'));
  });

  it('every version and TV board is tournament procedure only', async () => {
    for (const q of ['', '&v=1', '&v=2', '&v=3']) {
      for (const tv of ['', '&tv=1']) {
        const page = text(await renderAt(GUIDE, `${SHOWDOWN_GUIDE_HASH}${q}${tv}`));
        assert.ok(!NOT_PROCEDURE.test(page), `${q}${tv}`);
      }
    }
  });

  it('the TV board shows one version with no switch, tabs, comparison or footer', async () => {
    for (const v of [1, 2, 3]) {
      const tv = await renderAt(GUIDE, `${SHOWDOWN_GUIDE_HASH}&v=${v}&tv=1`);
      assert.ok(tv.includes('is-tv'));
      assert.ok(text(tv).includes(v === 3 ? 'How Cash Climb Showdown works' : `How Cash Climb Showdown V${v} works`));
      if (v === 3) assert.ok(!/\bV3\b/.test(text(tv)), 'no V3 on the TV board');
      for (const cls of ['cc-guide-switch', 'sd-guide-versions', 'sd-guide-compare', 'sd-guide-older', 'cc-guide-foot']) assert.ok(!tv.includes(cls), `V${v}: no ${cls}`);
    }
  });

  it('V1/V2 event pages get a version line like V3', () => {
    const event = { settings: { entryFee: 20, qualifyingRaceTo: 3, playoffRaceTo: 5 }, players: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}` })) };
    assert.deepEqual(raceEventFacts(event), ['Showdown V1', 'Entry $20', '8 entrants', 'Qualifying: race to 3', 'Playoffs: race to 5']);
    assert.equal(raceEventFacts({ ...event, payoutVersion: 2 })[0], 'Showdown V2');
  });
});
