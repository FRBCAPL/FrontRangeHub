/** EstateIt — Case 26PR00440 — shared enums / labels */

export const APP_NAME = 'EstateIt';
export const CASE_NUMBER = '26PR00440';
/** Public hash-router base path: #/estateit */
export const ESTATEIT_PATH = '/estateit';
/** Open estates for the SaaS shell (expand when multi-tenant onboarding exists). */
export const OPEN_ESTATE_CASES = [CASE_NUMBER];
export const ESTATE_CASE_STORAGE_KEY = 'estateit_last_case';
export const PROBATE_WINDOW_DAYS = 90;

/** Countdown configuration (admin Settings → Case & probate) */
export const PROBATE_WINDOW_MODE = {
  duration: 'duration',
  date: 'date'
};

export const PROBATE_DURATION_UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' }
];

export function normalizeProbateWindowMode(raw) {
  return String(raw || '').trim().toLowerCase() === PROBATE_WINDOW_MODE.date
    ? PROBATE_WINDOW_MODE.date
    : PROBATE_WINDOW_MODE.duration;
}

export function normalizeProbateDurationUnit(raw) {
  const u = String(raw || '')
    .trim()
    .toLowerCase();
  if (u === 'weeks' || u === 'months') return u;
  return 'days';
}

export function normalizeProbateWindowAmount(raw, fallback = PROBATE_WINDOW_DAYS) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(3650, Math.floor(n));
}

/** Parse YYYY-MM-DD (or Date) as local midnight. */
export function parseEstateLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatEstateLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Add duration in calendar days / weeks / months from a start date. */
export function addProbateDuration(startDate, amount, unit) {
  const start = parseEstateLocalDate(startDate);
  if (!start) return null;
  const n = normalizeProbateWindowAmount(amount, 0);
  if (n < 1) return null;
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const u = normalizeProbateDurationUnit(unit);
  if (u === 'weeks') end.setDate(end.getDate() + n * 7);
  else if (u === 'months') end.setMonth(end.getMonth() + n);
  else end.setDate(end.getDate() + n);
  return end;
}

/**
 * Resolve countdown end from settings.
 * @returns {{ end: Date|null, mode: string, label: string, needsLetters: boolean, needsEndDate: boolean }}
 */
export function resolveProbateWindow(settings = {}) {
  const mode = normalizeProbateWindowMode(settings.probate_window_mode);
  const amount = normalizeProbateWindowAmount(settings.probate_window_amount);
  const unit = normalizeProbateDurationUnit(settings.probate_window_unit);
  const letters = settings.letters_issued_at || null;
  const fixed = settings.probate_window_end_date || null;

  if (mode === PROBATE_WINDOW_MODE.date) {
    const end = parseEstateLocalDate(fixed);
    return {
      end,
      mode,
      amount,
      unit,
      lettersIssuedAt: letters,
      label: end
        ? `Probate window ends ${formatEstateLocalDate(end)}`
        : 'Probate end date',
      needsLetters: false,
      needsEndDate: !end
    };
  }

  const end = addProbateDuration(letters, amount, unit);
  const unitLabel = PROBATE_DURATION_UNIT_OPTIONS.find((o) => o.value === unit)?.label || 'Days';
  return {
    end,
    mode,
    amount,
    unit,
    lettersIssuedAt: letters,
    label: `${amount}-${unitLabel.toLowerCase()} probate window`,
    needsLetters: !letters,
    needsEndDate: false
  };
}
export const DEFAULT_ADMIN_PASSWORD = '123456';

/** Normalize user-entered case numbers (trim, uppercase, strip spaces). */
export function normalizeEstateCaseNumber(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isOpenEstateCase(caseNumber) {
  const normalized = normalizeEstateCaseNumber(caseNumber);
  if (!normalized) return false;
  return OPEN_ESTATE_CASES.some(
    (c) => normalizeEstateCaseNumber(c) === normalized
  );
}

/**
 * Build a case-scoped EstateIt path.
 * @param {string} caseNumber
 * @param {string} [suffix] e.g. 'admin' | 'family' | 'helper' | 'auction'
 */
export function estateitCasePath(caseNumber, suffix = '') {
  const base = `${ESTATEIT_PATH}/${encodeURIComponent(normalizeEstateCaseNumber(caseNumber) || CASE_NUMBER)}`;
  const clean = String(suffix || '').replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : base;
}

/** @deprecated Prefer loading heirs from Settings / estate_list_heir_names — kept empty for SaaS readiness */
export const ALLOWED_HEIR_NAMES = [];

/** Family portal access — set per person in Settings */
export const HEIR_ACCESS_TIER = {
  residual: 'residual',
  memorandum: 'memorandum',
  both: 'both'
};

export const HEIR_ACCESS_TIER_OPTIONS = [
  {
    value: HEIR_ACCESS_TIER.residual,
    label: 'Residual heir',
    hint: 'Full inventory — request and release'
  },
  {
    value: HEIR_ACCESS_TIER.memorandum,
    label: 'Memorandum only',
    hint: 'Only items named for them — view only'
  },
  {
    value: HEIR_ACCESS_TIER.both,
    label: 'Both',
    hint: 'Full inventory plus memorandum gifts'
  }
];

export function normalizeHeirAccessTier(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (t === HEIR_ACCESS_TIER.memorandum || t === HEIR_ACCESS_TIER.both) return t;
  return HEIR_ACCESS_TIER.residual;
}

export function heirAccessTierLabel(value) {
  return (
    HEIR_ACCESS_TIER_OPTIONS.find((o) => o.value === normalizeHeirAccessTier(value))?.label ||
    'Residual heir'
  );
}

export function isMemorandumOnlyHeir(accessTier) {
  return normalizeHeirAccessTier(accessTier) === HEIR_ACCESS_TIER.memorandum;
}

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
