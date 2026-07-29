/** Estate Vault — shared enums / labels (routes remain /estateit) */

export const APP_NAME = 'Estate Vault';
export const CASE_NUMBER = '26PR00440';
/** Sandbox case for experiments — same PR owner, isolated estate_id after foundation SQL. */
export const TEST_CASE_NUMBER = 'TEST0001';
/** Public hash-router base path: #/estateit */
export const ESTATEIT_PATH = '/estateit';
/** Open estates for the SaaS shell (expand when multi-tenant onboarding exists). */
export const OPEN_ESTATE_CASES = [CASE_NUMBER, TEST_CASE_NUMBER];
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

/** Six-digit numeric invite code for a new heir (100000–999999). */
export function generateHeirInviteCode() {
  const buf = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000));
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

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

/** Friendly label for an estate settings row. */
export function estateDisplayName(settingsOrName, fallbackCase = CASE_NUMBER) {
  if (typeof settingsOrName === 'string') {
    const name = settingsOrName.trim();
    return name || fallbackCase;
  }
  const name = String(settingsOrName?.estate_name || '').trim();
  if (name) return name;
  const court = normalizeEstateCaseNumber(settingsOrName?.court_case_number);
  if (court) return court;
  return normalizeEstateCaseNumber(settingsOrName?.case_number) || fallbackCase;
}

/**
 * Human-facing case number — always prefer the PR’s court/admin case from settings.
 * Portal `case_number` (e.g. EV…) is only a fallback for URLs / internal routing.
 */
export function estateDisplayCaseNumber(settingsOrRow, fallback = '') {
  if (typeof settingsOrRow === 'string') {
    return normalizeEstateCaseNumber(settingsOrRow) || fallback;
  }
  const court = normalizeEstateCaseNumber(
    settingsOrRow?.court_case_number || settingsOrRow?.courtCaseNumber
  );
  if (court) return court;
  return (
    normalizeEstateCaseNumber(
      settingsOrRow?.case_number || settingsOrRow?.caseNumber || fallback
    ) || fallback
  );
}

/**
 * Auction visibility / bidding window from estate settings.
 * @returns {{
 *   phase: 'unscheduled'|'upcoming'|'open'|'ended',
 *   isPublic: boolean,
 *   biddingOpen: boolean,
 *   startDate: string|null,
 *   endDate: string|null,
 *   label: string
 * }}
 */
export function resolveAuctionWindow(settings = {}, now = new Date()) {
  const startDate = settings?.auction_start_date
    ? String(settings.auction_start_date).slice(0, 10)
    : null;
  const endDate = settings?.auction_end_date
    ? String(settings.auction_end_date).slice(0, 10)
    : null;
  const start = parseEstateLocalDate(startDate);
  const endDay = parseEstateLocalDate(endDate);
  const end = endDay
    ? new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), 23, 59, 59, 999)
    : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!start) {
    return {
      phase: 'unscheduled',
      isPublic: false,
      biddingOpen: false,
      startDate,
      endDate,
      label: 'Auction dates not set'
    };
  }
  if (today < start) {
    return {
      phase: 'upcoming',
      isPublic: false,
      biddingOpen: false,
      startDate,
      endDate,
      label: `Opens ${startDate}`
    };
  }
  if (end && now > end) {
    return {
      phase: 'ended',
      isPublic: true,
      biddingOpen: false,
      startDate,
      endDate,
      label: `Ended ${endDate}`
    };
  }
  return {
    phase: 'open',
    isPublic: true,
    biddingOpen: true,
    startDate,
    endDate,
    label: endDate ? `Open through ${endDate}` : 'Auction open'
  };
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
    label: 'Residual Heir',
    hint: 'Full inventory — request and release'
  },
  {
    value: HEIR_ACCESS_TIER.memorandum,
    label: 'Memorandum Heir',
    hint: 'Only items named for them — view only'
  },
  {
    value: HEIR_ACCESS_TIER.both,
    label: 'Residual + Memorandum Heir',
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
    'Residual Heir'
  );
}

export function isMemorandumOnlyHeir(accessTier) {
  return normalizeHeirAccessTier(accessTier) === HEIR_ACCESS_TIER.memorandum;
}

/**
 * Role capability copy: one-line summary under the timer + longer "See more" modal body.
 * @returns {{ title: string, summary: string, details: string }}
 */
export function heirRoleGuide(accessTier) {
  const tier = normalizeHeirAccessTier(accessTier);
  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return {
      title: 'Memorandum Heir',
      summary:
        'View items named for you.',
      details:
        'You see specific items named for you in a memorandum.\n\n' +
        'This view is read-only.\n\n' +
        'To follow other items, use Follow auction.\n\n' +
        'Bidding stays closed and auction is hidden from the public until the auction start date.'
    };
  }
  if (tier === HEIR_ACCESS_TIER.both) {
    return {
      title: 'Residual + Memorandum Heir',
      summary:
        'Browse the full inventory and your memorandum gifts; request items or mark no interest for public sale.',
      details:
        'You can browse the full estate inventory plus memorandum gifts named for you.\n\n' +
        'Request items, cancel your own requests, or mark no interest / approve for public sale.\n\n' +
        'Use Follow auction to see lots approved for public sale as the process continues.'
    };
  }
  return {
    title: 'Residual Heir',
    summary:
      'Browse inventory, request items, or mark no interest / approve items for public sale.',
    details:
      'You can browse the estate inventory listed for residual heirs.\n\n' +
      'Request items, cancel your own requests, or mark no interest / approve for public sale.\n\n' +
      'Use Follow auction to see lots approved for public sale as the process continues.'
  };
}

/** @deprecated Prefer heirRoleGuide(accessTier).summary */
export function heirRoleGuideText(accessTier) {
  return heirRoleGuide(accessTier).summary;
}

export const HELPER_ROLE_GUIDE = {
  title: 'Helper / Inventory Taker',
  summary: 'Photograph and describe items and scenes — the Personal Representative sets status later.',
  details:
    'You can photograph and describe inventory items and document scenes.\n\n' +
    'You cannot set value tier or legal status.\n\n' +
    'Everything you add waits for Personal Representative review before heirs see it as approved inventory.'
};

export const AUCTION_ROLE_GUIDE = {
  title: 'Auction',
  summary: 'Browse lots approved for sale; bid only when the auction window is open.',
  details:
    'Browse lots the Personal Representative has approved for public sale.\n\n' +
    'When the auction is open, register with a verified payment card and place bids.\n\n' +
    'Pickup follows the estate schedule set by the Personal Representative.\n\n' +
    'Before the start date, invited family can follow along and browse — bidding stays closed until then.'
};

/** Family follow-along auction guide (heir signed in, before public open). */
export function auctionFamilyFollowGuide({ isPreview = false } = {}) {
  if (isPreview) {
    return {
      title: 'Auction — follow along',
      summary: 'Follow lots as they are approved for sale — bidding stays closed until the start date.',
      details:
        'As a signed-in heir, you can follow along before the auction is public.\n\n' +
        'Lots appear here when they are approved for public sale.\n\n' +
        'Bidding stays closed until the auction start date. After it opens, register and bid if you wish.\n\n' +
        'Pickup follows the estate schedule set by the Personal Representative.'
    };
  }
  return AUCTION_ROLE_GUIDE;
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

/** Label for PR flag: residual heirs / descendants may have an interest */
export const DESCENDANTS_INTEREST_LABEL = "Descendants' interest";

/** Preset percentages for descendants' interest dropdown */
export const DESCENDANTS_INTEREST_PRESETS = [100, 75, 50, 25];

/** @returns {number|null} integer 1–100, or null if unset/invalid */
export function normalizeDescendantsInterestPct(raw) {
  if (raw == null || raw === '' || raw === false) return null;
  if (raw === true) return 100;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 100) return null;
  return rounded;
}

/** Display label including percent when set */
export function descendantsInterestLabel(pctOrFlag) {
  const pct = normalizeDescendantsInterestPct(pctOrFlag);
  if (pct != null) return `${DESCENDANTS_INTEREST_LABEL} · ${pct}%`;
  return null;
}

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

/**
 * Public-facing heir name: preferred (user-chosen) falls back to admin label.
 * @param {{ preferred_name?: string, preferredName?: string, display_name?: string, displayName?: string, admin_label?: string, adminLabel?: string }|null} person
 */
export function heirPublicName(person) {
  if (!person) return '';
  const preferred = String(person.preferred_name || person.preferredName || '').trim();
  if (preferred) return preferred;
  const admin = String(
    person.admin_label || person.adminLabel || person.display_name || person.displayName || ''
  ).trim();
  return admin;
}

/** Admin label (PR record name) for dual-name admin views. */
export function heirAdminLabel(person) {
  if (!person) return '';
  return String(
    person.admin_label || person.adminLabel || person.display_name || person.displayName || ''
  ).trim();
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
export const AUCTION_TERMS_VERSION = '26PR00440-v2';

export function auctionTermsLines(pickupWindow) {
  const pickup =
    String(pickupWindow || '').trim() ||
    'dates posted by the Personal Representative';
  return [
    'You may browse lots before bidding opens. When the auction start date arrives, use Register (top right) to create a bidder account with your name, email, and phone.',
    'Registration requires a verified payment card and your acceptance of these Terms of Estate Sale. After you are registered, open any lot and submit a bid amount.',
    'By submitting a bid, you are entering into a legally binding contract to purchase if you win.',
    'All items are sold strictly AS-IS, WHERE-IS, with no refunds, guarantees, or warranties.',
    `Winning bidders are solely responsible for picking up their items at the designated residence in Colorado Springs, Colorado, on ${pickup}.`,
    'Packing, lifting, loading, and transport of items are the sole responsibility of the buyer.',
    'If you require shipping, you must contact the administrator prior to bidding to approve third-party shipping arrangements at your own exclusive expense.'
  ];
}
