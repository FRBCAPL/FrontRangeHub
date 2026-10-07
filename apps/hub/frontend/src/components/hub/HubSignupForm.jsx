import React, { useState } from 'react';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', password: '' };

/** General FRPL account sign-up (no ladder). New accounts wait for admin approval before they can sign in. */
export default function HubSignupForm({ onBack }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

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
      <p className="hub-signup-alt">
        Prefer Google? Use the Google button on the Log in tab. Google sign-ups are approved the same way.
      </p>
      <button type="button" className="hub-signup-link" onClick={onBack}>Already have an account? Log in</button>
    </form>
  );
}
