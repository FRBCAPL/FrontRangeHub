import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './cashClimbV3RenderKit.test-support.mjs';
import { currentRound, roundOfMatch, roundProgress } from './cashClimbV3RoundStatus.js';
import { playMatches, startedRecord } from '../cloud/cashClimbV3CloudTestKit.js';

const summary = (p) => p.map((r) => `${r.label}:${r.tone}:${r.state}:${r.done}/${r.total}`);

describe('Cash Climb (V3) live round status', () => {
  it('starts in the opening round with later rounds upcoming, each in its own colour', () => {
    const p = roundProgress(startedRecord('rs-1', 8).event);
    assert.deepEqual(summary(p), ['Opening round:early:current:0/4', 'Semifinal:semifinal:upcoming:0/2', 'Championship:championship:upcoming:0/1']);
    assert.equal(currentRound(p).label, 'Opening round');
  });

  it('moves to the semifinal once every opening match has a result', () => {
    const p = roundProgress(playMatches(startedRecord('rs-2', 8), 4).event);
    assert.deepEqual(summary(p), ['Opening round:early:done:4/4', 'Semifinal:semifinal:current:0/2', 'Championship:championship:upcoming:0/1']);
  });

  it('marks a larger field\u2019s quarterfinal and reports no current round when everything is played', () => {
    const p = roundProgress(startedRecord('rs-3', 16).event);
    assert.deepEqual(p.map((r) => r.tone), ['early', 'quarterfinal', 'semifinal', 'championship']);
    const all = roundProgress(playMatches(startedRecord('rs-4', 8)).event);
    assert.equal(currentRound(all), null);
    assert.ok(all.every((r) => r.state === 'done'));
  });

  it('knows each match\u2019s round', () => {
    const p = roundProgress(startedRecord('rs-5', 8).event);
    const of = roundOfMatch(p);
    p.forEach((r) => r.matchIds.forEach((id) => assert.deepEqual(of.get(id), { label: r.label, tone: r.tone })));
  });

  it('the banner names the current round in its colour, with the round strip', async () => {
    const p = roundProgress(playMatches(startedRecord('rs-6', 8), 4).event);
    const html = await render('./CashClimbV3RoundBanner.jsx', { progress: p });
    assert.match(html, /class="ccv3-round-banner tone-semifinal"/);
    assert.match(html, /Now playing/);
    assert.match(html, /<h3 class="ccv3-round-name">Semifinal<\/h3>/);
    assert.match(html, /0 of 2 matches done/);
    assert.match(html, /is-done tone-early"[^>]*>.*?Opening round/);
    assert.match(html, /is-current tone-semifinal" aria-current="step"/);
  });

  it('match history opens on the latest round with results and lists them with what they paid', async () => {
    const rec = playMatches(startedRecord('rs-8', 8), 5);
    const html = await render('./CashClimbV3HistoryDialog.jsx', { record: rec, onClose: () => {} });
    assert.match(html, /Match history/);
    assert.match(html, /tone-semifinal is-active" aria-pressed="true">Semifinal/);
    assert.equal([...html.matchAll(/class="ccv3-history-item"/g)].length, 1, 'one semifinal played');
    assert.match(html, /1 Semifinal match still to play/);
    assert.match(html, /class="ccv3-earned">[^<]+ \+\$/);
    const fresh = await render('./CashClimbV3HistoryDialog.jsx', { record: startedRecord('rs-9', 8), onClose: () => {} });
    assert.match(fresh, /No Opening round results yet/);
  });

  it('the live bracket never shows a match twice and has one round selector', async () => {
    const live = playMatches(startedRecord('rs-7', 8), 4);
    const html = await render('./CashClimbV3Bracket.jsx', { record: live, live: true, onEnter: () => {} });
    const titles = [...html.matchAll(/<article [^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(titles, [...new Set(titles)], `repeated: ${titles.join(', ')}`);
    assert.ok(!html.includes('class="ccv3-rounds"'), 'no second row of round tabs');
    const settled = await render('./CashClimbV3Bracket.jsx', { record: live });
    assert.ok(settled.includes('class="ccv3-rounds"'), 'read-only bracket keeps its round tabs');
  });
});
