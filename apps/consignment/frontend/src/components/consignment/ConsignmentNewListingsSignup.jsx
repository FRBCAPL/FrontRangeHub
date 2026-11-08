import React, { useEffect, useState } from 'react';
import { loadNewListingEmails, saveNewListingEmails } from '../../services/consignmentAlertPrefsService.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';

/** Home page: "Email me when new items are listed". Hidden until the setting can load (SQL not run = hidden). */
export default function ConsignmentNewListingsSignup() {
  const [userId, setUserId] = useState(undefined);
  const [on, setOn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async (id) => {
      if (!alive) return;
      setUserId(id);
      setOn(id ? await loadNewListingEmails(id) : null);
    };
    currentUserId().then(load);
    const off = onAuthChange(load);
    return () => { alive = false; off(); };
  }, []);

  if (userId === undefined || (userId && on === null)) return null;

  const toggle = async () => {
    const next = !on;
    setBusy(true);
    setError('');
    try {
      await saveNewListingEmails(userId, next);
      setOn(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cs-home-signup" aria-labelledby="cs-home-signup-title">
      <span className="cs-home-signup-icon" aria-hidden="true">📬</span>
      <div className="cs-home-signup-text">
        <h2 id="cs-home-signup-title">{on ? 'You’re on the list' : 'Hear about new gear first'}</h2>
        <p>
          {on
            ? 'We’ll email you when new items are listed (at most once an hour).'
            : 'Get an email when new items hit the case or go up for auction. At most once an hour; turn it off anytime.'}
        </p>
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
      </div>
      {userId ? (
        <button type="button" className={on ? 'cs-btn-secondary' : 'cs-btn'} onClick={toggle} disabled={busy} aria-pressed={on}>
          {busy ? 'Saving…' : on ? 'Stop these emails' : 'Email me new listings'}
        </button>
      ) : (
        <button type="button" className="cs-btn" onClick={openHubLogin}>Log in to sign up</button>
      )}
    </section>
  );
}
