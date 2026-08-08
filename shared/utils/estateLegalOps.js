/** Estate Vault — operational / legal-ops copy (Tuesday boundaries, paper path). */

import { estateitCasePath, HEIR_ACCESS_TIER, normalizeHeirAccessTier } from './estateInventoryConstants.js';

/** SMS wording for beneficiaries (Rule 3). Inventory is started / ongoing — not claimed complete. */
export function buildNoticeOfInventoryPortalSms(portalUrl, caseNumber = '') {
  const link = String(portalUrl || '[Your Link]').trim() || '[Your Link]';
  const caseLabel = String(caseNumber || '').trim();
  const caseClause = caseLabel ? ` under Case ${caseLabel}` : '';
  return (
    `As the nominated Personal Representative${caseClause}, ` +
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
export function defaultFamilyPortalUrl(caseNumber = '') {
  const hashPath = estateitCasePath(caseNumber, 'family');
  if (typeof window === 'undefined') {
    return `[Your production site]/#${hashPath}`;
  }
  const path = String(window.location.pathname || '/').replace(/\/$/, '') || '';
  return `${window.location.origin}${path}/#${hashPath}`;
}

/** @deprecated Prefer paperPathHeirNotice(accessTier, caseNumber) */
export const PAPER_PATH_HEIR_NOTICE =
  `Prefer not to use this portal?\n` +
  `You may submit a typed paper list of item choices to the ` +
  `Personal Representative within the probate window seen above.\n` +
  `Paper and digital requests are held to the same court audit standard.`;

/**
 * Paper / offline path copy for the family portal — varies by heir access tier.
 * @param {string} [accessTier]
 * @param {string} [caseNumber]
 */
export function paperPathHeirNotice(accessTier, caseNumber = '') {
  const caseLabel = String(caseNumber || '').trim();
  const caseSuffix = caseLabel ? ` (Case ${caseLabel})` : '';
  const tier = normalizeHeirAccessTier(accessTier);
  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return (
      `This portal is for Specific Gift Recipients.\n` +
      `You do not have to claim your items in the app.\n` +
      `You will receive the items named for you in accordance with the estate plan.` +
      `\nUse the message button below for any questions${caseSuffix}.`
    );
  }
  return (
    `Prefer not to use this portal?\n` +
    `You may submit a typed paper list of item choices to the Personal Representative ` +
    `within the probate window seen above.\n` +
    `Paper and digital requests are held to the same court audit standard${caseSuffix}.`
  );
}

export const PR_AUCTION_BID_BLOCK_MESSAGE =
  `The Personal Representative / estate manager may not register or bid when live bidding is offered on the sale inventory.`;

export const LOCKSMITH_ITEM_PRESET = {
  name: 'Perimeter Security Rekeying Execution',
  notes:
    'Locksmith deadbolt / perimeter rekeying. Invoice number: [enter invoice #]. ' +
    'Photo documents installation. Server stamps capture receipt time and device GPS when available.',
  legalStatus: 'secured',
  valueTier: 'general_household',
  newCollectionName: 'Perimeter / Security'
};

/** PR acquisition boundary copy for the estate currently being administered. */
export function prSelfAcquireHint(caseNumber) {
  const caseLabel = String(caseNumber || '').trim();
  return (
    `PR acquisition: do not bid when live bidding is offered on the sale inventory. Use Admin Notes during the family window, ` +
    `or pay FMV into the estate account with a receipt` +
    (caseLabel ? ` (Case ${caseLabel}).` : '.')
  );
}

/** @deprecated Prefer prSelfAcquireHint(caseNumber) with the active estate case. */
export const PR_SELF_ACQUIRE_HINT = prSelfAcquireHint('');
