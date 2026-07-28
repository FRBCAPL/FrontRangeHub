/** EstateIt — Case 26PR00440 operational / legal-ops copy (Tuesday boundaries) */

import { CASE_NUMBER, estateitCasePath, HEIR_ACCESS_TIER, normalizeHeirAccessTier } from './estateInventoryConstants.js';

/** SMS wording for beneficiaries (Rule 3). Inventory is started / ongoing — not claimed complete. */
export function buildNoticeOfInventoryPortalSms(portalUrl, caseNumber = CASE_NUMBER) {
  const link = String(portalUrl || '[Your Link]').trim() || '[Your Link]';
  const caseLabel = caseNumber || CASE_NUMBER;
  return (
    `Matt and Karol, as the nominated Personal Representative under open Case ${caseLabel}, ` +
    `I have begun the physical asset preservation inventory. Items will be added to a secure digital ` +
    `portal as they are documented so you have equal, ongoing access. ` +
    `You may log in at ${link} using your unique credentials to browse what has been listed so far ` +
    `and submit formal requests with written justifications. ` +
    `If you prefer not to use the digital portal, you may instead submit your item choices to me ` +
    `via a typed, physical paper list within the probate window set by the Personal Representative. ` +
    `All requests, digital or physical, will be held to the same court audit standard.`
  );
}

/** Family portal URL for this deployment (hash router). */
export function defaultFamilyPortalUrl(caseNumber = CASE_NUMBER) {
  const hashPath = estateitCasePath(caseNumber || CASE_NUMBER, 'family');
  if (typeof window === 'undefined') {
    return `[Your production site]/#${hashPath}`;
  }
  const path = String(window.location.pathname || '/').replace(/\/$/, '') || '';
  return `${window.location.origin}${path}/#${hashPath}`;
}

/** @deprecated Prefer paperPathHeirNotice(accessTier) — residual/default wording */
export const PAPER_PATH_HEIR_NOTICE =
  `Prefer not to use this portal?\n` +
  `You may submit a typed paper list of item choices to the ` +
  `Personal Representative within the probate window seen above.\n` +
  `Paper and digital requests are held to the same court audit standard (Case ${CASE_NUMBER}).`;

/**
 * Paper / offline path copy for the family portal — varies by heir access tier.
 * @param {string} [accessTier]
 */
export function paperPathHeirNotice(accessTier, caseNumber = CASE_NUMBER) {
  const caseLabel = caseNumber || CASE_NUMBER;
  const tier = normalizeHeirAccessTier(accessTier);
  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return (
      `This portal is for Memorandum Heirs.\n` +
      `You do not have to claim your items in app.\n` +
      `You will recieve the items named for you in accordance with the estate plan.` +
      `\nUse the message button below for any questions ` +
      `(Case ${caseLabel}).`
    );
  }
  if (tier === HEIR_ACCESS_TIER.both) {
    return (
      `Prefer not to use this portal?\n` +
      `You may submit a typed paper list of item choices to the Personal Representative ` +
      `within the probate window seen above.\n` +
      `Paper and digital requests are held to the same court audit standard (Case ${caseLabel}).`
    );
  }
  return (
    `Prefer not to use this portal?\n` +
    `You may submit a typed paper list of item choices to the Personal Representative ` +
    `within the probate window seen above.\n` +
    `Paper and digital requests are held to the same court audit standard (Case ${caseLabel}).`
  );
}

export const PR_AUCTION_BID_BLOCK_MESSAGE =
  `The Personal Representative / estate manager may not register or bid on this public auction.`;

export const LOCKSMITH_ITEM_PRESET = {
  name: 'Perimeter Security Rekeying Execution',
  notes:
    'Locksmith deadbolt / perimeter rekeying. Invoice number: [enter invoice #]. ' +
    'Photo documents installation. Server stamps capture receipt time and device GPS when available.',
  legalStatus: 'secured',
  valueTier: 'general_household',
  newCollectionName: 'Perimeter / Security'
};

export const PR_SELF_ACQUIRE_HINT =
  `PR acquisition: do not bid on the public auction. Use Admin Notes during the family window, ` +
  `or pay FMV into the estate account with a receipt (Case ${CASE_NUMBER}).`;
