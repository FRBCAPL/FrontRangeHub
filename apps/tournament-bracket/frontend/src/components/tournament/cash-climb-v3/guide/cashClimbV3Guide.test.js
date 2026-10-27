import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Guide, cashClimbV3FinalSplit } from './cashClimbV3Guide.js';
import {
  CASH_CLIMB_V3_GUIDE_HASH, isCashClimbV3Guide, cashClimbV3GuideHref, cashClimbV3GuideTvHref,
} from './cashClimbV3GuideRoute.js';
import { CASH_CLIMB_GUIDE_HASH } from '../../cash-climb/cashClimbGuideRoute.js';
import { isShowdownGuide } from '../../showdown/public/showdownGuideRoute.js';
import { openingScoreSplit } from '../cashClimbV3Opening.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { CASH_CLIMB_V3_LIMITS } from '../cashClimbV3Config.js';
import { loadComponent } from '../../showdown/operator/showdownRenderKit.js';

const GUIDE = '../../cash-climb/CashClimbPublicGuide.jsx';
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;|&rsquo;/g, '\u2019').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const bodyOf = (g) => g.sections.flatMap((s) => s.body).join(' ');

async function renderAt(url) {
  const [{ default: Component }, React, server] = await Promise.all([loadComponent(GUIDE), import('react'), import('react-dom/server')]);
  globalThis.__showdownTestUrl = url;
  try {
    return server.renderToStaticMarkup(React.createElement(Component));
  } finally {
    delete globalThis.__showdownTestUrl;
  }
}

describe('Cash Climb guide: every claim matches the engine', () => {
  it('an opening-round shutout pays back the full entry fee, and half that in the preliminary round', () => {
    for (let fee = 10; fee <= 60; fee += 1) {
      for (let raceTo = 1; raceTo <= 9; raceTo += 1) {
        const config = { entryFeeCents: fee * 100, raceTo };
        assert.equal(openingScoreSplit(config, 0).winner, fee, `$${fee} race to ${raceTo}`);
        assert.equal(openingScoreSplit(config, 0, { preliminary: true }).winner, Math.floor((fee + 1) / 2), `$${fee} race to ${raceTo} preliminary`);
        assert.equal(openingScoreSplit(config, 0).loser, 0);
      }
    }
    assert.match(bodyOf(cashClimbV3Guide()), /shutout pays back your full entry fee \(half that in the preliminary round\)/);
  });

  it('in the opening round the winner always earns more than the loser', () => {
    for (const fee of [10, 20, 35]) {
      for (let raceTo = 2; raceTo <= 9; raceTo += 1) {
        for (let L = 1; L < raceTo; L += 1) {
          const s = openingScoreSplit({ entryFeeCents: fee * 100, raceTo }, L);
          assert.ok(s.winner > s.loser, `$${fee} race to ${raceTo}, ${raceTo}-${L}`);
        }
      }
    }
  });

  it('states the engine championship split, minimum field and entry fee', () => {
    const split = cashClimbV3FinalSplit();
    assert.deepEqual(split, { champion: 80, runnerUp: 20 });
    const all = bodyOf(cashClimbV3Guide());
    assert.match(all, /80% to the champion and 20% to the runner-up/);
    assert.ok(all.includes(`at least ${CASH_CLIMB_V3_LIMITS.minEntrants} players and a $${CASH_CLIMB_V3_LIMITS.minEntryFeeCents / 100} entry fee`));
  });

  it('the preliminary-round example matches the bracket shape', () => {
    const s = cashClimbV3Shape(12);
    assert.equal(s.preliminaryMatches, 4);
    assert.equal(s.preliminaryByes, 4);
    assert.match(bodyOf(cashClimbV3Guide()), /with 12 players, 8 play 4 preliminary matches and 4 go straight to the opening round/);
  });

  it('every section has short TV lines, and no line repeats inside a section', () => {
    const g = cashClimbV3Guide();
    assert.equal(g.sections.length, 7);
    for (const s of g.sections) {
      assert.ok(s.tv?.length, s.title);
      assert.equal(new Set(s.body).size, s.body.length, s.title);
      assert.equal(new Set(s.tv).size, s.tv.length, s.title);
    }
  });
});

describe('Cash Climb guide route', () => {
  it('uses the shared how-it-works route; the bare route stays King of the Hill', () => {
    assert.equal(CASH_CLIMB_V3_GUIDE_HASH, `${CASH_CLIMB_GUIDE_HASH}?format=cash-climb-v3`);
    assert.equal(isCashClimbV3Guide('format=cash-climb-v3'), true);
    assert.equal(isCashClimbV3Guide('format=cash-climb-v3&tv=1'), true);
    assert.equal(isCashClimbV3Guide(''), false);
    assert.equal(isCashClimbV3Guide('format=showdown'), false);
    assert.equal(isShowdownGuide('format=cash-climb-v3'), false);
    assert.match(cashClimbV3GuideHref(), /\/tournament-bracket\/how-it-works\?format=cash-climb-v3$/);
    assert.match(cashClimbV3GuideTvHref(), /\?format=cash-climb-v3&tv=1$/);
  });

  it('renders the Cash Climb guide with a three-format switch', async () => {
    const html = await renderAt(CASH_CLIMB_V3_GUIDE_HASH);
    const page = text(html);
    for (const t of ['How Cash Climb works', 'Opening round', 'The climb', 'Preliminary round', 'The championship', 'Forfeits and withdrawals', 'Good to know']) {
      assert.ok(page.includes(t), t);
    }
    assert.match(html, /aria-selected="true"[^>]*>Cash Climb</);
    for (const t of ['>King of the Hill<', '>Showdown<']) assert.ok(html.includes(t), t);
    assert.ok(!page.includes('3 losses'), 'no King of the Hill copy');
  });

  it('the bare route still shows King of the Hill, and TV mode shows short lines without the switch', async () => {
    const koh = text(await renderAt(CASH_CLIMB_GUIDE_HASH));
    assert.ok(koh.includes('How Cash Climb King of the Hill works'));
    const tv = await renderAt(`${CASH_CLIMB_V3_GUIDE_HASH}&tv=1`);
    assert.ok(!tv.includes('cc-guide-switch') && !tv.includes('cc-guide-foot'));
    assert.ok(text(tv).includes('Both players get paid.'));
  });
});
