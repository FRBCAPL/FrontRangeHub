/** EstateIt — Case 26PR00440 — shared enums / labels */

export const APP_NAME = 'EstateIt';
export const CASE_NUMBER = '26PR00440';
/** Public hash-router base path: #/estateit */
export const ESTATEIT_PATH = '/estateit';
export const PROBATE_WINDOW_DAYS = 90;
export const DEFAULT_ADMIN_PASSWORD = '123456';

/** @deprecated Prefer loading heirs from Settings / estate_list_heir_names — kept empty for SaaS readiness */
export const ALLOWED_HEIR_NAMES = [];

export const LEGAL_STATUS = {
  secured: 'secured',
  claimed_memorandum: 'claimed_memorandum',
  disputed: 'disputed',
  distributed: 'distributed',
  archived: 'archived',
  unauthorized_removal: 'unauthorized_removal'
};

export const LEGAL_STATUS_OPTIONS = [
  { value: LEGAL_STATUS.secured, label: 'Secured (locked in the house)' },
  { value: LEGAL_STATUS.claimed_memorandum, label: 'Claimed via Memorandum' },
  { value: LEGAL_STATUS.disputed, label: 'Disputed (negotiation clock)' },
  { value: LEGAL_STATUS.distributed, label: 'Distributed (handed over)' },
  { value: LEGAL_STATUS.unauthorized_removal, label: 'Unauthorized Removal (missing / taken)' },
  { value: LEGAL_STATUS.archived, label: 'Archived (rejected / audit trail)' }
];

/** Statuses an admin can pick when creating/editing inventory (exclude pure archive) */
export const LEGAL_STATUS_EDIT_OPTIONS = LEGAL_STATUS_OPTIONS.filter(
  (o) => o.value !== LEGAL_STATUS.archived
);

export const VALUE_TIER = {
  high_value: 'high_value',
  general_household: 'general_household',
  sentimental_low: 'sentimental_low'
};

export const VALUE_TIER_OPTIONS = [
  { value: VALUE_TIER.high_value, label: 'High-Value / Documented' },
  { value: VALUE_TIER.general_household, label: 'General Household' },
  { value: VALUE_TIER.sentimental_low, label: 'Sentimental / Low-Value' }
];

export const BENEFICIARY_OPTIONS = [
  'Desiree Garcia (Jewelry / Burial)',
  'Karolyn Cooley (Dogs / Butterfly Lamps / Broncos Jacket)',
  'Barbara Tatrai (Backup Pet Care)',
  'Other'
];

export function legalStatusLabel(value) {
  return LEGAL_STATUS_OPTIONS.find((o) => o.value === value)?.label || value || '—';
}

export function legalStatusPillClass(value) {
  switch (value) {
    case LEGAL_STATUS.secured:
      return 'ei-pill ei-pill-secured';
    case LEGAL_STATUS.claimed_memorandum:
      return 'ei-pill ei-pill-memorandum';
    case LEGAL_STATUS.disputed:
      return 'ei-pill ei-pill-disputed';
    case LEGAL_STATUS.unauthorized_removal:
      return 'ei-pill ei-pill-unauthorized';
    case LEGAL_STATUS.archived:
      return 'ei-pill ei-pill-archived';
    case LEGAL_STATUS.distributed:
      return 'ei-pill ei-pill-distributed';
    default:
      return 'ei-pill';
  }
}

/** Normalize sibling_claims from RPC / row (array, or JSON string). */
export function normalizeSiblingClaims(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Normalize family_releases (no-interest / approve-for-sale) array. */
export function normalizeFamilyReleases(raw) {
  return normalizeSiblingClaims(raw);
}

export function youReleasedItem(item, viewerSiblingKey) {
  const key = String(viewerSiblingKey || '')
    .trim()
    .toLowerCase();
  if (!key) return false;
  return normalizeFamilyReleases(item?.family_releases).some(
    (r) => String(r?.sibling_key || '').trim().toLowerCase() === key
  );
}

/** Distinct heirs who requested an item (by sibling_key, else display_name). */
export function uniqueHeirClaimCount(item) {
  const keys = new Set();
  for (const c of normalizeSiblingClaims(item?.sibling_claims)) {
    const key = String(c?.sibling_key || '').trim().toLowerCase();
    const name = String(c?.display_name || '').trim().toLowerCase();
    const id = key || name;
    if (id) keys.add(id);
  }
  return keys.size;
}

/** Plain-language status for heirs (Family portal) — not PR/court wording.
 *  Pass viewerSiblingKey when the signed-in heir is viewing so copy is first-person.
 */
export function heirFacingLegalStatusLabel(value, item = null, options = {}) {
  // Prefer claim count over legal_status alone (status can be wrongly "disputed")
  const hasItem = item != null;
  const uniqueClaimers = hasItem ? uniqueHeirClaimCount(item) : null;
  const viewerKey = String(options.viewerSiblingKey || options.viewerKey || '')
    .trim()
    .toLowerCase();
  const iRequested =
    Boolean(viewerKey) &&
    normalizeSiblingClaims(item?.sibling_claims).some((c) => {
      const key = String(c?.sibling_key || '').trim().toLowerCase();
      return key && key === viewerKey;
    });

  const oneRequesterLabel = iRequested
    ? 'You requested this'
    : 'Someone has requested this';
  const multiRequesterLabel = iRequested
    ? 'You and others have asked for this'
    : 'More than one person has asked for this';

  switch (value) {
    case LEGAL_STATUS.secured:
      if (uniqueClaimers === 1) return oneRequesterLabel;
      return 'Available to request';
    case LEGAL_STATUS.claimed_memorandum:
      return 'Set aside in the will / memorandum';
    case LEGAL_STATUS.disputed:
      // Never say "more than one" unless we can confirm 2+ distinct claimers
      if (uniqueClaimers != null && uniqueClaimers >= 2) {
        return multiRequesterLabel;
      }
      if (uniqueClaimers === 1 || uniqueClaimers == null) {
        return oneRequesterLabel;
      }
      return 'Available to request';
    case LEGAL_STATUS.distributed:
      return 'Already given out';
    case LEGAL_STATUS.unauthorized_removal:
      return 'Reported missing / taken without approval';
    case LEGAL_STATUS.archived:
      return 'Archived';
    default:
      return legalStatusLabel(value);
  }
}

export function valueTierLabel(value) {
  return VALUE_TIER_OPTIONS.find((o) => o.value === value)?.label || value || '—';
}

export const SIBLING_OPTIONS = [];

/** @deprecated Heirs are configured per estate in Settings — no global allowlist */
export function normalizeHeirDisplayName(name) {
  const n = String(name || '').trim();
  return n.length >= 2 ? n : null;
}

export function isAllowedHeirName(name) {
  return Boolean(normalizeHeirDisplayName(name));
}

export function isClaimedMemorandum(status) {
  return status === LEGAL_STATUS.claimed_memorandum;
}

export function isDisputed(status) {
  return status === LEGAL_STATUS.disputed;
}

export function isUnauthorizedRemoval(status) {
  return status === LEGAL_STATUS.unauthorized_removal;
}

export function isArchived(status) {
  return status === LEGAL_STATUS.archived;
}

export function claimCount(item) {
  return normalizeSiblingClaims(item?.sibling_claims).length;
}

/** Auction Terms of Estate Sale — Case 26PR00440 */
export const AUCTION_TERMS_VERSION = '26PR00440-v1';

export function auctionTermsLines(pickupWindow) {
  const pickup =
    String(pickupWindow || '').trim() ||
    'dates posted by the Personal Representative';
  return [
    'By submitting this bid, you are entering into a legally binding contract to purchase.',
    'All items are sold strictly AS-IS, WHERE-IS, with no refunds.',
    `Winning bidders are solely responsible for picking up their items at the designated residence in Colorado Springs, Colorado, on ${pickup}.`,
    'Packing, lifting, loading, and transport of items are the sole responsibility of the buyer.',
    'If you require shipping, you must contact the administrator prior to bidding to approve third-party shipping arrangements at your own exclusive expense.'
  ];
}
