import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { breakAndRunTvFitClass } from './useBreakAndRunTvFit.js';

describe('break and run TV fit classes', () => {
  it('builds adaptive class names from fit flags', () => {
    assert.equal(breakAndRunTvFitClass({}), 'bnr-tv');
    assert.equal(
      breakAndRunTvFitClass({ tall: true, short: false, narrow: true, tiny: false }),
      'bnr-tv bnr-tv-is-tall bnr-tv-is-narrow',
    );
    assert.equal(
      breakAndRunTvFitClass({ tall: false, short: true, narrow: false, tiny: true }),
      'bnr-tv bnr-tv-is-short bnr-tv-is-tiny',
    );
  });
});
