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

/**
 * Display date for estate UI/exports. YYYY-MM-DD values are treated as local
 * calendar dates (no UTC off-by-one). Full timestamps use the local timezone.
 */
export function formatEstateDisplayDate(value) {
  if (!value) return null;
  const local = parseEstateLocalDate(value);
  if (local) {
    return local.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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

/** Alias — helper PINs use the same 6-digit rules as heir invites. */
export function generateHelperPin() {
  return generateHeirInviteCode();
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
      label: 'Sale/auction dates not set'
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
    label: endDate ? `Open through ${endDate}` : 'Sale/auction open'
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
    hint: 'Sees rooms by default and may request items from the remaining inventory'
  },
  {
    value: HEIR_ACCESS_TIER.memorandum,
    label: 'Specific Gift Recipient',
    hint: 'View-only — no item requests. Room browsing is OFF unless you enable it for this person'
  },
  {
    value: HEIR_ACCESS_TIER.both,
    label: 'Heir / Residual Beneficiary + Specific Gift Recipient',
    hint: 'Named for specific gifts and also shares in what remains — full rooms + requests'
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

/** How much estate finance residual beneficiaries may see. */
export const FAMILY_FINANCIAL_VISIBILITY = {
  minimal: 'minimal',
  standard: 'standard',
  full: 'full'
};

export const FAMILY_FINANCIAL_VISIBILITY_OPTIONS = [
  {
    value: FAMILY_FINANCIAL_VISIBILITY.minimal,
    label: 'Minimal',
    hint: 'Family sees only their own distribution receipts'
  },
  {
    value: FAMILY_FINANCIAL_VISIBILITY.standard,
    label: 'Standard (recommended)',
    hint: 'Asset categories, debts, expenses, distributions, and remaining balance'
  },
  {
    value: FAMILY_FINANCIAL_VISIBILITY.full,
    label: 'Full accounting',
    hint: 'Standard plus expense receipts and sale/auction lot detail'
  }
];

export function normalizeFamilyFinancialVisibility(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (t === FAMILY_FINANCIAL_VISIBILITY.standard || t === FAMILY_FINANCIAL_VISIBILITY.full) {
    return t;
  }
  return FAMILY_FINANCIAL_VISIBILITY.minimal;
}

export function familyFinancialVisibilityLabel(value) {
  return (
    FAMILY_FINANCIAL_VISIBILITY_OPTIONS.find(
      (o) => o.value === normalizeFamilyFinancialVisibility(value)
    )?.label || 'Minimal'
  );
}

/** Fiduciary label for a distribution batch. */
export const DISTRIBUTION_CLASSIFICATION = {
  preliminary: 'preliminary',
  partial: 'partial',
  final: 'final',
  specific_gift: 'specific_gift',
  reimbursement: 'reimbursement',
  expense_repayment: 'expense_repayment'
};

export const DISTRIBUTION_CLASSIFICATION_OPTIONS = [
  {
    value: DISTRIBUTION_CLASSIFICATION.preliminary,
    label: 'Preliminary distribution',
    hint: 'Early payment before the estate is fully settled'
  },
  {
    value: DISTRIBUTION_CLASSIFICATION.partial,
    label: 'Partial distribution',
    hint: 'Part of an expected residual share — more may follow'
  },
  {
    value: DISTRIBUTION_CLASSIFICATION.final,
    label: 'Final distribution',
    hint: 'Closing residual payment for this recipient / estate'
  },
  {
    value: DISTRIBUTION_CLASSIFICATION.specific_gift,
    label: 'Specific gift transfer',
    hint: 'Memorandum or will gift of named property'
  },
  {
    value: DISTRIBUTION_CLASSIFICATION.reimbursement,
    label: 'Reimbursement',
    hint: 'Repaying someone who covered an estate cost'
  },
  {
    value: DISTRIBUTION_CLASSIFICATION.expense_repayment,
    label: 'Expense repayment',
    hint: 'Repaying a documented estate expense advanced by a person'
  }
];

export function normalizeDistributionClassification(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (Object.values(DISTRIBUTION_CLASSIFICATION).includes(t)) return t;
  return DISTRIBUTION_CLASSIFICATION.partial;
}

export function distributionClassificationLabel(value) {
  return (
    DISTRIBUTION_CLASSIFICATION_OPTIONS.find(
      (o) => o.value === normalizeDistributionClassification(value)
    )?.label || 'Partial distribution'
  );
}

export function isMemorandumOnlyHeir(accessTier) {
  return normalizeHeirAccessTier(accessTier) === HEIR_ACCESS_TIER.memorandum;
}

/** Residual / both may request; specific-gift (memorandum) is browse-only. */
export function heirCanRequestItems(accessTier) {
  return !isMemorandumOnlyHeir(accessTier);
}

/**
 * Effective room browse: residual/both always; memorandum only when PR enables can_browse_rooms.
 * @param {{ access_tier?: string, can_browse_rooms?: boolean }|string|null} sessionOrTier
 * @param {boolean} [canBrowseRoomsFlag]
 */
export function heirCanBrowseRooms(sessionOrTier, canBrowseRoomsFlag) {
  if (sessionOrTier && typeof sessionOrTier === 'object') {
    const tier = normalizeHeirAccessTier(sessionOrTier.access_tier);
    if (tier === HEIR_ACCESS_TIER.residual || tier === HEIR_ACCESS_TIER.both) return true;
    return Boolean(sessionOrTier.can_browse_rooms);
  }
  const tier = normalizeHeirAccessTier(sessionOrTier);
  if (tier === HEIR_ACCESS_TIER.residual || tier === HEIR_ACCESS_TIER.both) return true;
  return Boolean(canBrowseRoomsFlag);
}

/**
 * What this heir role means (capabilities) — used under the name badge / “Your role” modal.
 * Separate from heirRoleGuide() which is the how-to steps for the Guide button.
 * Keep labels short; put detail in tip for hover/tap tooltips.
 */
export function heirRoleMeaning(accessTier, options = {}) {
  const tier = normalizeHeirAccessTier(accessTier);
  const canBrowse = heirCanBrowseRooms({
    access_tier: tier,
    can_browse_rooms: options.canBrowseRooms
  });

  const tipGifts = {
    label: 'Review gifts named for you',
    tip: 'Open Rooms (or My gifts) to see items named for you in a personal property memorandum. Check photos and descriptions so you know what was set aside for you.'
  };
  const tipBrowseView = {
    label: 'Browse rooms and collections',
    tip: 'Open Rooms & inventory to look through collections and items. Take your time room by room and use search if you need to find something by name.'
  };
  const tipBrowseFull = {
    label: 'Browse rooms and inventory',
    tip: 'Open Rooms & inventory to explore the full estate list. Tap a room to see its items, photos, and status before you decide what to request.'
  };
  const tipRequest = {
    label: 'Request items and cancel your own requests',
    tip: 'On an item, choose Request and give a short reason. Open My requests later to review anything you asked for, or cancel a request while it is still open.'
  };
  const tipNoInterest = {
    label: 'Mark no interest for remaining items in a room',
    tip: 'After you finish with a room, use “No interest in remaining items in this room.” That covers the rest of that room in one step and skips anything you already requested.'
  };
  const tipStatus = {
    label: 'View inheritance, updates, overview, and timeline',
    tip: 'My inheritance shows distributions recorded for you. Family updates are reports from the Personal Representative. Estate overview and Timeline give status and milestones as the estate moves forward.'
  };
  const tipMessages = {
    label: 'Message the Personal Representative',
    tip: 'Open Messages for a private, saved conversation with the Personal Representative. Questions and answers stay with the estate record.'
  };
  const tipAuction = {
    label: 'Follow sale / auction listings',
    tip: 'Open Sale & auction to watch lots approved for public sale. Useful when you want to see what is headed to the public listing.'
  };
  const tipHelp = {
    label: 'Open Help / FAQ anytime',
    tip: 'Help / FAQ answers common questions about this portal. You can also replay Show me around from the welcome card for a guided walkthrough.'
  };

  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return {
      title: 'Specific Gift Recipient',
      summary: canBrowse
        ? 'Review gifts named for you, and browse rooms when that access is open.'
        : 'Review gifts named for you.',
      canDo: canBrowse
        ? [tipGifts, tipBrowseView, tipMessages, tipAuction, tipHelp]
        : [tipGifts, tipMessages, tipAuction, tipHelp],
      details: '',
      notes: ''
    };
  }
  if (tier === HEIR_ACCESS_TIER.both) {
    return {
      title: 'Heir / Residual Beneficiary + Specific Gift Recipient',
      summary: 'Review named gifts, then browse, request, and release from the remaining inventory.',
      canDo: [
        tipGifts,
        tipBrowseFull,
        tipRequest,
        tipNoInterest,
        tipStatus,
        tipMessages,
        tipAuction
      ],
      details: '',
      notes: ''
    };
  }
  return {
    title: 'Heir / Residual Beneficiary',
    summary: 'Browse inventory, request what you want, and release what you do not.',
    canDo: [tipBrowseFull, tipRequest, tipNoInterest, tipStatus, tipMessages, tipAuction],
    details: '',
    notes: ''
  };
}

/**
 * Role how-to guides: one-line summary + numbered steps.
 * Prefer heirRolePortalGuide() for the family Menu / badge modal (meaning + steps).
 * @returns {{ title: string, summary: string, details: string, steps: Array<{heading: string, body: string}>, notes?: string }}
 */
export function heirRoleGuide(accessTier, options = {}) {
  const tier = normalizeHeirAccessTier(accessTier);
  const canBrowse = heirCanBrowseRooms({
    access_tier: tier,
    can_browse_rooms: options.canBrowseRooms
  });
  if (tier === HEIR_ACCESS_TIER.memorandum) {
    return {
      title: 'Specific Gift Recipient guide',
      summary: canBrowse
        ? 'Review gifts named for you, and browse rooms when that access is open.'
        : 'Review gifts named for you.',
      steps: [
        {
          heading: '1. Start with Messages or Inheritance',
          body: 'Ask the Personal Representative questions, and open My inheritance for anything already recorded for you.'
        },
        {
          heading: '2. Review your gifts',
          body: canBrowse
            ? 'Open Rooms to browse collections and review gifts named for you.'
            : 'Open Rooms when gifts are listed for you and review those items.'
        },
        {
          heading: '3. Stay oriented',
          body: 'Use Family updates, Timeline, and Help / FAQ when you want status or answers.'
        }
      ],
      notes: ''
    };
  }
  if (tier === HEIR_ACCESS_TIER.both) {
    return {
      title: 'Heir / Residual Beneficiary + Specific Gift Recipient guide',
      summary: 'Review named gifts, then browse, request, and release from the remaining inventory.',
      steps: [
        {
          heading: '1. Check gifts and inheritance',
          body: 'Open My inheritance and review gifts named for you first.'
        },
        {
          heading: '2. Browse and request',
          body: 'Open Rooms, request what you want, and use no interest for remaining items in a room when you are done there.'
        },
        {
          heading: '3. Track and follow up',
          body: 'Use My requests, Messages, and Sale & auction to track claims and public lots.'
        }
      ],
      notes: ''
    };
  }
  return {
    title: 'Heir / Residual Beneficiary guide',
    summary: 'Browse inventory, request items you want, and release what you do not.',
    steps: [
      {
        heading: '1. Browse by room',
        body: 'Open Rooms & inventory and review items room by room.'
      },
      {
        heading: '2. Request or release',
        body: 'Request what you want. When finished with a room, use no interest for remaining items there.'
      },
      {
        heading: '3. Track and stay in touch',
        body: 'Use My requests, Messages, Inheritance, and Sale & auction as the estate moves forward.'
      }
    ],
    notes: ''
  };
}

/**
 * Family badge modal: short summary, can-do list, then a few steps.
 */
export function heirRolePortalGuide(accessTier, options = {}) {
  const meaning = heirRoleMeaning(accessTier, options);
  const guide = heirRoleGuide(accessTier, options);
  return {
    title: meaning.title,
    summary: meaning.summary,
    details: '',
    canDo: Array.isArray(meaning.canDo) ? meaning.canDo : [],
    steps: guide.steps,
    notes: ''
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
      body: 'Create rooms, add items with photos, and capture Scene documentation for what you walked into. Under Settings → Helpers, add each assistant with the name they will type at login and a unique PIN — their submissions wait in Pending review.'
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
      body: 'Review heir requests and helper submissions. Approve items for sale/auction carefully. The Personal Representative may not bid on the public sale/auction.'
    },
    {
      heading: '6. Export for court',
      body: 'Use Reports for the court evidence pack, printable catalog, read-only snapshot, or JSON backup. Close the estate in Settings → Records only after the work is finished.'
    }
  ],
  notes: 'Use the Estate progress timeline and Next steps panel as your checklist. Open Menu → Your role anytime for guidance.'
};

export const HELPER_ROLE_GUIDE = {
  title: 'Helper / Inventory Taker guide',
  summary: 'Photograph and describe items and scenes — the Personal Representative finishes legal status later.',
  steps: [
    {
      heading: '1. Sign in with your name and PIN',
      body: 'Use the exact name and 6-digit PIN the Personal Representative set for you under Settings → Helpers. Your name is stamped on every photo and note you submit.'
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
      body: 'Work one area at a time. If you leave, sign back in later with the same name and PIN.'
    }
  ],
  notes: 'Helpers cannot set legal status, value tier, or approve items for sale/auction.'
};

export const AUCTION_ROLE_GUIDE = {
  title: 'Sale/auction guide',
  summary: 'Browse approved lots, register when bidding opens, then follow pickup instructions.',
  steps: [
    {
      heading: '1. Browse the lots',
      body: 'Only items the Personal Representative approved for public sale appear here. Read descriptions and photos before bidding.'
    },
    {
      heading: '2. Wait for the open window',
      body: 'Before the start date you may browse, but bidding stays closed. The page shows when the sale/auction opens and ends.'
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
  notes: 'The Personal Representative and estate managers may not register or bid on this public sale/auction.'
};

/** Family follow-along auction guide (heir signed in, before public open). */
export function auctionFamilyFollowGuide({ isPreview = false } = {}) {
  if (isPreview) {
    return {
      title: 'Sale/auction follow-along guide',
      summary: 'Watch lots as they are approved — bidding stays closed until the start date.',
      steps: [
        {
          heading: '1. Follow along early',
          body: 'As a signed-in heir, you can see this sale/auction before it is public.'
        },
        {
          heading: '2. Watch approved lots appear',
          body: 'Lots show up here after the Personal Representative approves them for public sale.'
        },
        {
          heading: '3. Wait for bidding to open',
          body: 'Bidding stays closed until the sale/auction start date. Return then if you want to register and bid.'
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

/** Physical condition of an inventory item */
export const ITEM_CONDITION = {
  excellent: 'excellent',
  good: 'good',
  fair: 'fair',
  poor: 'poor'
};

export const ITEM_CONDITION_OPTIONS = [
  { value: ITEM_CONDITION.excellent, label: 'Excellent' },
  { value: ITEM_CONDITION.good, label: 'Good' },
  { value: ITEM_CONDITION.fair, label: 'Fair' },
  { value: ITEM_CONDITION.poor, label: 'Poor' }
];

/** @returns {'excellent'|'good'|'fair'|'poor'|null} */
export function normalizeItemCondition(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (Object.values(ITEM_CONDITION).includes(v)) return v;
  return null;
}

export function itemConditionLabel(value) {
  return ITEM_CONDITION_OPTIONS.find((o) => o.value === value)?.label || value || '—';
}

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
 * Helper submissions stay out of heir and sale/auction views until the PR approves
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

/**
 * Items kept out of the open room inventory list (shown under Claimed / memo / disputed).
 */
export function isSettledOrClaimedInventoryItem(item) {
  if (!item) return false;
  if (item.legal_status === LEGAL_STATUS.claimed_memorandum) return true;
  if (item.legal_status === LEGAL_STATUS.distributed) return true;
  if (item.legal_status === LEGAL_STATUS.disputed) return true;
  if (item.is_memorandum_asset) return true;
  return claimCount(item) > 0;
}

/**
 * Who may open the Claimed / memo / disputed room filter.
 * PR/admin: always. Helpers: never. Family: only when room browse is allowed for their role.
 * @param {{ role?: string, access_tier?: string, can_browse_rooms?: boolean }|string|null} viewer
 */
export function canAccessClaimedInventoryFilter(viewer) {
  if (viewer == null) return false;
  if (typeof viewer === 'string') {
    const role = viewer.toLowerCase();
    if (role === 'admin' || role === 'pr' || role === 'personal_representative') return true;
    if (role === 'helper') return false;
    return false;
  }
  const role = String(viewer.role || '').toLowerCase();
  if (role === 'admin' || role === 'pr' || role === 'personal_representative') return true;
  if (role === 'helper') return false;
  if (role === 'heir' || role === 'sibling' || role === 'family') {
    return heirCanBrowseRooms(viewer);
  }
  // Session-shaped heir object without explicit role
  if (viewer.access_tier != null || viewer.can_browse_rooms != null) {
    return heirCanBrowseRooms(viewer);
  }
  return false;
}

export function claimCount(item) {
  return normalizeSiblingClaims(item?.sibling_claims).length;
}

/** Sale/auction Terms of Estate Sale — estate-agnostic version string (not a court case). */
export const AUCTION_TERMS_VERSION = 'estate-auction-terms-v2';

export function auctionTermsLines(pickupWindow) {
  const pickup =
    String(pickupWindow || '').trim() ||
    'dates posted by the Personal Representative';
  return [
    'You may browse lots before bidding opens. When the sale/auction start date arrives, use Register (top right) to create a bidder account with your name, email, and phone.',
    'Registration requires a verified payment card and your acceptance of these Terms of Estate Sale. After you are registered, open any lot and submit a bid amount.',
    'By submitting a bid, you are entering into a legally binding contract to purchase if you win.',
    'All items are sold strictly AS-IS, WHERE-IS, with no refunds, guarantees, or warranties.',
    `Winning bidders are solely responsible for picking up their items at the designated pickup location on ${pickup}.`,
    'Packing, lifting, loading, and transport of items are the sole responsibility of the buyer.',
    'If you require shipping, you must contact the administrator prior to bidding to approve third-party shipping arrangements at your own exclusive expense.'
  ];
}
