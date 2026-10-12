import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { finalizeCheckout, getBillingConfig, openPortal, startCheckout } from '../../services/duezyBillingService.js';
import { money } from '../../utils/duezyMath.js';
import { PLAN_ROWS, TRIAL_DAYS, TRIAL_DIVISIONS, priceFor } from '../../utils/duezyPricing.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyPlanStatus from './DuezyPlanStatus.jsx';
import DuezyPlanBreakdown from './DuezyPlanBreakdown.jsx';

export default function DuezyPlanPage() {
  const { access, refresh } = useDuezyBilling();
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [interval, setBillingInterval] = useState('month');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { getBillingConfig().then(setConfig).catch(() => setConfig({ configured: false })); }, []);

  useEffect(() => {
    const outcome = params.get('billing');
    const sessionId = params.get('session_id');
    if (!outcome) return;
    setParams({}, { replace: true });
    if (outcome === 'cancel') { setNotice('No changes made.'); return; }
    if (outcome === 'success' && sessionId) {
      setNotice('Finishing up…');
      finalizeCheckout(sessionId)
        .then(() => setNotice('You’re all set — thanks for subscribing!'))
        .catch(() => setNotice('Payment received. Your plan will show here in a minute.'))
        .finally(refresh);
    } else if (outcome === 'portal') {
      refresh();
    }
  }, [params, setParams, refresh]);

  const go = async (action) => {
    setBusy(true);
    setError('');
    try {
      const { url } = await action();
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const used = Math.max(1, Number(access?.divisions_used) || 1);
  const subscribed = access?.has_subscription || access?.phase === 'comp';
  const ready = config?.configured;

  return (
    <div className="dz-stack dz-stack--lg dz-plan">
      <Link to={DUEZY_PATH} className="dz-link dz-small">‹ All leagues</Link>
      <div>
        <span className="dz-eyebrow">Billing</span>
        <h1 className="dz-h1">Simple pricing, by division</h1>
        <p className="dz-muted">
          Every account starts with {TRIAL_DAYS} days free for up to {TRIAL_DIVISIONS} divisions — no card needed.
          Unlimited leagues; you only pay for divisions.
        </p>
      </div>

      {notice ? <p className="dz-notice">{notice}</p> : null}
      <DuezyPlanStatus access={access} />
      <DuezyPlanBreakdown />

      <section className="dz-card dz-stack">
        <div className="dz-row">
          <h2 className="dz-h3">Plans</h2>
          {config?.yearly ? (
            <div className="dz-segment dz-segment--sm" role="radiogroup" aria-label="Billing period">
              <button type="button" role="radio" aria-checked={interval === 'month'} className={interval === 'month' ? 'is-active' : ''} onClick={() => setBillingInterval('month')}>Monthly</button>
              <button type="button" role="radio" aria-checked={interval === 'year'} className={interval === 'year' ? 'is-active' : ''} onClick={() => setBillingInterval('year')}>Yearly · 2 months free</button>
            </div>
          ) : null}
        </div>
        <ul className="dz-plan-rows">
          {PLAN_ROWS.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <strong>
                {r.plus ? '+' : ''}{money(interval === 'year' ? r.monthly * 10 : r.monthly)}
                <small>/{interval === 'year' ? 'yr' : 'mo'}</small>
              </strong>
            </li>
          ))}
        </ul>
        <div className="dz-plan-yours">
          <span>You have <strong>{used}</strong> {used === 1 ? 'division' : 'divisions'} in total</span>
          <strong>{money(priceFor(used, interval))}<small>/{interval === 'year' ? 'yr' : 'mo'}</small></strong>
        </div>
        <p className="dz-small dz-muted">Your bill follows your divisions automatically — add or archive one and it adjusts. Cancel anytime.</p>

        {error ? <p className="dz-error">{error}</p> : null}

        {subscribed ? (
          access?.phase === 'comp' ? null : (
            <button type="button" className="dz-btn dz-btn--ghost" onClick={() => go(openPortal)} disabled={busy}>
              {busy ? 'Opening…' : 'Manage billing (card, invoices, cancel)'}
            </button>
          )
        ) : (
          <button type="button" className="dz-btn dz-btn--primary" onClick={() => go(() => startCheckout(interval))} disabled={busy || !ready}>
            {busy ? 'Opening checkout…' : ready ? `Start plan · ${money(priceFor(used, interval))}/${interval === 'year' ? 'yr' : 'mo'}` : 'Plans open soon'}
          </button>
        )}
        {!subscribed && access?.phase === 'trial' ? (
          <p className="dz-small dz-muted">Subscribing now won’t charge you until your free trial ends.</p>
        ) : null}
      </section>
    </div>
  );
}
