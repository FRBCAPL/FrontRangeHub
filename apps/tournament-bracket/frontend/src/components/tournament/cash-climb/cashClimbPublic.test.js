import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbPublishErrorMessage, isCashClimbAuthError } from './cashClimbPublic.js';

describe('Cash Climb cloud save messages', () => {
  it('treats expired tokens as a sign-in problem', () => {
    assert.equal(isCashClimbAuthError({ message: 'JWT expired', status: 401 }), true);
    assert.match(
      cashClimbPublishErrorMessage({ message: 'JWT expired' }),
      /only on this tablet/i
    );
    assert.match(
      cashClimbPublishErrorMessage({ message: 'JWT expired' }),
      /Nothing you entered has been deleted/
    );
  });

  it('keeps a connection failure on the tablet', () => {
    assert.equal(isCashClimbAuthError({ message: 'Failed to fetch' }), false);
    assert.match(
      cashClimbPublishErrorMessage({ message: 'Failed to fetch' }),
      /still on this tablet/
    );
  });
});
