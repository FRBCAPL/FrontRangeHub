import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { billingBanner } from '../../utils/duezyBillingText.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

const BILLING_PATH = `${DUEZY_PATH}/billing`;

export default function DuezyBillingBanner() {
  const { access } = useDuezyBilling();
  const { pathname } = useLocation();
  const banner = billingBanner(access);
  if (!banner || pathname === BILLING_PATH) return null;

  return (
    <div className={`dz-bill-banner is-${banner.tone}`} role={banner.tone === 'bad' ? 'alert' : 'status'}>
      <span>{banner.text}</span>
      <Link to={BILLING_PATH} className="dz-bill-banner-cta">{banner.cta} ›</Link>
    </div>
  );
}
