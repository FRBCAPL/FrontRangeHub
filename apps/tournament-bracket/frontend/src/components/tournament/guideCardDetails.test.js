import test from 'node:test';
import assert from 'node:assert/strict';
import { showdownV3Guide } from './showdown/public/v3/showdownV3Guide.js';
import { showdownV3GuideExample } from './showdown/public/v3/showdownV3GuideExample.js';
import { v3GuideCopy } from './showdown/v3/showdownV3NewEventCopy.js';
import { guideExamples } from './break-and-run/breakAndRunGuide.js';
import { breakAndRunGuideDetails, breakAndRunRuleSections } from './break-and-run/breakAndRunGuideDetails.js';
import { CALLED_BREAK_AND_RUN_RULES } from './break-and-run/breakAndRunCalledRules.js';

function assertCardsLinked(name, { details, journey, faq, sections }) {
  const titles = new Set(sections.map((s) => s.title));
  for (const item of [...journey, ...faq]) {
    const d = details[item.detail];
    assert.ok(d, `${name}: missing detail ${item.detail}`);
    assert.ok(d.lead && d.title, `${name}: ${item.detail} needs a title and lead`);
    assert.ok(titles.has(d.topic), `${name}: ${item.detail} links to unknown topic ${d.topic}`);
  }
  for (const step of journey) assert.ok(details[step.detail].summary, `${name}: step ${step.detail} needs a summary`);
}

test('Showdown guide cards link to real topics, for both payout formulas', () => {
  for (const d10 of [true, false]) assertCardsLinked(`showdown d10=${d10}`, showdownV3Guide(v3GuideCopy(d10)));
});

test('Showdown example comes from the locked plan (16 players, $20, 7 games, race to 5)', () => {
  const ex = showdownV3GuideExample({ d10: true });
  const { details } = showdownV3Guide(v3GuideCopy(true));
  assert.equal(ex.pool, 32000);
  assert.equal(ex.qualifiers, 7);
  assert.equal(ex.byes, 1);
  assert.deepEqual(details.qualifying.example.rows[0], ['4\u20133', ex.usd(4 * ex.gameCents), ex.usd(3 * ex.gameCents)]);
  const qf = ex.rounds.find((r) => r.key === 'quarterfinal');
  assert.equal(ex.byeCents * 2, 5 * qf.gameCents, 'bye credit is half a full quarterfinal win');
  assert.deepEqual(details.champion.example.rows[0], ['Champion Fund at the start', ex.usd(ex.championFundCents)]);
});

test('Showdown equal-rate cards never use the Champion Fund or bye credit wording', () => {
  const g = showdownV3Guide(v3GuideCopy(false));
  assert.ok(!/Champion Fund|bye credit/i.test(JSON.stringify(g)));
});

test('Break & Run cards link to official rules and use the payout math', () => {
  const examples = guideExamples(500);
  const cards = breakAndRunGuideDetails({ examples });
  const sections = breakAndRunRuleSections();
  assert.equal(sections.length, CALLED_BREAK_AND_RUN_RULES.length);
  assert.ok(sections.every((s) => s.body.length && s.body.every((line) => line.trim())));
  assertCardsLinked('break-and-run', { ...cards, sections });
  assert.deepEqual(cards.details.call.example.rows.at(-1), ['Added to your bank', '$60']);
  assert.deepEqual(cards.details.cashout.example.rows.map((r) => r[2]), ['$160', '$0']);
  assert.equal(cards.details.tenball.example.rows[1].at(-1), '$500');
  assert.match(cards.details.break.example.title, /with a \$500 pot/);
  assert.match(breakAndRunGuideDetails({ examples, live: true }).details.break.example.title, /pot right now/);
});
