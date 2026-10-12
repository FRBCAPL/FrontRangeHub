import React, { useState } from 'react';
import { extendTrial, setComp } from '../../services/duezyAdminService.js';
import { accountPhase } from '../../utils/duezyAdminStats.js';

const TRIAL_OPTIONS = [7, 14, 30, 60];

/** Comp on/off and trial extension. Every change is written to the admin audit log with the reason. */
export default function DuezyAdminActions({ account, onChanged }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const phase = accountPhase(account);
  const isComp = phase === 'comp';
  const hasStripe = Boolean(account.subscription?.stripe_subscription_id);

  const run = async (key, fn, done) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(done);
      setReason('');
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const toggleComp = () => {
    const on = !isComp;
    if (on && hasStripe && !window.confirm('They have a Stripe plan that will keep billing. Comp anyway? (Cancel the plan in Stripe afterwards.)')) return;
    run('comp', () => setComp(account.owner_id, on, reason), on ? 'Account is now free.' : 'Comp removed — normal billing rules apply again.');
  };

  return (
    <section className="dz-panel dz-stack">
      <h2 className="dz-h3">Access</h2>
      <label className="dz-field">
        <span>Reason <em className="dz-muted">(saved in the history)</em></span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. League partner, support make-good" />
      </label>

      <div className="dz-admin-action">
        <div>
          <strong>{isComp ? 'Free account' : 'Make this account free'}</strong>
          <p className="dz-small dz-muted">
            {isComp
              ? 'No trial limits, no plan needed. Remove to go back to trial / plan rules.'
              : 'Unlimited divisions, never locked, no plan needed.'}
          </p>
        </div>
        <button type="button" className={`dz-btn dz-btn--sm ${isComp ? 'dz-btn--ghost' : 'dz-btn--primary'}`} onClick={toggleComp} disabled={Boolean(busy)}>
          {busy === 'comp' ? 'Saving…' : isComp ? 'Remove comp' : 'Comp account'}
        </button>
      </div>

      {!isComp && !hasStripe ? (
        <div className="dz-admin-action">
          <div>
            <strong>Extend free trial</strong>
            <p className="dz-small dz-muted">Adds days from today or from the current trial end, whichever is later. Unlocks a locked account.</p>
          </div>
          <span className="dz-row">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days to add">
              {TRIAL_OPTIONS.map((n) => <option key={n} value={n}>+{n} days</option>)}
            </select>
            <button
              type="button"
              className="dz-btn dz-btn--primary dz-btn--sm"
              onClick={() => run('trial', () => extendTrial(account.owner_id, days, reason), `Trial extended by ${days} days.`)}
              disabled={Boolean(busy)}
            >
              {busy === 'trial' ? 'Saving…' : 'Extend'}
            </button>
          </span>
        </div>
      ) : null}
      {hasStripe && !isComp ? <p className="dz-small dz-muted">They pay through Stripe — change trials, refunds or cancellations in the Stripe dashboard.</p> : null}

      {error ? <p className="dz-error">{error}</p> : null}
      {notice ? <p className="dz-notice">{notice}</p> : null}
    </section>
  );
}
