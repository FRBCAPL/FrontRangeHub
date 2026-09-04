import React, { useState } from 'react';
import { startUsaplGoogleLogin, signInUsaplCaptain, signUpUsaplCaptain } from '../../services/usaplCaptainClaims.js';

export default function UsaplRosterAuthStep({ user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (user) {
    return (
      <p className="usapl-lede">
        Signed in as {user.email}. Pick your team next.
      </p>
    );
  }

  const run = async (action) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (err) {
      setMessage(err?.message || 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="usapl-lede">
        Create a login once. After the office approves you as captain, this login can update
        that team while it is active.
      </p>
      <div className="usapl-field">
        <label htmlFor="usapl-captain-email">Email</label>
        <input
          id="usapl-captain-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            run(() => signInUsaplCaptain(email, password));
          }}
        />
      </div>
      <div className="usapl-field">
        <label htmlFor="usapl-captain-password">Password</label>
        <input
          id="usapl-captain-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          minLength={6}
          required
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            run(() => signInUsaplCaptain(email, password));
          }}
        />
      </div>
      {message ? <div className="usapl-error">{message}</div> : null}
      <div className="usapl-actions" style={{ marginTop: 12 }}>
        <button
          className="usapl-btn"
          type="button"
          disabled={busy}
          onClick={() => run(() => signInUsaplCaptain(email, password))}
        >
          {busy ? 'Please wait…' : 'Sign in'}
        </button>
        <button
          className="usapl-btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => run(() => signUpUsaplCaptain(email, password))}
        >
          Create login
        </button>
      </div>
      <p className="usapl-note">
        Already have a Front Range Pool Google login?
        {' '}
        <button
          className="usapl-inline-link"
          type="button"
          disabled={busy}
          onClick={() => run(() => startUsaplGoogleLogin())}
        >
          Continue with Google
        </button>
      </p>
    </>
  );
}
