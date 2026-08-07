/**
 * Estate Vault public legal page URLs (marketing site + checkout disclosure).
 * Keep in sync with FrontEnd/public/estate-vault/*.html and root redirects.
 */

export const ESTATE_LEGAL_PAGES = {
  terms: {
    path: '/estate-vault/terms.html',
    label: 'Terms of Service',
    shortLabel: 'Terms'
  },
  privacy: {
    path: '/estate-vault/privacy.html',
    label: 'Privacy Policy',
    shortLabel: 'Privacy'
  },
  refund: {
    path: '/estate-vault/refund.html',
    label: 'Refund & Cancellation',
    shortLabel: 'Refunds'
  },
  security: {
    path: '/estate-vault/security.html',
    label: 'Security & Retention',
    shortLabel: 'Security'
  }
};

/** Absolute URLs for Stripe / emails (fiduciarylog production). */
export const ESTATE_LEGAL_ABSOLUTE_BASE = 'https://fiduciarylog.com';

export function estateLegalAbsoluteUrl(key) {
  const page = ESTATE_LEGAL_PAGES[key];
  return page ? `${ESTATE_LEGAL_ABSOLUTE_BASE}${page.path}` : ESTATE_LEGAL_ABSOLUTE_BASE;
}

/** Compact footer / banner line for React UIs. */
export function estateLegalLinksBlurb() {
  return 'By subscribing you agree to our Terms of Service and Privacy Policy. See also Refund & Cancellation and Security & Retention.';
}
