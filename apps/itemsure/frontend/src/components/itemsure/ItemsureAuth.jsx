import React, { useState } from 'react';
import { sendReset, signIn, signInWithGoogle, signUp } from '../../services/itemsureAuthService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY = {
  signin: { title: 'Sign in', submit: 'Sign in', busy: 'Signing in\u2026' },
  signup: { title: 'Create your account', submit: 'Create account', busy: 'Creating account\u2026' },
  forgot: { title: 'Reset your password', submit: 'Send reset link', busy: 'Sending\u2026' },
};

export default function ItemsureAuth({ initialMode = 'signin', initialError = '' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [notice, setNotice] = useState('');
  const { busy, error, setError, run } = useItemsureAction();
  const copy = COPY[mode];
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const switchTo = (next) => {
    setMode(next);
    setNotice('');
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    setNotice('');
    run(async () => {
      if (!EMAIL.test(form.email.trim())) throw new Error('Enter a valid email address.');
      if (mode === 'forgot') {
        await sendReset(form.email);
        setNotice('If an account uses that email, a reset link is on its way.');
        return;
      }
      if (mode === 'signin') {
        if (!form.password) throw new Error('Enter your password.');
        await signIn(form.email, form.password);
        return;
      }
      if (!form.fullName.trim()) throw new Error('Enter your name.');
      if (form.password.length < 8 || form.password.length > 72) throw new Error('Use a password between 8 and 72 characters.');
      if (form.password !== form.confirm) throw new Error('Those passwords do not match.');
      const result = await signUp(form);
      if (result.needsConfirm) setNotice('Check your email and open the confirmation link to finish.');
    });
  };

  return (
    <div className="isu-auth">
      <form className="isu-card isu-auth-card" onSubmit={submit} noValidate>
        <h1>{copy.title}</h1>
        {mode === 'signin' ? (
          <p className="isu-muted">Have an account with another app on this site? The same Google account or email and password work here.</p>
        ) : null}
        <ErrorNote message={error || initialError} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}

        {mode !== 'forgot' ? (
          <>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--block isu-google-btn" disabled={busy} onClick={() => run(signInWithGoogle)}>
              <span aria-hidden="true" className="isu-google-mark">G</span>
              Continue with Google
            </button>
            <p className="isu-auth-or"><span>or use email</span></p>
          </>
        ) : null}

        {mode === 'signup' ? (
          <Field label="Your name">
            <input value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={120} required />
          </Field>
        ) : null}
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" required />
        </Field>
        {mode !== 'forgot' ? (
          <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </Field>
        ) : null}
        {mode === 'signup' ? (
          <Field label="Confirm password">
            <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
          </Field>
        ) : null}

        <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
          {busy ? copy.busy : copy.submit}
        </button>

        <div className="isu-auth-links">
          {mode !== 'signin' ? <button type="button" className="isu-link" onClick={() => switchTo('signin')}>Sign in instead</button> : null}
          {mode !== 'signup' ? <button type="button" className="isu-link" onClick={() => switchTo('signup')}>Create an account</button> : null}
          {mode === 'signin' ? <button type="button" className="isu-link" onClick={() => switchTo('forgot')}>Forgot password?</button> : null}
        </div>
      </form>
    </div>
  );
}
