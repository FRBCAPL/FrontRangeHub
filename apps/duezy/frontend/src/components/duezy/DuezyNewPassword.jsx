import React, { useState } from 'react';
import { updatePassword } from '../../services/duezyAuthService.js';
import DuezyModal from './DuezyModal.jsx';

/** After a password-reset link: the user is signed in with the link; this saves their new password. */
export default function DuezyNewPassword({ email, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password needs at least 6 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DuezyModal title={done ? 'Password saved' : 'Choose a new password'} onClose={onClose} className="dz-auth-modal">
      {done ? (
        <div className="dz-auth-form">
          <p className="dz-notice">You’re signed in{email ? ` as ${email}` : ''}. Use your new password next time you log in.</p>
          <button type="button" className="dz-btn dz-btn--primary dz-btn--block" onClick={onClose}>Continue</button>
        </div>
      ) : (
        <form className="dz-auth-form" onSubmit={submit}>
          {email ? <p className="dz-small dz-muted">For {email}</p> : null}
          <label className="dz-field">
            <span>New password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required autoFocus />
          </label>
          <label className="dz-field">
            <span>Type it again</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required />
          </label>
          {error ? <p className="dz-error">{error}</p> : null}
          <button type="submit" className="dz-btn dz-btn--primary dz-btn--block" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </DuezyModal>
  );
}
