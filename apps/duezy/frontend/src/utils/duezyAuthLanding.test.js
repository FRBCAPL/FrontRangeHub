import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duezyAuthLandingTarget, duezyAuthPayload, duezyRecoveryFromHash } from './duezyAuthLanding.js';

test('payload from the three landing shapes', () => {
  assert.equal(duezyAuthPayload('#access_token=a&refresh_token=b'), 'access_token=a&refresh_token=b');
  assert.equal(duezyAuthPayload('#/duezy/oauth#access_token=a'), 'access_token=a');
  assert.equal(duezyAuthPayload('#/duezy/oauth?access_token=a'), 'access_token=a');
  assert.equal(duezyAuthPayload('#/duezy'), '');
});

test('rewrites only while the Duezy flag is set', () => {
  assert.equal(duezyAuthLandingTarget('#access_token=a&refresh_token=b', true), '#/duezy/oauth?access_token=a&refresh_token=b');
  assert.equal(duezyAuthLandingTarget('#access_token=a', false), '');
  assert.equal(duezyAuthLandingTarget('#/duezy/oauth?access_token=a', true), '');
  assert.equal(duezyAuthLandingTarget('#/ladder', true), '');
  assert.equal(duezyAuthLandingTarget('#error=access_denied&error_description=x', true), '#/duezy/oauth?error=access_denied&error_description=x');
});

test('a password-reset landing is never treated as a Google sign-in', () => {
  assert.equal(duezyAuthLandingTarget('#/duezy#access_token=a&refresh_token=b&type=recovery', true), '');
});

test('a Duezy reset that fell back to the site root is moved to #/duezy', () => {
  assert.equal(duezyAuthLandingTarget('#access_token=a&refresh_token=b&type=recovery', false, true), '#/duezy#access_token=a&refresh_token=b&type=recovery');
  assert.equal(duezyAuthLandingTarget('#error=access_denied&error_code=otp_expired&error_description=x', false, true), '#/duezy#error=access_denied&error_code=otp_expired&error_description=x');
  assert.equal(duezyAuthLandingTarget('#access_token=a&refresh_token=b&type=recovery', false, false), '');
  assert.equal(duezyAuthLandingTarget('#/reset-password#access_token=a&type=recovery', false, true), '');
  assert.equal(duezyAuthLandingTarget('#/duezy#access_token=a&type=recovery', false, true), '');
  assert.equal(duezyAuthLandingTarget('#access_token=a&refresh_token=b', false, true), '');
});

test('password-reset landing', () => {
  assert.deepEqual(
    duezyRecoveryFromHash('#/duezy#access_token=a&expires_in=3600&refresh_token=b&token_type=bearer&type=recovery'),
    { access_token: 'a', refresh_token: 'b' }
  );
  assert.deepEqual(duezyRecoveryFromHash('#access_token=a&refresh_token=b&type=recovery'), { access_token: 'a', refresh_token: 'b' });
  assert.deepEqual(
    duezyRecoveryFromHash('#/duezy#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),
    { error: 'Email link is invalid or has expired' }
  );
  assert.deepEqual(duezyRecoveryFromHash('#/duezy#access_token=a&type=recovery'), { error: 'That reset link is incomplete.' });
  assert.equal(duezyRecoveryFromHash('#/duezy'), null);
  assert.equal(duezyRecoveryFromHash('#/duezy/oauth?access_token=a&refresh_token=b'), null);
  assert.equal(duezyRecoveryFromHash('#/duezy?auth=login'), null);
});
