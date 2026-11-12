import test from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbV3Guide } from './cashClimbV3Guide.js';
import { cashClimbV3GuideExample } from './cashClimbV3GuideExample.js';
import { cashClimbNewPlayerGuide } from '../../cash-climb/cashClimbNewPlayerGuide.js';
import { cashClimbGuideExample } from '../../cash-climb/cashClimbGuideExample.js';

for (const [name, guide] of [['Cash Climb', cashClimbV3Guide()], ['King of the Hill', cashClimbNewPlayerGuide()]]) {
  test(`${name} guide: every step and question opens its own detail, linked to a real topic`, () => {
    const titles = new Set(guide.sections.map((s) => s.title));
    for (const item of [...guide.journey, ...guide.faq]) {
      const d = guide.details[item.detail];
      assert.ok(d, `missing detail ${item.detail}`);
      assert.ok(d.lead && d.title, `detail ${item.detail} needs a title and lead`);
      assert.ok(titles.has(d.topic), `detail ${item.detail} links to unknown topic ${d.topic}`);
    }
    for (const step of guide.journey) assert.ok(guide.details[step.detail].summary, `step ${step.detail} needs a summary`);
    const leads = guide.journey.map((s) => guide.details[s.detail].lead);
    assert.equal(new Set(leads).size, leads.length, 'each step shows different details');
  });
}

test('Cash Climb full rules: every card topic has its own rules section, with engine numbers', () => {
  const guide = cashClimbV3Guide();
  const titles = new Set(guide.rules.map((s) => s.title));
  for (const d of Object.values(guide.details)) assert.ok(titles.has(d.topic), `no rules section for ${d.topic}`);
  const text = JSON.stringify(guide.rules);
  assert.match(text, /at least 8 players/);
  assert.match(text, /A 5-4 match pays the winner \$11 and the loser \$8/);
  assert.match(text, /champion gets \$42 and the runner-up \$10/);
});

test('Sam\u2019s night adds up from the engine example', () => {
  const { story } = cashClimbV3Guide();
  const ex = cashClimbV3GuideExample();
  assert.deepEqual(story.run.map((r) => r.amount), [13, 14, 26, 42]);
  assert.equal(story.total, 95);
  assert.deepEqual(story.whatIf.map((r) => r.amount), [8, 27, 13 + 14 + 26 + ex.final.runnerUp]);
});

test('Cash Climb guide example comes from the payout engine (16 players, $20, race to 5)', () => {
  const ex = cashClimbV3GuideExample();
  assert.equal(ex.prizePool, 320);
  assert.deepEqual(ex.opening[0], { score: '5-0', winner: 20, loser: 0 });
  assert.deepEqual(ex.opening[4], { score: '5-4', winner: 11, loser: 8 });
  assert.deepEqual(ex.later.map((r) => r.name), ['Quarterfinal', 'Semifinal', 'Championship']);
  const total = ex.opening.length && ex.later.reduce((sum, r, i) => sum + r.amount * 2 ** (ex.later.length - 1 - i), 0);
  assert.equal(total + ex.openingMatches * ex.opening[0].winner, ex.prizePool, 'full payout uses the whole pool');
  assert.equal(ex.final.champion + ex.final.runnerUp, ex.later.at(-1).amount);
});

test('King of the Hill guide example comes from the payout plan (16 players, $20)', () => {
  const ex = cashClimbGuideExample();
  const { details } = cashClimbNewPlayerGuide();
  assert.equal(ex.pool, 320);
  assert.equal(ex.rrBudget + ex.kohBudget, ex.pool);
  assert.equal(ex.championship + ex.kohMatchTotal, ex.kohBudget);
  assert.equal(Math.round((ex.podium.second + ex.podium.third) * 100) / 100, ex.podiumReserve);
  for (const r of ex.rr) assert.equal(r.bye, Math.floor(r.win / 2));
  assert.equal(details.roundRobin.example.rows.length, ex.rr.length);
  assert.deepEqual(details.roundRobin.example.rows[0], ['Round 1', String(ex.rr[0].matches), `$${ex.rr[0].win}`, `$${ex.rr[0].bye}`]);
  assert.equal(details.koth.example.rows.at(-1)[1], `$${ex.championship}*`);
});

test('Cash Climb detail examples show engine numbers', () => {
  const { details } = cashClimbV3Guide();
  const ex = cashClimbV3GuideExample();
  assert.deepEqual(details.opening.example.rows[0], ['5-0', '$20', '$0']);
  assert.deepEqual(details.championship.example.rows[1], ['Champion', `$${ex.final.champion}`]);
  assert.deepEqual(details.forfeit.example.rows[1], ['Semifinal', `$${ex.later[1].amount}`, `$${ex.half(ex.later[1].amount)}`]);
  assert.match(details.signup.example.rows[2][1], /^\$320/);
});
