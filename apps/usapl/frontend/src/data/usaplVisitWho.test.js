import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { visitIsMine, visitWhoKey, visitWhoLabel } from './usaplVisitWho.js';

describe('usaplVisitWho', () => {
  it('treats the same Google email as you on another browser', () => {
    const row = { visitor_id: 'phone', visitor_email: 'Admin@League.com' };
    assert.equal(visitIsMine(row, 'desktop', 'admin@league.com'), true);
    assert.equal(visitWhoLabel(row, true), 'You');
  });

  it('shows a signed-in visitor email instead of someone else', () => {
    const row = { visitor_id: 'abc', visitor_email: 'player@gmail.com' };
    assert.equal(visitIsMine(row, 'me', 'admin@league.com'), false);
    assert.equal(visitWhoLabel(row, false), 'player@gmail.com');
    assert.equal(visitWhoKey(row), 'player@gmail.com');
  });

  it('labels unsigned visits as guest', () => {
    const row = { visitor_id: 'xyz' };
    assert.equal(visitWhoLabel(row, false), 'Guest');
    assert.equal(visitWhoKey(row), 'xyz');
  });
});
