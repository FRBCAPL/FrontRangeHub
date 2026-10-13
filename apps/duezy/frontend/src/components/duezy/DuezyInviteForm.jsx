import React, { useState } from 'react';
import { invitePerson } from '../../services/duezyPeopleService.js';
import { ROLES, inviteMessage, looksLikeEmail } from '../../utils/duezyPeople.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** Owner adds someone by email, then gets a ready-to-send note telling them where to sign in. */
export default function DuezyInviteForm({ league, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('treasurer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!looksLikeEmail(email)) {
      setError('Enter their email address.');
      return;
    }
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const target = email.trim().toLowerCase();
      const status = await invitePerson(league.id, target, role);
      const appUrl = `${window.location.origin}/#${DUEZY_PATH}`;
      setSent({ email: target, status, text: inviteMessage({ leagueName: league.name, role, appUrl }) });
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sent.text);
      setCopied(true);
    } catch { /* the text is selectable in the box */ }
  };

  return (
    <div className="dz-stack">
      <form className="dz-people-invite" onSubmit={submit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email address" maxLength={254} aria-label="Email to add" />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy}>{busy ? 'Adding…' : 'Add person'}</button>
      </form>
      <p className="dz-small dz-muted">{ROLES.find((r) => r.id === role)?.hint}. They need a free Duezy login with this exact email; it doesn't use your plan's divisions.</p>
      {error ? <p className="dz-error">{error}</p> : null}

      {sent ? (
        <div className="dz-notice dz-stack dz-people-share">
          <span>
            {sent.status === 'updated'
              ? `${sent.email} is already on this league — role updated.`
              : `${sent.email} is invited. Duezy doesn't email them, so send this:`}
          </span>
          {sent.status === 'updated' ? null : (
            <>
              <textarea className="dz-textarea" readOnly rows={3} value={sent.text} />
              <div className="dz-row dz-row--start">
                <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button>
                <a
                  className="dz-btn dz-btn--ghost dz-btn--sm"
                  href={`mailto:${encodeURIComponent(sent.email)}?subject=${encodeURIComponent(`${league.name} on Duezy`)}&body=${encodeURIComponent(sent.text)}`}
                >
                  Open in email
                </a>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
