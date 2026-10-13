import React, { useState } from 'react';
import { offersResend, resendConfirmation, sendReset, signIn, signInWithGoogle, signUp } from '../../services/duezyAuthService.js';
import { SPORTS } from '../../data/duezyOptions.js';
import DuezyAuthPreview from './DuezyAuthPreview.jsx';
import DuezyAuthPricing from './DuezyAuthPricing.jsx';
import { money } from '../../utils/duezyMath.js';
import { monthlyPrice } from '../../utils/duezyPricing.js';

const MODES = { login: 'Log in', signup: 'Create account', reset: 'Reset password' };

export default function DuezyAuth({ initialError = '' }) {
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [canResend, setCanResend] = useState(false);

  const google = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
    setCanResend(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setCanResend(false);
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'signup') {
        const res = await signUp(email, password, name);
        if (res.needsConfirm) {
          setNotice('Check your email for a confirmation link, then come back and log in. (Look in spam too.)');
          setCanResend(true);
        }
      } else {
        await sendReset(email);
        setNotice('If that email has an account, a reset link is on its way.');
      }
    } catch (err) {
      setError(err.message);
      setCanResend(offersResend(err.message));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setBusy(true);
    setError('');
    try {
      await resendConfirmation(email);
      setNotice(`Sent another confirmation email to ${email.trim()}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dz-auth">
      <section className="dz-auth-pitch">
        <span className="dz-eyebrow">Free for 30 days · no card needed</span>
        <h1>League dues, <span className="dz-gradient-text">without the spreadsheet.</span></h1>
        <ul className="dz-features">
          <li><span className="dz-feature-icon">⚡</span><div><strong>Two-minute setup</strong><small>Name your league, set dues, paste your teams.</small></div></li>
          <li><span className="dz-feature-icon">✓</span><div><strong>One tap per team</strong><small>Paid, bye or not yet — every week, right from your phone.</small></div></li>
          <li><span className="dz-feature-icon">💬</span><div><strong>Friendly reminders</strong><small>See who owes and copy a ready-made message for the group chat.</small></div></li>
          <li><span className="dz-feature-icon">$</span><div><strong>Simple pricing</strong><small>30 days free, then from {money(monthlyPrice(1))}/month. Unlimited leagues — priced by division.</small></div></li>
        </ul>
        <div className="dz-sport-strip" aria-label="Works for any league">
          {SPORTS.slice(0, 8).map((s) => <span key={s.value} title={s.label}>{s.icon}</span>)}
        </div>
        <DuezyAuthPreview />
        <DuezyAuthPricing />
      </section>

      <form className="dz-card dz-auth-form" onSubmit={submit}>
        <div className="dz-tabs">
          <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => switchMode('signup')}>Create account</button>
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Log in</button>
        </div>

        {mode !== 'reset' ? (
          <>
            <button type="button" className="dz-btn dz-btn--google dz-btn--block" onClick={google} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
            <div className="dz-or"><span>or use email</span></div>
          </>
        ) : null}

        {mode === 'signup' ? (
          <label className="dz-field">
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </label>
        ) : null}

        <label className="dz-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>

        {mode !== 'reset' ? (
          <label className="dz-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>
        ) : null}

        {error ? <p className="dz-error">{error}</p> : null}
        {notice ? <p className="dz-notice">{notice}</p> : null}

        <button type="submit" className="dz-btn dz-btn--primary dz-btn--block" disabled={busy}>
          {busy ? 'One sec…' : MODES[mode]}
        </button>

        <div className="dz-auth-links">
          {canResend && mode !== 'reset' ? (
            <button type="button" className="dz-link" onClick={resend} disabled={busy}>Resend confirmation email</button>
          ) : null}
          {mode === 'login' ? (
            <button type="button" className="dz-link" onClick={() => switchMode('reset')}>Forgot password?</button>
          ) : null}
          {mode === 'reset' ? (
            <button type="button" className="dz-link" onClick={() => switchMode('login')}>Back to log in</button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
