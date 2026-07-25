/** EstateIt — Case 26PR00440 — shared enums / labels */

export const APP_NAME = 'EstateIt';
export const CASE_NUMBER = '26PR00440';
export const PROBATE_WINDOW_DAYS = 90;

export const LEGAL_STATUS = {
  secured: 'secured',
  claimed_memorandum: 'claimed_memorandum',
  disputed: 'disputed',
  distributed: 'distributed'
};

export const LEGAL_STATUS_OPTIONS = [
  { value: LEGAL_STATUS.secured, label: 'Secured (locked in the house)' },
  { value: LEGAL_STATUS.claimed_memorandum, label: 'Claimed via Memorandum' },
  { value: LEGAL_STATUS.disputed, label: 'Disputed (negotiation clock)' },
  { value: LEGAL_STATUS.distributed, label: 'Distributed (handed over)' }
];

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

/** Plain-language status for heirs (Family portal) — not PR/court wording */
export function heirFacingLegalStatusLabel(value) {
  switch (value) {
    case LEGAL_STATUS.secured:
      return 'Available to request';
    case LEGAL_STATUS.claimed_memorandum:
      return 'Set aside in the will / memorandum';
    case LEGAL_STATUS.disputed:
      return 'More than one person has asked for this';
    case LEGAL_STATUS.distributed:
      return 'Already given out';
    default:
      return legalStatusLabel(value);
  }
}

export function valueTierLabel(value) {
  return VALUE_TIER_OPTIONS.find((o) => o.value === value)?.label || value || '—';
}

export const SIBLING_OPTIONS = [
  { key: 'matt', label: 'Matt', defaultName: 'Matt' },
  { key: 'karol', label: 'Karol', defaultName: 'Karol' }
];
/* Heirs are now added by name in Settings; SIBLING_OPTIONS kept only for legacy references. */

export function isClaimedMemorandum(status) {
  return status === LEGAL_STATUS.claimed_memorandum;
}

export function isDisputed(status) {
  return status === LEGAL_STATUS.disputed;
}

export function claimCount(item) {
  const claims = item?.sibling_claims;
  return Array.isArray(claims) ? claims.length : 0;
}
