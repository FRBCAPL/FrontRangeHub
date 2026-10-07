import React, { useState } from 'react';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', password: '' };

/** General FRPL account sign-up (no ladder). New accounts wait for admin approval before they can sign in. */
export default function HubSignupForm({ onBack, returnTo = '/' }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const signUpWithGoogle = async () => {
    setBusy(true);
    setError('');
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    localStorage.setItem('oauthReturnTo', returnTo);
    localStorage.setItem('oauthReturnExact', '1');
    const result = await supabaseAuthService.signInWithOAuth('google');
    if (!result?.success) {
      setBusy(false);
      setError(result?.message || 'Google sign-up failed. Please try again.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password } = form;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and a password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await supabaseDataService.createNewPlayerSignup({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: form.phone.trim(),
      password,
      joinLadder: false,
    });
    setBusy(false);
    if (result.success) setDone(result.message || 'Account created. FRPL will approve it shortly.');
    else setError(result.error || 'Sign-up failed. Please try again.');
  };

  if (done) {
    return (
      <div className="hub-signup">
        <p className="hub-signup-done">{done}</p>
        <button type="button" className="hub-signup-btn" onClick={onBack}>Back to log in</button>
      </div>
    );
  }

  return (
    <form className="hub-signup" onSubmit={submit}>
      <p className="hub-signup-intro">
        One account for everything on Front Range Pool. FRPL approves new accounts before you can sign in.
      </p>
      <button type="button" className="hub-signup-google" onClick={signUpWithGoogle} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Sign up with Google
      </button>
      <p className="hub-signup-or"><span>or use your email</span></p>
      <div className="hub-signup-row">
        <label>
          First name
          <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
        </label>
      </div>
      <label>
        Email
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
      </label>
      <label>
        <span>Phone <span className="hub-signup-optional">(optional)</span></span>
        <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      </label>
      <label>
        <span>Password <span className="hub-signup-optional">(8+ characters)</span></span>
        <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required />
      </label>
      {error ? <p className="hub-signup-error">{error}</p> : null}
      <button type="submit" className="hub-signup-btn" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <button type="button" className="hub-signup-link" onClick={onBack}>Already have an account? Log in</button>
    </form>
  );
}
