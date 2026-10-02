import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAK_AND_RUN_GUIDE_HASH,
  guideExamples,
  guideSteps,
  isBreakAndRunGuidePath,
} from './breakAndRunGuide.js';

describe('breakAndRunGuide', () => {
  it('matches the official $500 pot examples', () => {
    const ex = guideExamples(500);
    assert.equal(ex.perBall, 50);
    assert.equal(ex.luckyBall, 10);
    const [quick, run, bust, early, final] = ex.items;
    assert.equal(quick.payout, 20);
    assert.equal(run.payout, 160);
    assert.equal(bust.bank, 160);
    assert.equal(bust.payout, 0);
    assert.equal(early.bank, 110);
    assert.equal(early.payout, 110 + Math.floor((500 - 110) * 0.25));
    assert.equal(final.payout, 500);
  });

  it('falls back to the example pot when there is no live pot', () => {
    assert.equal(guideExamples(0).pot, 500);
    assert.equal(guideExamples(null).pot, 500);
  });

  it('puts live values into the steps', () => {
    const steps = guideSteps({ memberFee: 10, openFee: 20, perBall: 37, luckyBall: 5 });
    assert.equal(steps.length, 5);
    assert.match(steps[2].body, /\$37/);
    assert.match(steps[1].body, /\$5/);
  });

  it('recognizes only the guide path', () => {
    assert.ok(isBreakAndRunGuidePath(BREAK_AND_RUN_GUIDE_HASH));
    assert.ok(!isBreakAndRunGuidePath('/tournament-bracket/break-and-run/view'));
  });
});
