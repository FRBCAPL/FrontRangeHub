import React, { useEffect, useState } from 'react';
import {
  getEstateBillingStatus,
  startEstateCheckout,
  openEstateBillingPortal,
  finalizeEstateCheckout
} from '@shared/services/estateBillingService.js';
import {
  ESTATE_BILLING_PLAN,
  billingPhaseLabel,
  billingBannerTone,
  billingDaysPhrase,
  formatBillingMoney,
  isBillingLocked
} from '@shared/utils/estateBilling.js';

/**
 * PR billing status + renew CTAs. Shows on home when trial/grace/locked;
 * always usable from Settings.
 */
const EstateBillingBanner = ({
  caseNumber,
  refreshKey = 0,
  compact = false,
  forceShow = false,
  onStatus,
  onMessage
}) => {
  const [access, setAccess] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!caseNumber) return;
    setError('');
    const result = await getEstateBillingStatus(caseNumber);
    if (!result.success) {
      // Migration / backend not ready — stay quiet unless forceShow.
      if (forceShow) setError(result.error || 'Could not load billing.');
      setAccess(null);
      onStatus?.(null);
      return;
    }
    setAccess(result.data);
    onStatus?.(result.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber, refreshKey]);

  useEffect(() => {
    if (!caseNumber || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const billing = params.get('billing');
    const sessionId = params.get('session_id');
    if (billing === 'success' && sessionId) {
      (async () => {
        setBusy('confirm');
        const finalized = await finalizeEstateCheckout({ caseNumber, sessionId });
        setBusy('');
        if (finalized.success) {
          onMessage?.('Subscription activated. Thank you.');
          await load();
        } else {
          onMessage?.(finalized.error || 'Could not confirm payment yet — try Manage billing in a moment.');
        }
        // Clean query from hash without full reload.
        const base = window.location.hash.split('?')[0];
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${base}`);
      })();
    } else if (billing === 'cancel') {
      onMessage?.('Checkout cancelled — your trial or grace status is unchanged.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber]);

  if (!access && !error) {
    return forceShow ? <p className="ei-settings-hint">Loading billing…</p> : null;
  }
  if (!access) {
    return forceShow && error ? <div className="ei-error">{error}</div> : null;
  }

  const phase = access.phase;
  const tone = billingBannerTone(phase);
  const show =
    forceShow ||
    phase === 'trial' ||
    phase === 'grace' ||
    phase === 'locked' ||
    access.cancel_at_period_end;
  if (!show) return null;

  const days = billingDaysPhrase(access.days_remaining);
  const locked = isBillingLocked(access);
  const price = formatBillingMoney(access.amount_cents || ESTATE_BILLING_PLAN.amountCents);

  const renew = async () => {
    setBusy('checkout');
    setError('');
    const result = await startEstateCheckout(caseNumber);
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Could not start checkout.');
      return;
    }
    if (result.data?.url) {
      window.location.href = result.data.url;
      return;
    }
    setError('Checkout URL missing.');
  };

  const portal = async () => {
    setBusy('portal');
    setError('');
    const result = await openEstateBillingPortal(caseNumber);
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Could not open billing portal.');
      return;
    }
    if (result.data?.url) {
      window.location.href = result.data.url;
      return;
    }
    setError('Portal URL missing.');
  };

  return (
    <section
      className={`ei-billing-banner is-${tone}${compact ? ' is-compact' : ''}${locked ? ' is-locked' : ''}`}
      aria-label="Estate Vault billing"
    >
      <div className="ei-billing-banner-copy">
        <strong>
          {billingPhaseLabel(phase)}
          {days ? ` · ${days}` : ''}
        </strong>
        <p>
          {locked
            ? access.message ||
              `This estate is paused. Renew Estate Vault (${price}/mo) to reopen Personal Representative, family, helper, and auction access.`
            : phase === 'grace'
              ? access.message ||
                `Renew now (${price}/mo) to avoid locking family, helpers, and the public sale.`
              : phase === 'trial'
                ? `${ESTATE_BILLING_PLAN.trialDays}-day free trial on your first estate. After trial: ${price}/mo. Additional estates bill from day one (${price}/mo, short grace to subscribe).`
                : access.message || `${ESTATE_BILLING_PLAN.name} · ${price}/${access.interval || 'month'}`}
        </p>
        {error ? <div className="ei-error">{error}</div> : null}
      </div>
      <div className="ei-billing-banner-actions">
        {(phase === 'trial' || phase === 'grace' || locked) && access.checkoutReady !== false ? (
          <button
            type="button"
            className="ei-btn ei-btn-small"
            disabled={Boolean(busy)}
            onClick={renew}
          >
            {busy === 'checkout' || busy === 'confirm' ? 'Working…' : `Subscribe · ${price}/mo`}
          </button>
        ) : null}
        {access.stripe_customer_id || phase === 'active' ? (
          <button
            type="button"
            className="ei-btn ei-btn-small ei-btn-secondary"
            disabled={Boolean(busy)}
            onClick={portal}
          >
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default EstateBillingBanner;
