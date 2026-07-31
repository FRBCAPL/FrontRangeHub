/** Estate Vault — shared enums / labels (routes remain /estateit) */

export const APP_NAME = 'Estate Vault';
/**
 * @deprecated Never invent a production case. Callers must pass the active case from the route.
 * Kept as an empty string so old `|| CASE_NUMBER` fallbacks fail closed instead of leaking a seed case.
 */
export const CASE_NUMBER = '';
/** Optional local sandbox label — not a live estate identity. */
export const TEST_CASE_NUMBER = 'TEST0001';
/** Public hash-router base path: #/estateit */
export const ESTATEIT_PATH = '/estateit';
/**
 * Client-side allowlist is intentionally empty. Accessibility comes from the database
 * (published / owned / invite session), not a hardcoded seed case.
 */
export const OPEN_ESTATE_CASES = [];
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
export function estateDisplayName(settingsOrName, fallbackCase = '') {
  if (typeof settingsOrName === 'string') {
    const name = settingsOrName.trim();
    return name || fallbackCase || 'Estate';
  }
  const name = String(settingsOrName?.estate_name || '').trim();
  if (name) return name;
  const court = normalizeEstateCaseNumber(settingsOrName?.court_case_number);
  if (court) return court;
  return normalizeEstateCaseNumber(settingsOrName?.case_number) || fallbackCase || 'Estate';
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
  const cn = normalizeEstateCaseNumber(caseNumber);
  if (!cn) {
    const clean = String(suffix || '').replace(/^\/+/, '');
    // No case yet — send people to the gateway (or family door), never invent an ID.
    if (clean === 'family' || clean === 'helper') return `${ESTATEIT_PATH}/enter`;
    if (clean === 'admin' || clean === 'owner') return `${ESTATEIT_PATH}/owner`;
    return ESTATEIT_PATH;
  }
  const base = `${ESTATEIT_PATH}/${encodeURIComponent(cn)}`;
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
    label: 'Heir / Residual Beneficiary',
    hint: 'Receives a share of what is left after debts, expenses, and specific gifts'
  },
  {
    value: HEIR_ACCESS_TIER.memorandum,
    label: 'Specific Gift Recipient',
    hint: 'Receives items listed in a personal property memorandum — view only'
  },
  {
    value: HEIR_ACCESS_TIER.both,
    label: 'Heir / Residual Beneficiary + Specific Gift Recipient',
    hint: 'Named for specific gifts and also shares in what remains'
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
    'Heir / Residual Beneficiary'
  );
}

export function isMemorandumOnlyHeir(accessTier) {
  return normalizeHeirAccessTier(accessTier) === HEIR_ACCESS_TIER.memorandum;
}

/**
 * Role how-to guides: one-line summary + numbered steps for the Guide modal.
 * @returns {{ title: string, summary: string, details: string, steps: Array<{heading: string, body: string}>, notes?: string }}
 */
export function heirRoleGuide(accessTier) {
  const tier = normalizeHeirAccessTier(accessTier);
  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return {
      title: 'Specific Gift Recipient guide',
      summary: 'View the gifts named for you, then follow the auction for anything else.',
      steps: [
        {
          heading: '1. Confirm your name',
          body: 'If asked, set the preferred name you want the Personal Representative and family to see.'
        },
        {
          heading: '2. Review your specific gifts',
          body: 'You only see items named for you in a personal property memorandum. This view is read-only — you do not request or release the remaining estate inventory here.'
        },
        {
          heading: '3. Message the Personal Representative',
          body: 'Use Messages if something looks wrong or you have a question about a gift.'
        },
        {
          heading: '4. Follow the auction',
          body: 'Use Follow auction to watch other lots as they are approved for sale. Bidding stays closed until the auction start date.'
        }
      ],
      notes: 'Prefer not to use the portal? You may still work with the Personal Representative by paper list inside the probate window.'
    };
  }
  if (tier === HEIR_ACCESS_TIER.both) {
    return {
      title: 'Heir / Residual Beneficiary + Specific Gift Recipient guide',
      summary: 'Review your named gifts, then browse the rest of the inventory and make requests.',
      steps: [
        {
          heading: '1. Confirm your name',
          body: 'Set the preferred name you want shown to the Personal Representative and family.'
        },
        {
          heading: '2. Check specific gifts first',
          body: 'Items named for you in a personal property memorandum appear first. Review those before requesting from the remaining estate inventory.'
        },
        {
          heading: '3. Browse the remaining inventory',
          body: 'Open rooms and items. Request anything you want from what is left, or mark no interest / approve for public sale when you do not want it.'
        },
        {
          heading: '4. Track your requests',
          body: 'Use My requests to review or cancel requests you already submitted.'
        },
        {
          heading: '5. Message when needed',
          body: 'Use Messages for questions. Decisions stay documented for the estate record.'
        },
        {
          heading: '6. Follow the auction',
          body: 'Use Follow auction to see lots approved for public sale. Bidding opens on the auction start date.'
        }
      ],
      notes: 'Paper lists are still accepted inside the probate window and are held to the same audit standard as digital requests.'
    };
  }
  return {
    title: 'Heir / Residual Beneficiary guide',
    summary: 'Browse inventory, request items you want, and release what you do not.',
    steps: [
      {
        heading: '1. Confirm your name',
        body: 'Set the preferred name you want the Personal Representative and family to see.'
      },
      {
        heading: '2. Browse by room',
        body: 'Open the inventory and review items as they are documented.'
      },
      {
        heading: '3. Request or release',
        body: 'Request items you want. Mark no interest / approve for public sale on items you do not want so they can move toward auction.'
      },
      {
        heading: '4. Track your requests',
        body: 'Use My requests to review or cancel requests you already submitted.'
      },
      {
        heading: '5. Message when needed',
        body: 'Use Messages for questions. Your conversation stays with the estate record.'
      },
      {
        heading: '6. Follow the auction',
        body: 'Use Follow auction to see lots approved for public sale. Bidding opens on the auction start date.'
      }
    ],
    notes: 'Paper lists are still accepted inside the probate window and are held to the same audit standard as digital requests.'
  };
}

/** @deprecated Prefer heirRoleGuide(accessTier).summary */
export function heirRoleGuideText(accessTier) {
  return heirRoleGuide(accessTier).summary;
}

export const PR_ROLE_GUIDE = {
  title: 'Personal Representative guide',
  summary: 'Walk the estate from setup and inventory through ledger, family access, and court reports.',
  steps: [
    {
      heading: '1. Set the Letters date',
      body: 'Open Settings → Estate & probate. Enter the Letters issued date and confirm the probate / claims window. That starts the countdown on your dashboard.'
    },
    {
      heading: '2. Document the house',
      body: 'Create rooms, add items with photos, and capture Scene documentation for what you walked into. Use Helpers if others are photographing for you — their submissions wait in Pending review.'
    },
    {
      heading: '3. Invite family',
      body: 'Open Settings → Family / heirs. Add each person, choose their access tier, and share their PIN. Use Copy invite text from Next steps when you are ready to notify them.'
    },
    {
      heading: '4. Keep the ledger current',
      body: 'Open Estate Ledger. List bank accounts and debts at today’s balances, log expenses and PR loans, and enter estimated values on unsold property. Paid deposits and expenses stay as activity — do not count them again after balances are updated.'
    },
    {
      heading: '5. Handle requests and sale items',
      body: 'Review heir requests and helper submissions. Approve items for auction carefully. The Personal Representative may not bid on the public auction.'
    },
    {
      heading: '6. Export for court',
      body: 'Use Reports for the court evidence pack, printable catalog, read-only snapshot, or JSON backup. Close the estate in Settings → Records only after the work is finished.'
    }
  ],
  notes: 'Use the Estate progress timeline and Next steps panel as your checklist. Open Guide anytime from the top bar.'
};

export const HELPER_ROLE_GUIDE = {
  title: 'Helper / Inventory Taker guide',
  summary: 'Photograph and describe items and scenes — the Personal Representative finishes legal status later.',
  steps: [
    {
      heading: '1. Sign in with your name',
      body: 'Use the shared helper password plus your real name. Your name is stamped on every photo and note you submit.'
    },
    {
      heading: '2. Choose Item or Scene',
      body: 'Use Item capture for inventory pieces. Use Scene documentation for rooms, boxes, bags, or the condition of what you walked into.'
    },
    {
      heading: '3. Photograph clearly',
      body: 'Take a clear photo, add a plain description, and pick or create the room. Avoid value judgments in the description — the Personal Representative sets value and legal status.'
    },
    {
      heading: '4. Submit for review',
      body: 'Save the entry. It waits in Pending review until the Personal Representative approves it. Heirs do not see helper submissions as approved inventory until then.'
    },
    {
      heading: '5. Keep going room by room',
      body: 'Work one area at a time. If you leave, you can sign back in later with the same helper password.'
    }
  ],
  notes: 'Helpers cannot set legal status, value tier, or approve items for auction.'
};

export const AUCTION_ROLE_GUIDE = {
  title: 'Auction guide',
  summary: 'Browse approved lots, register when bidding opens, then follow pickup instructions.',
  steps: [
    {
      heading: '1. Browse the lots',
      body: 'Only items the Personal Representative approved for public sale appear here. Read descriptions and photos before bidding.'
    },
    {
      heading: '2. Wait for the open window',
      body: 'Before the start date you may browse, but bidding stays closed. The page shows when the auction opens and ends.'
    },
    {
      heading: '3. Register to bid',
      body: 'When bidding is open, register with your name, contact info, and a verified payment card, and accept the Terms of Estate Sale.'
    },
    {
      heading: '4. Place bids',
      body: 'Enter your bid on a lot. Leading bids update live. You are responsible for bids placed under your registration.'
    },
    {
      heading: '5. Arrange pickup',
      body: 'If you win, follow the estate pickup window set by the Personal Representative. Uncollected items may be handled under the estate rules.'
    }
  ],
  notes: 'The Personal Representative and estate managers may not register or bid on this public auction.'
};

/** Family follow-along auction guide (heir signed in, before public open). */
export function auctionFamilyFollowGuide({ isPreview = false } = {}) {
  if (isPreview) {
    return {
      title: 'Auction follow-along guide',
      summary: 'Watch lots as they are approved — bidding stays closed until the start date.',
      steps: [
        {
          heading: '1. Follow along early',
          body: 'As a signed-in heir, you can see this auction before it is public.'
        },
        {
          heading: '2. Watch approved lots appear',
          body: 'Lots show up here after the Personal Representative approves them for public sale.'
        },
        {
          heading: '3. Wait for bidding to open',
          body: 'Bidding stays closed until the auction start date. Return then if you want to register and bid.'
        },
        {
          heading: '4. Return to inventory anytime',
          body: 'Use Inventory / Family portal to go back to requests, messages, and your heir view.'
        }
      ],
      notes: 'Pickup follows the estate schedule set by the Personal Representative.'
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

/** Memorandum beneficiary presets — estate-agnostic. Add named heirs in Settings. */
export const BENEFICIARY_OPTIONS = ['Other'];

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

export const REVIEW_STATUS = {
  pending: 'pending_pr_review',
  approved: 'approved',
  rejected: 'rejected'
};

/**
 * Helper submissions stay out of heir and auction views until the PR approves
 * them, but they do appear in the PR's own room lists — so those lists have to
 * say which ones are still unreviewed.
 */
export function isPendingReview(item) {
  return item?.review_status === REVIEW_STATUS.pending;
}

/** "Added by Frank" when a helper submitted the item, otherwise ''. */
export function submittedByLabel(item) {
  if (!isPendingReview(item)) return '';
  const name = String(item?.created_by_name || '').trim();
  if (item?.created_by_role === 'helper') {
    return name ? `Added by ${name}` : 'Added by a helper';
  }
  return name ? `Added by ${name}` : '';
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

/** Auction Terms of Estate Sale — estate-agnostic version string (not a court case). */
export const AUCTION_TERMS_VERSION = 'estate-auction-terms-v2';

export function auctionTermsLines(pickupWindow) {
  const pickup =
    String(pickupWindow || '').trim() ||
    'dates posted by the Personal Representative';
  return [
    'You may browse lots before bidding opens. When the auction start date arrives, use Register (top right) to create a bidder account with your name, email, and phone.',
    'Registration requires a verified payment card and your acceptance of these Terms of Estate Sale. After you are registered, open any lot and submit a bid amount.',
    'By submitting a bid, you are entering into a legally binding contract to purchase if you win.',
    'All items are sold strictly AS-IS, WHERE-IS, with no refunds, guarantees, or warranties.',
    `Winning bidders are solely responsible for picking up their items at the designated pickup location on ${pickup}.`,
    'Packing, lifting, loading, and transport of items are the sole responsibility of the buyer.',
    'If you require shipping, you must contact the administrator prior to bidding to approve third-party shipping arrangements at your own exclusive expense.'
  ];
}
