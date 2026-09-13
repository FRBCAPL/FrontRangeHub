import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { usaplCaptainAuthMessage, usaplCaptainAuthReady } from './usaplCaptainAuth.js';

describe('usaplCaptainAuth', () => {
  it('blocks empty create-login fields', () => {
    assert.equal(usaplCaptainAuthReady('', ''), false);
    assert.equal(usaplCaptainAuthMessage('', ''), 'Email and password are required.');
  });

  it('allows a complete email and password', () => {
    assert.equal(usaplCaptainAuthReady('captain@league.com', 'secret1'), true);
    assert.equal(usaplCaptainAuthMessage('captain@league.com', 'secret1'), '');
  });
});
