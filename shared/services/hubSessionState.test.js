import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isHubSessionLive, hubAuthEventAction, profileFromSession } from './hubSessionState.js';

describe('hub session', () => {
  it('is live only when a user and a token exist', () => {
    assert.equal(isHubSessionLive(null), false);
    assert.equal(isHubSessionLive({ user: { email: 'a@b.com' } }), false);
    assert.equal(isHubSessionLive({
      access_token: 'tok',
      user: { email: 'a@b.com' },
    }), true);
    assert.equal(isHubSessionLive({
      refresh_token: 'refresh',
      user: { id: '1', email: 'a@b.com' },
    }), true);
  });

  it('keeps stored names and uses the session email', () => {
    const profile = profileFromSession(
      {
        access_token: 'tok',
        user: { email: 'guest@guestmail.com', user_metadata: { first_name: 'Guest' } },
      },
      { firstName: 'House', lastName: 'Tablet', userType: 'league' }
    );
    assert.equal(profile.email, 'guest@guestmail.com');
    assert.equal(profile.firstName, 'House');
    assert.equal(profile.lastName, 'Tablet');
    assert.equal(profile.pin, 'supabase-auth');
  });

  it('keeps a refresh as signed in and drops a fake leftover login', () => {
    const live = {
      access_token: 'tok',
      user: { email: 'a@b.com' },
    };
    assert.equal(hubAuthEventAction('TOKEN_REFRESHED', live), 'session');
    assert.equal(hubAuthEventAction('TOKEN_REFRESHED', null), 'ignore');
    assert.equal(hubAuthEventAction('INITIAL_SESSION', null), 'signed-out');
    assert.equal(hubAuthEventAction('SIGNED_OUT', null), 'signed-out');
    assert.equal(hubAuthEventAction('PASSWORD_RECOVERY', null), 'ignore');
    assert.equal(hubAuthEventAction('INITIAL_SESSION', live), 'session');
  });
});
