/**
 * Per-heir visibility sections — portal tiles + estate overview blocks.
 * Minimal / Standard / Full remain presets that fill this map.
 * Portal tile defaults follow access role (residual / Specific Gift / both).
 */

import {
  FAMILY_FINANCIAL_VISIBILITY,
  normalizeFamilyFinancialVisibility,
  isMemorandumOnlyHeir,
  normalizeHeirAccessTier,
  HEIR_ACCESS_TIER
} from './estateInventoryConstants.js';

export const VISIBILITY_PORTAL_SECTIONS = [
  { key: 'messages', label: 'Messages' },
  { key: 'my_requests', label: 'My requests' },
  { key: 'family_updates', label: 'Family Updates' },
  { key: 'estate_overview', label: 'Estate overview' },
  { key: 'rooms_inventory', label: 'Rooms & inventory' },
  { key: 'my_inheritance', label: 'My inheritance' },
  { key: 'sale_auction', label: 'Sale inventory' }
];

export const VISIBILITY_OVERVIEW_SECTIONS = [
  { key: 'inventory_status', label: 'Inventory status' },
  { key: 'auction_status', label: 'Sale inventory status counts' },
  { key: 'your_distributions', label: 'Your distributions' },
  { key: 'estate_holds', label: 'What the estate holds' },
  { key: 'estate_owes', label: 'What the estate owes' },
  { key: 'accounts_list', label: 'Accounts & debts list' },
  { key: 'distribution_summary', label: 'Distribution summary' },
  { key: 'expenses_list', label: 'Expenses list' },
  { key: 'auction_proceeds', label: 'Sale proceeds' },
  { key: 'expense_receipts', label: 'Expense receipt links' },
  { key: 'auction_lots', label: 'Sale inventory lot detail' }
];

export const VISIBILITY_SECTION_KEYS = [
  ...VISIBILITY_PORTAL_SECTIONS.map((s) => s.key),
  ...VISIBILITY_OVERVIEW_SECTIONS.map((s) => s.key)
];

const ALL_FALSE = () =>
  Object.fromEntries(VISIBILITY_SECTION_KEYS.map((key) => [key, false]));

const MINIMAL_OVERVIEW = {
  inventory_status: true,
  auction_status: true,
  your_distributions: true,
  estate_holds: false,
  estate_owes: false,
  accounts_list: false,
  distribution_summary: false,
  expenses_list: false,
  auction_proceeds: false,
  expense_receipts: false,
  auction_lots: false
};

const STANDARD_OVERVIEW = {
  ...MINIMAL_OVERVIEW,
  estate_holds: true,
  estate_owes: true,
  accounts_list: true,
  distribution_summary: true,
  expenses_list: true,
  auction_proceeds: true
};

const FULL_OVERVIEW = {
  ...STANDARD_OVERVIEW,
  expense_receipts: true,
  auction_lots: true
};

/**
 * Portal tile defaults from access role (matches heir role settings).
 * Specific Gift: no requests; rooms off unless PR enables.
 * Residual / both: requests + rooms on.
 */
export function portalSectionsForAccessTier(accessTier) {
  const tier = normalizeHeirAccessTier(accessTier);
  const memoOnly = tier === HEIR_ACCESS_TIER.memorandum;
  return {
    messages: true,
    my_requests: !memoOnly,
    family_updates: true,
    estate_overview: true,
    rooms_inventory: !memoOnly,
    my_inheritance: true,
    sale_auction: true
  };
}

/** @param {string} tier financial preset
 *  @param {string} [accessTier]
 */
export function visibilitySectionsForPreset(tier, accessTier = HEIR_ACCESS_TIER.residual) {
  const t = normalizeFamilyFinancialVisibility(tier);
  const overview =
    t === FAMILY_FINANCIAL_VISIBILITY.full
      ? FULL_OVERVIEW
      : t === FAMILY_FINANCIAL_VISIBILITY.standard
        ? STANDARD_OVERVIEW
        : MINIMAL_OVERVIEW;
  return {
    ...ALL_FALSE(),
    ...portalSectionsForAccessTier(accessTier),
    ...overview
  };
}

/**
 * @param {unknown} raw
 * @param {{ tier?: string, accessTier?: string, canBrowseRooms?: boolean|null }|undefined} ctx
 */
export function normalizeVisibilitySections(raw, ctx = {}) {
  const accessTier = normalizeHeirAccessTier(ctx.accessTier);
  const memoOnly = isMemorandumOnlyHeir(accessTier);
  const tier = memoOnly
    ? FAMILY_FINANCIAL_VISIBILITY.minimal
    : normalizeFamilyFinancialVisibility(ctx.tier);
  const base = visibilitySectionsForPreset(tier, accessTier);
  const incoming =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;

  const out = { ...base };
  if (incoming) {
    for (const key of VISIBILITY_SECTION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        out[key] = Boolean(incoming[key]);
      }
    }
  }

  if (memoOnly) {
    // Role cannot request items — keep My requests off
    out.my_requests = false;
    // Prefer stored browse flag when present (role default is OFF)
    if (ctx.canBrowseRooms != null) {
      out.rooms_inventory = Boolean(ctx.canBrowseRooms);
    }
    // Finance locked to minimal overview set
    const minimal = visibilitySectionsForPreset(
      FAMILY_FINANCIAL_VISIBILITY.minimal,
      accessTier
    );
    for (const { key } of VISIBILITY_OVERVIEW_SECTIONS) {
      if (!minimal[key]) out[key] = false;
    }
    if (out.inventory_status || out.auction_status || out.your_distributions) {
      out.estate_overview = true;
    }
  }

  // Overview blocks require the overview tile
  if (!out.estate_overview) {
    for (const { key } of VISIBILITY_OVERVIEW_SECTIONS) {
      out[key] = false;
    }
  }

  return out;
}

/** True when the map matches a preset exactly for this access role. */
export function sectionsMatchPreset(sections, accessTier = HEIR_ACCESS_TIER.residual) {
  const normalized = normalizeVisibilitySections(sections, { accessTier });
  for (const tier of [
    FAMILY_FINANCIAL_VISIBILITY.minimal,
    FAMILY_FINANCIAL_VISIBILITY.standard,
    FAMILY_FINANCIAL_VISIBILITY.full
  ]) {
    const preset = visibilitySectionsForPreset(tier, accessTier);
    const same = VISIBILITY_SECTION_KEYS.every(
      (key) => Boolean(normalized[key]) === Boolean(preset[key])
    );
    if (same) return tier;
  }
  return null;
}

export function visibilitySectionEnabled(sections, key) {
  if (!key) return false;
  if (!sections || typeof sections !== 'object') return false;
  return Boolean(sections[key]);
}

export default {
  VISIBILITY_PORTAL_SECTIONS,
  VISIBILITY_OVERVIEW_SECTIONS,
  VISIBILITY_SECTION_KEYS,
  portalSectionsForAccessTier,
  visibilitySectionsForPreset,
  normalizeVisibilitySections,
  sectionsMatchPreset,
  visibilitySectionEnabled
};
