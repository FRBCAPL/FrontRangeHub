import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { showdownNewPlayerGuide, showdownFieldTable } from '../showdownNewPlayerGuide.js';
import { FIELD_RULES } from '../showdownFieldRules.js';
import { buildPayoutPlan } from '../showdownPayout.js';
import { SHOWDOWN_GUIDE_HASH, isShowdownGuide } from './showdownGuideRoute.js';
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

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '\u2019').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('Showdown public guide', () => {
  it('states the format numbers the engine actually uses', () => {
    const g = showdownNewPlayerGuide();
    const all = g.sections.flatMap((s) => s.body).join(' ');
    assert.equal(g.qualifyingRaceTo, 3);
    assert.equal(g.playoffRaceTo, 5);
    assert.match(all, /8\u201324 players/);
    assert.match(all, /exactly 2 qualifying matches/);
    assert.match(all, new RegExp(`\\$${buildPayoutPlan({ entrants: 14, entryFee: 20 }).q} on a \\$20 entry`));
    assert.match(all, /not the same as the original Cash Climb/);
    assert.match(all, /1\. Match wins .* 6\. Opponents\u2019 game differential/);
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

  it('shares the public how-it-works route, selected by ?format=showdown', () => {
    assert.equal(SHOWDOWN_GUIDE_HASH, `${CASH_CLIMB_GUIDE_HASH}?format=showdown`);
    assert.equal(isShowdownGuide('format=showdown&tv=1'), true);
    assert.equal(isShowdownGuide(''), false);
  });

  it('the how-it-works route shows the right guide for each format, with a switch between them', async () => {
    const original = text(await renderAt('../../cash-climb/CashClimbPublicGuide.jsx', CASH_CLIMB_GUIDE_HASH));
    assert.ok(original.includes('How Cash Climb works') && original.includes('King of the Hill'));
    assert.ok(original.includes('Cash Climb Showdown'), 'switch offers the Showdown guide');

    const showdown = text(await renderAt('../../cash-climb/CashClimbPublicGuide.jsx', SHOWDOWN_GUIDE_HASH));
    for (const t of ['How Cash Climb Showdown works', 'Qualifying', 'Playoffs', 'Who makes the playoffs', 'Race to 3', 'Race to 5', 'Follow a Showdown']) {
      assert.ok(showdown.includes(t), t);
    }
    assert.ok(!showdown.includes('3 losses out'), 'no original Cash Climb copy');
    const tvText = text(await renderAt('../../cash-climb/CashClimbPublicGuide.jsx', `${SHOWDOWN_GUIDE_HASH}&tv=1`));
    for (const page of [showdown, tvText]) {
      assert.ok(!/9-ball|texas|foul|push-out|\brack|\blag\b|\bbreaks?\b/i.test(page), 'tournament procedure only, no playing rules');
    }
    assert.ok(showdown.includes('Showdown only records who wins each game'));
  });

  it('the TV board has no switch or footer', async () => {
    const tv = await renderAt('../../cash-climb/CashClimbPublicGuide.jsx', `${SHOWDOWN_GUIDE_HASH}&tv=1`);
    assert.ok(tv.includes('is-tv'));
    assert.ok(!tv.includes('cc-guide-switch') && !tv.includes('cc-guide-foot'));
  });
});
