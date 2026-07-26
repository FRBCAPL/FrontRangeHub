/** EstateIt — Case 26PR00440 operational / legal-ops copy (Tuesday boundaries) */

import { CASE_NUMBER, ESTATEIT_PATH, PROBATE_WINDOW_DAYS } from './estateInventoryConstants.js';

/** SMS wording for beneficiaries (Rule 3). Inventory is started / ongoing — not claimed complete. */
export function buildNoticeOfInventoryPortalSms(portalUrl) {
  const link = String(portalUrl || '[Your Link]').trim() || '[Your Link]';
  return (
    `Matt and Karol, as the nominated Personal Representative under open Case ${CASE_NUMBER}, ` +
    `I have begun the physical asset preservation inventory. Items will be added to a secure digital ` +
    `portal as they are documented so you have equal, ongoing access. ` +
    `You may log in at ${link} using your unique credentials to browse what has been listed so far ` +
    `and submit formal requests with written justifications. ` +
    `If you prefer not to use the digital portal, you may instead submit your item choices to me ` +
    `via a typed, physical paper list within the ${PROBATE_WINDOW_DAYS}-day probate window. ` +
    `All requests, digital or physical, will be held to the same court audit standard.`
  );
}

/** Family portal URL for this deployment (hash router). */
export function defaultFamilyPortalUrl() {
  if (typeof window === 'undefined') {
    return `[Your production site]/#${ESTATEIT_PATH}/family`;
  }
  const path = String(window.location.pathname || '/').replace(/\/$/, '') || '';
  return `${window.location.origin}${path}/#${ESTATEIT_PATH}/family`;
}

export const PAPER_PATH_HEIR_NOTICE =
  `Prefer not to use this portal? You may submit a typed paper list of item choices to the ` +
  `Personal Representative within the ${PROBATE_WINDOW_DAYS}-day probate window. ` +
  `Paper and digital requests are held to the same court audit standard (Case ${CASE_NUMBER}).`;

export const PR_AUCTION_BID_BLOCK_MESSAGE =
  `The Personal Representative / estate owner may not register or bid on this public auction. ` +
  `To acquire an unneeded general household item, record it in Admin Notes during the family ` +
  `negotiation window, or pay fair market appraisal value into the estate account with a clean receipt.`;

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
