import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbPlayerRules } from './cashClimbPlayerRules.js';
import { cashClimbNewPlayerGuide } from './cashClimbNewPlayerGuide.js';
import { CASH_CLIMB_GUIDE_HASH, cashClimbGuideHref, cashClimbGuideTvHref, isCashClimbGuideTv } from './cashClimbGuideRoute.js';

describe('cash climb player rules', () => {
  it('uses live game, fee, and races when a tournament is passed', () => {
    const rules = cashClimbPlayerRules({
      gameType: '9-Ball',
      entryFee: 25,
      raceTo: 1,
      kohRaceTo: 3,
    });
    assert.equal(rules.gameType, '9-Ball');
    assert.equal(rules.entryFee, 25);
    assert.equal(rules.rrRaceLabel, '1 game');
    assert.equal(rules.kohRaceLabel, 'race to 3');
    assert.match(rules.sections[0].body[0], /9-Ball/);
    assert.match(rules.sections[0].body[0], /CSI/);
    assert.match(rules.sections[0].body.join(' '), /No 9 on the break/);
    assert.doesNotMatch(rules.sections[0].body.join(' '), /no modifications/);
    assert.match(rules.sections[1].body[0], /1 game/);
    assert.match(rules.sections[2].body[1], /race to 3/);
  });

  it('covers both phases, money, and how to read the board', () => {
    const titles = cashClimbPlayerRules().sections.map((s) => s.title);
    assert.deepEqual(titles, ['The night', 'Round robin', 'King of the Hill', 'Money', 'The board']);
  });

  it('keeps a general new-player guide that does not follow tonight\'s event', () => {
    const guide = cashClimbNewPlayerGuide();
    const tonight = cashClimbPlayerRules({ gameType: '9-Ball', raceTo: 4, kohRaceTo: 5, entryFee: 25 });
    const guideText = guide.sections.flatMap((s) => s.body).join(' ');
    assert.equal(guide.title, 'How Cash Climb works');
    assert.ok(guide.sections.length >= 4);
    assert.match(tonight.sections[0].body[0], /9-Ball/);
    assert.match(tonight.sections[1].body[0], /race to 4/);
    assert.doesNotMatch(guideText, /race to 4/);
    assert.doesNotMatch(guideText, /race to 5/);
    assert.doesNotMatch(guideText, /\$25/);
  });

  it('exposes a public how-it-works hash route', () => {
    assert.equal(CASH_CLIMB_GUIDE_HASH, '/tournament-bracket/how-it-works');
    assert.match(cashClimbGuideHref(), /#\/tournament-bracket\/how-it-works$/);
    assert.match(cashClimbGuideTvHref(), /#\/tournament-bracket\/how-it-works\?tv=1$/);
    assert.equal(isCashClimbGuideTv('?tv=1'), true);
    assert.equal(isCashClimbGuideTv(''), false);
  });
});
