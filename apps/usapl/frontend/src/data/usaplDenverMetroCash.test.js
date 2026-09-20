import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDenverMetroCash, usaplMetroLines } from './usaplDenverMetroCash.js';

describe('usaplDenverMetroCash', () => {
  it('only matches the Denver Metro cash night', () => {
    assert.equal(isDenverMetroCash({ id: 'denver-metro-cash' }), true);
    assert.equal(isDenverMetroCash({ id: 'nay-nays' }), false);
  });

  it('turns line breaks into separate lines', () => {
    assert.deepEqual(usaplMetroLines('into the\nFinish Strong'), ['into the', 'Finish Strong']);
    assert.deepEqual(usaplMetroLines('into the<br>Finish Strong'), ['into the', 'Finish Strong']);
  });
});
