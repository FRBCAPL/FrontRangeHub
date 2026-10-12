import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duezyAuthLandingTarget, duezyAuthPayload } from './duezyAuthLanding.js';

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
