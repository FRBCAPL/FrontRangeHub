import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { frusaplHostRedirectHash } from './frusaplHostRedirect.js';

describe('frusaplHostRedirectHash', () => {
  it('sends a bare live domain visit to the league app', () => {
    assert.equal(frusaplHostRedirectHash('www.frusapl.com', '/', ''), '#/usapl');
    assert.equal(frusaplHostRedirectHash('frusapl.com', '/', ''), '#/usapl');
  });

  it('does not steal ladder or Google auth return', () => {
    assert.equal(frusaplHostRedirectHash('www.frusapl.com', '/', '#/ladder'), null);
    assert.equal(frusaplHostRedirectHash('www.frusapl.com', '/', '#/auth/callback'), null);
    assert.equal(frusaplHostRedirectHash('www.frusapl.com', '/', '#/auth/callback?code=abc'), null);
    assert.equal(frusaplHostRedirectHash('www.frusapl.com', '/', '#access_token=abc'), null);
  });

  it('does not run on localhost', () => {
    assert.equal(frusaplHostRedirectHash('localhost', '/', ''), null);
  });
});
