import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashClimbListErrorMessage, cashClimbPublishErrorMessage, isCashClimbAuthError } from './cashClimbPublic.js';

describe('cash climb public cloud errors', () => {
  it('treats expired hub sessions as auth failures', () => {
    assert.equal(isCashClimbAuthError({ message: 'JWT expired', code: 'PGRST301' }), true);
    assert.equal(isCashClimbAuthError({ message: 'column game_type does not exist' }), false);
  });

  it('tells the director to sign in again when publish is rejected', () => {
    assert.match(
      cashClimbPublishErrorMessage({ message: 'JWT expired' }),
      /Sign in again/
    );
  });

  it('does not pretend an auth failure is an empty tournament list', () => {
    assert.match(
      cashClimbListErrorMessage({ message: 'JWT expired' }),
      /Could not load live events/
    );
  });
});
