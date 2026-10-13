import React, { useState } from 'react';
import { openPortal, startCheckout } from '../../services/duezyBillingService.js';
import { money } from '../../utils/duezyMath.js';
import { atCap, capFor, monthlyPrice, priceFor } from '../../utils/duezyPricing.js';

/** "Your price" card on the plan page: billing period, what this account pays, and the Stripe button. */
export default function DuezyPlanCheckout({ access, config, used, interval, onInterval }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  const subscribed = access?.has_subscription || access?.phase === 'comp';
  const ready = config?.configured;
  const per = interval === 'year' ? 'yr' : 'mo';
  const price = priceFor(used, interval);
  const saved = monthlyPrice(used) * 2;

  return (
    <section className="dz-card dz-plan-checkout">
      <div className="dz-plan-checkout-head">
        <span className="dz-eyebrow">Your price</span>
        {config?.yearly ? (
          <div className="dz-segment dz-segment--sm" role="radiogroup" aria-label="Billing period">
            <button type="button" role="radio" aria-checked={interval === 'month'} className={interval === 'month' ? 'is-active' : ''} onClick={() => onInterval('month')}>Monthly</button>
            <button type="button" role="radio" aria-checked={interval === 'year'} className={interval === 'year' ? 'is-active' : ''} onClick={() => onInterval('year')}>Yearly</button>
          </div>
        ) : null}
      </div>

      <p className="dz-plan-price">
        <strong>{money(price)}</strong><small>/{per}</small>
      </p>
      <p className="dz-small dz-muted">
        For your <strong>{used}</strong> {used === 1 ? 'division' : 'divisions'}, across all your leagues.
        {interval === 'year' ? <span className="dz-plan-save"> 2 months free — save {money(saved)}</span> : null}
      </p>
      {atCap(used) ? (
        <p className="dz-small dz-plan-save">You’ve reached the {money(capFor(interval))}/{per} cap — add as many divisions as you like.</p>
      ) : null}

      {error ? <p className="dz-error">{error}</p> : null}

      {subscribed ? (
        access?.phase === 'comp' ? null : (
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--block" onClick={() => go(openPortal)} disabled={busy}>
            {busy ? 'Opening…' : 'Manage billing (card, invoices, cancel)'}
          </button>
        )
      ) : (
        <button type="button" className="dz-btn dz-btn--primary dz-btn--block" onClick={() => go(() => startCheckout(interval))} disabled={busy || !ready}>
          {busy ? 'Opening checkout…' : ready ? `Start plan · ${money(price)}/${per}` : 'Plans open soon'}
        </button>
      )}
      {!subscribed && access?.phase === 'trial' ? (
        <p className="dz-small dz-muted">Subscribing now won’t charge you until your free trial ends.</p>
      ) : null}
      <p className="dz-small dz-muted">Your bill follows your divisions — add or archive divisions and it adjusts, never above {money(capFor(interval))}/{per}. Cancel anytime.</p>
    </section>
  );
}
