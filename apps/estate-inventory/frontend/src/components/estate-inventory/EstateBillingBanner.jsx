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
  billingPricePhrase,
  isBillingLocked,
  shouldShowHomeBillingBanner,
  frozenEstateBannerMessage
} from '@shared/utils/estateBilling.js';
import { ESTATE_LEGAL_PAGES } from '@shared/utils/estateLegalPages.js';

/**
 * PR billing status + renew CTAs.
 * Home: trial / grace / locked only (hidden after subscribe).
 * Settings: pass forceShow.
 */
const EstateBillingBanner = ({
  caseNumber,
  refreshKey = 0,
  compact = false,
  forceShow = false,
  sharedAccess = undefined,
  onStatus,
  onMessage
}) => {
  const [access, setAccess] = useState(
    sharedAccess !== undefined ? sharedAccess : null
  );
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!caseNumber) return;
    setError('');
    const result = await getEstateBillingStatus(caseNumber);
    if (!result.success) {
      if (forceShow) setError(result.error || 'Could not load billing.');
      setAccess(null);
      onStatus?.(null);
      return;
    }
    setAccess(result.data);
    onStatus?.(result.data);
  };

  useEffect(() => {
    if (sharedAccess !== undefined) {
      setAccess(sharedAccess);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber, refreshKey, sharedAccess]);

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
          onMessage?.(
            finalized.error ||
              'Could not confirm payment yet — try Manage subscription in the Menu.'
          );
        }
        const base = window.location.hash.split('?')[0];
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${base}`
        );
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
  const show = forceShow || shouldShowHomeBillingBanner(access);
  if (!show) return null;

  const days = billingDaysPhrase(access.days_remaining);
  const locked = isBillingLocked(access);
  const price = billingPricePhrase({ compact: true });
  const priceMonth = billingPricePhrase();

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

  const bodyCopy = locked
    ? frozenEstateBannerMessage(access, price)
    : phase === 'grace'
      ? access.message ||
        `Renew now (${price}) to avoid freezing this estate — family, helpers, and the public sale will pause.`
      : phase === 'trial'
        ? `Free trial · first estate only. Subscribe now to put a card on file — $0 due today through the trial. After trial: ${price}. Extra estates bill from day one.`
        : access.cancel_at_period_end
          ? `Subscription cancels at period end. You can resume anytime from Manage subscription in the Menu, or renew below.`
          : access.message ||
            `${ESTATE_BILLING_PLAN.name} · ${priceMonth}`;

  const subscribeLabel =
    phase === 'trial'
      ? `Subscribe · $0 today`
      : `Subscribe · ${price}`;

  return (
    <section
      className={`ei-billing-banner is-${tone}${compact ? ' is-compact' : ''}${locked ? ' is-locked' : ''}`}
      aria-label="Estate Vault billing"
    >
      <div className="ei-billing-banner-copy">
        <strong>
          {locked ? 'Estate frozen' : billingPhaseLabel(phase)}
          {!locked && days ? ` · ${days}` : ''}
        </strong>
        <p>{bodyCopy}</p>
        {(phase === 'trial' || phase === 'grace' || locked) && access.checkoutReady !== false ? (
          <p className="ei-billing-legal-links">
            By subscribing you agree to the{' '}
            <a href={ESTATE_LEGAL_PAGES.terms.path} target="_blank" rel="noopener noreferrer">
              {ESTATE_LEGAL_PAGES.terms.shortLabel}
            </a>{' '}
            and{' '}
            <a href={ESTATE_LEGAL_PAGES.privacy.path} target="_blank" rel="noopener noreferrer">
              {ESTATE_LEGAL_PAGES.privacy.shortLabel}
            </a>
            .{' '}
            <a href={ESTATE_LEGAL_PAGES.refund.path} target="_blank" rel="noopener noreferrer">
              {ESTATE_LEGAL_PAGES.refund.shortLabel}
            </a>
            {' · '}
            <a href={ESTATE_LEGAL_PAGES.security.path} target="_blank" rel="noopener noreferrer">
              {ESTATE_LEGAL_PAGES.security.shortLabel}
            </a>
          </p>
        ) : null}
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
            {busy === 'checkout' || busy === 'confirm' ? 'Working…' : subscribeLabel}
          </button>
        ) : null}
        {/* Manage lives in Menu once subscribed; keep on banner for Settings / canceling. */}
        {forceShow || access.cancel_at_period_end ? (
          access.stripe_customer_id || phase === 'active' ? (
            <button
              type="button"
              className="ei-btn ei-btn-small ei-btn-secondary"
              disabled={Boolean(busy)}
              onClick={portal}
            >
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          ) : null
        ) : null}
      </div>
    </section>
  );
};

export default EstateBillingBanner;
