import test from 'node:test';
import assert from 'node:assert/strict';
import { canEdit, inviteMessage, isOwner, looksLikeEmail, roleLabel } from './duezyPeople.js';

test('who can change things', () => {
  assert.equal(canEdit('owner'), true);
  assert.equal(canEdit('treasurer'), true);
  assert.equal(canEdit('viewer'), false);
  assert.equal(canEdit(undefined), true);
  assert.equal(isOwner('treasurer'), false);
  assert.equal(roleLabel('viewer'), 'Viewer');
});

test('invite text names the league, what they can do, and where to sign in', () => {
  const text = inviteMessage({ leagueName: 'Front Range', role: 'viewer', appUrl: 'https://x.com/#/duezy' });
  assert.match(text, /Front Range/);
  assert.match(text, /see our dues/);
  assert.match(text, /https:\/\/x\.com\/#\/duezy/);
});

test('email shape check', () => {
  assert.equal(looksLikeEmail(' amy@x.com '), true);
  assert.equal(looksLikeEmail('amy@x'), false);
});
