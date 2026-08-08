import { supabase } from '../config/supabase.js';
import {
  LEGAL_STATUS,
  normalizeEstateCaseNumber,
  isOpenEstateCase,
  resolveAuctionWindow,
  resolveProbateWindow,
  normalizeDescendantsInterestPct,
  estateDisplayCaseNumber,
  normalizeFamilyFinancialVisibility,
  normalizeDistributionClassification,
  familyFinancialVisibilityLabel,
  normalizeItemCondition
} from '../utils/estateInventoryConstants.js';
import { normalizeVisibilitySections } from '../utils/estateVisibilitySections.js';
import { estateBackendBase } from '../utils/estateBackend.js';
import {
  extractPhotoMetadata,
  buildPhotoEntry,
  getPhotoEntries,
  MAX_ITEM_PHOTOS,
  ITEM_PHOTO_SLOT_MAX
} from '../utils/estatePhotoMeta.js';
import { buildReadOnlyHtml, buildCatalogJson } from '../utils/estateExport.js';
import {
  mapSqlFinanceSnapshot,
  roundMoney
} from '../utils/estateFinance.js';
import {
  normalizeAccountType,
  countsAsFundsDefaultForType
} from '../utils/estateAccountTypes.js';
import { isKnownContactCategory } from '../utils/estateContactTypes.js';
import { roomTitleWithCode } from '../utils/estateInventoryRefCode.js';
import { logEstateActivity, listEstateActivityEvents, writeEstateActivity } from './estateActivityLog.js';
import { notifyEstateOperator } from './estateVaultAuth.js';
import {
  addAccountTransaction,
  deleteAccountTransaction,
  enrichAccountsWithFunds,
  listAccountTransactions,
  listAccountTransactionsForEstate,
  reverseLinkedFundsTransactions,
  syncExpenseFundsAmount,
  syncAccountComputedBalance
} from './estateFundsLedger.js';
import { sealCourtPack } from '../utils/estateCourtPack.js';
import { getPrProfile } from './estatePrIdentityService.js';
import { buildFormalAccountingStatement } from '../utils/estateFormalAccounting.js';
import { buildFamilyUpdatePackage } from '../utils/estateFamilyUpdate.js';
import { buildCompletenessCertificate } from '../utils/estateCompleteness.js';
import { buildAdministrationChronology } from '../utils/estateAdministrationChronology.js';
import { buildGiftResidualSchedule } from '../utils/estateGiftResidualSchedule.js';
import { transformImageSource } from '../utils/estateImageTransform.js';

const PHOTO_BUCKET = 'estate-inventory-photos';
const EXPORT_BUCKET = 'estate-inventory-exports';
const FINANCE_DOCUMENT_BUCKET = 'estate-finance-documents';
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;

const ITEM_SELECT =
  'id, collection_id, owner_id, estate_id, name, notes, photo_url, photo_urls, legal_status, value_tier, item_condition, condition_notes, estimated_value, valuation_date, valuation_source, valuation_notes, is_memorandum_asset, assigned_beneficiary, descendants_interest, descendants_interest_pct, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, disputed_at, distributed_at, sibling_claims, family_releases, approved_for_sale, highest_bid, highest_bidder_name, highest_bidder_email, highest_bidder_phone, bid_updated_at, auction_paid_at, auction_proceeds_where, review_status, created_by_role, created_by_name, reviewed_at, is_approved_by_pr, change_history, room_number, item_number, created_at, updated_at';

/** Before inventory ref-code migration. */
const ITEM_SELECT_NO_REF =
  'id, collection_id, owner_id, estate_id, name, notes, photo_url, photo_urls, legal_status, value_tier, item_condition, condition_notes, estimated_value, valuation_date, valuation_source, valuation_notes, is_memorandum_asset, assigned_beneficiary, descendants_interest, descendants_interest_pct, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, disputed_at, distributed_at, sibling_claims, family_releases, approved_for_sale, highest_bid, highest_bidder_name, highest_bidder_email, highest_bidder_phone, bid_updated_at, auction_paid_at, auction_proceeds_where, review_status, created_by_role, created_by_name, reviewed_at, is_approved_by_pr, change_history, created_at, updated_at';

const SETTINGS_SELECT =
  'id, owner_id, owner_email, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, accounting_method, family_financial_visibility, will_reference, memorandum_reference, residual_notes, equalization_notes, inventory_completed_at, inventory_completed_by, inventory_reopened_at, inventory_reopen_reason, closed_at, closed_by, close_reason, reopened_at, reopen_reason, created_at, updated_at';

/** Pre OS-quality governing-instrument columns. */
const SETTINGS_SELECT_NO_INSTRUMENT =
  'id, owner_id, owner_email, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, accounting_method, family_financial_visibility, inventory_completed_at, inventory_completed_by, inventory_reopened_at, inventory_reopen_reason, closed_at, closed_by, close_reason, reopened_at, reopen_reason, created_at, updated_at';

/** Pre-family-transparency migration, but with inventory completion. */
const SETTINGS_SELECT_NO_VISIBILITY =
  'id, owner_id, owner_email, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, accounting_method, inventory_completed_at, inventory_completed_by, inventory_reopened_at, inventory_reopen_reason, closed_at, closed_by, close_reason, reopened_at, reopen_reason, created_at, updated_at';

/** Pre-inventory-completion migration, but with court-accounting fields. */
const SETTINGS_SELECT_NO_COMPLETION =
  'id, owner_id, owner_email, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, accounting_method, closed_at, closed_by, close_reason, reopened_at, reopen_reason, created_at, updated_at';

/** Pre-court-accounting-upgrade select — used when the new columns are not migrated yet. */
const SETTINGS_SELECT_LEGACY =
  'id, owner_id, owner_email, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, closed_at, closed_by, close_reason, reopened_at, reopen_reason, created_at, updated_at';

const ITEM_SELECT_LEGACY =
  'id, collection_id, owner_id, estate_id, name, notes, photo_url, photo_urls, legal_status, value_tier, is_memorandum_asset, assigned_beneficiary, descendants_interest, descendants_interest_pct, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, disputed_at, distributed_at, sibling_claims, family_releases, approved_for_sale, highest_bid, highest_bidder_name, highest_bidder_email, highest_bidder_phone, bid_updated_at, auction_paid_at, review_status, created_by_role, created_by_name, reviewed_at, is_approved_by_pr, change_history, created_at, updated_at';

function isMissingColumnError(error, columnName) {
  const msg = error?.message || String(error || '');
  if (!columnName) {
    return /column .* does not exist|Could not find the .* column/i.test(msg);
  }
  const escaped = String(columnName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i').test(msg) && /does not exist|could not find/i.test(msg);
}

/** Prefer upgraded columns; fall back once if the SQL migration has not been applied. */
let settingsSelect = SETTINGS_SELECT;
let itemSelect = ITEM_SELECT;

async function selectSettings(applyFilters) {
  let q = applyFilters(supabase.from('estate_settings').select(settingsSelect));
  let { data, error } = await q;
  if (
    error &&
    (isMissingColumnError(error, 'will_reference') ||
      isMissingColumnError(error, 'memorandum_reference') ||
      isMissingColumnError(error, 'residual_notes') ||
      isMissingColumnError(error, 'equalization_notes'))
  ) {
    settingsSelect = SETTINGS_SELECT_NO_INSTRUMENT;
    q = applyFilters(supabase.from('estate_settings').select(settingsSelect));
    ({ data, error } = await q);
  }
  if (error && isMissingColumnError(error, 'family_financial_visibility')) {
    settingsSelect = SETTINGS_SELECT_NO_VISIBILITY;
    q = applyFilters(supabase.from('estate_settings').select(settingsSelect));
    ({ data, error } = await q);
  }
  if (
    error &&
    (isMissingColumnError(error, 'inventory_completed_at') ||
      isMissingColumnError(error, 'inventory_completed_by') ||
      isMissingColumnError(error, 'inventory_reopened_at') ||
      isMissingColumnError(error, 'inventory_reopen_reason'))
  ) {
    settingsSelect = SETTINGS_SELECT_NO_COMPLETION;
    q = applyFilters(supabase.from('estate_settings').select(settingsSelect));
    ({ data, error } = await q);
  }
  if (error && isMissingColumnError(error, 'accounting_method')) {
    settingsSelect = SETTINGS_SELECT_LEGACY;
    q = applyFilters(supabase.from('estate_settings').select(settingsSelect));
    ({ data, error } = await q);
    if (data) {
      if (Array.isArray(data)) {
        data = data.map((row) => ({ ...row, accounting_method: 'current_balances' }));
      } else {
        data = { ...data, accounting_method: 'current_balances' };
      }
    }
  }
  if (data) {
    const addDefaults = (row) => ({
      ...row,
      family_financial_visibility: row.family_financial_visibility || 'minimal',
      will_reference: row.will_reference || null,
      memorandum_reference: row.memorandum_reference || null,
      residual_notes: row.residual_notes || null,
      equalization_notes: row.equalization_notes || null,
      inventory_completed_at: row.inventory_completed_at || null,
      inventory_completed_by: row.inventory_completed_by || null,
      inventory_reopened_at: row.inventory_reopened_at || null,
      inventory_reopen_reason: row.inventory_reopen_reason || null
    });
    data = Array.isArray(data) ? data.map(addDefaults) : addDefaults(data);
  }
  return { data, error };
}

async function selectItems(applyFilters) {
  let q = applyFilters(supabase.from('estate_items').select(itemSelect));
  let { data, error } = await q;
  if (
    error &&
    (isMissingColumnError(error, 'room_number') || isMissingColumnError(error, 'item_number'))
  ) {
    itemSelect = ITEM_SELECT_NO_REF;
    q = applyFilters(supabase.from('estate_items').select(itemSelect));
    ({ data, error } = await q);
  }
  if (
    error &&
    (isMissingColumnError(error, 'estimated_value') ||
      isMissingColumnError(error, 'valuation_date') ||
      isMissingColumnError(error, 'valuation_source') ||
      isMissingColumnError(error, 'valuation_notes') ||
      isMissingColumnError(error, 'item_condition') ||
      isMissingColumnError(error, 'condition_notes'))
  ) {
    itemSelect = ITEM_SELECT_LEGACY;
    q = applyFilters(supabase.from('estate_items').select(itemSelect));
    ({ data, error } = await q);
  }
  return { data, error };
}

async function allocateCollectionNumber(estateId) {
  if (!estateId) return null;
  const { data, error } = await supabase.rpc('estate_next_collection_number', {
    p_estate_id: estateId
  });
  if (!error && data != null && Number.isFinite(Number(data))) {
    return Math.floor(Number(data));
  }
  const { data: rows, error: maxErr } = await supabase
    .from('estate_collections')
    .select('collection_number')
    .eq('estate_id', estateId)
    .not('collection_number', 'is', null)
    .order('collection_number', { ascending: false })
    .limit(1);
  if (maxErr || isMissingColumnError(maxErr, 'collection_number')) return null;
  return (Number(rows?.[0]?.collection_number) || 0) + 1;
}

async function allocateItemNumber(estateId, roomNumber) {
  if (!estateId || roomNumber == null) return null;
  const { data, error } = await supabase.rpc('estate_next_item_number', {
    p_estate_id: estateId,
    p_room_number: roomNumber
  });
  if (!error && data != null && Number.isFinite(Number(data))) {
    return Math.floor(Number(data));
  }
  const { data: rows, error: maxErr } = await supabase
    .from('estate_items')
    .select('item_number')
    .eq('estate_id', estateId)
    .eq('room_number', roomNumber)
    .not('item_number', 'is', null)
    .order('item_number', { ascending: false })
    .limit(1);
  if (maxErr || isMissingColumnError(maxErr, 'item_number')) return null;
  return (Number(rows?.[0]?.item_number) || 0) + 1;
}

async function ensureCollectionNumber(collectionRow, estateId) {
  const existing = Number(collectionRow?.collection_number);
  if (Number.isFinite(existing) && existing >= 1) return Math.floor(existing);
  if (!estateId || !collectionRow?.id) return null;
  const next = await allocateCollectionNumber(estateId);
  if (next == null) return null;
  const { error } = await supabase
    .from('estate_collections')
    .update({ collection_number: next })
    .eq('id', collectionRow.id)
    .is('collection_number', null);
  if (error && isMissingColumnError(error, 'collection_number')) return null;
  return next;
}

const SIBLING_SESSION_KEY = 'estate-sibling-session';
const ADMIN_UNLOCK_KEY = 'estate-admin-unlocked';
const HELPER_SESSION_KEY = 'estate-helper-session';
const ADVISOR_SESSION_KEY = 'estate-advisor-session';
const AUCTION_BIDDER_KEY = 'estate-auction-bidder';
const ADMIN_MUST_CHANGE_KEY = 'estate-admin-must-change-password';

/** Active case for admin/service calls (set from EstateCaseContext / route). */
let activeEstateCase = '';

export function setActiveEstateCase(caseNumber) {
  const next = normalizeEstateCaseNumber(caseNumber) || '';
  const prev = activeEstateCase;
  activeEstateCase = next;
  clearOwnedEstateCache();
  if (next && prev && next !== prev) {
    try {
      const sibling = getStoredSiblingSession();
      if (sibling?.case_number && normalizeEstateCaseNumber(sibling.case_number) !== next) {
        clearSiblingSession();
      }
    } catch {
      /* ignore */
    }
    try {
      const helper = getStoredHelperSession();
      if (helper?.case_number && normalizeEstateCaseNumber(helper.case_number) !== next) {
        clearHelperSession();
      }
    } catch {
      /* ignore */
    }
    try {
      const advisor = getStoredAdvisorSession();
      if (advisor?.case_number && normalizeEstateCaseNumber(advisor.case_number) !== next) {
        clearAdvisorSession();
      }
    } catch {
      /* ignore */
    }
  }
  if (next && next !== prev) {
    let sessionToken = null;
    try {
      sessionToken =
        getStoredSiblingSession(next)?.token ||
        getStoredHelperSession(next)?.token ||
        getStoredAdvisorSession(next)?.token ||
        null;
    } catch {
      /* ignore */
    }
    logEstateActivity({
      eventType: 'estate_open',
      caseNumber: next,
      sessionToken
    });
  }
  return activeEstateCase;
}

export function getActiveEstateCase() {
  return activeEstateCase || '';
}

/** Prefer explicit arg, then route-active case. Never invent a default court case. */
function resolveCaseArg(caseNumber) {
  return normalizeEstateCaseNumber(caseNumber || activeEstateCase) || '';
}

/** Multi-estate: require a resolved estate_id — no owner-wide / legacy path. */
function assertEstateScoped(estate) {
  if (!estate?.ok) return { ok: false, error: estate?.error || 'Could not resolve estate.' };
  if (estate.legacy || !estate.estateId) {
    return {
      ok: false,
      error:
        'Could not resolve this estate case. Multi-estate isolation requires a database update — run estate-multi-estate-foundation.sql, then refresh.'
    };
  }
  return { ok: true };
}

function rpcFail(data, error) {
  if (error) return fail(error);
  if (data?.success === false) return fail(data.error || 'Request failed.');
  return null;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { ok: false, error: error?.message || 'Please sign in to continue.' };
  }
  return { ok: true, userId: data.user.id };
}

/** Short-lived cache — collapses auth/settings round-trips during home fan-out. */
const ownedEstateCache = new Map();
const OWNED_ESTATE_TTL_MS = 5000;

export function clearOwnedEstateCache(caseNumber) {
  if (!caseNumber) {
    ownedEstateCache.clear();
    return;
  }
  const cn = normalizeEstateCaseNumber(caseNumber);
  for (const key of [...ownedEstateCache.keys()]) {
    if (key.endsWith(`:${cn}`)) ownedEstateCache.delete(key);
  }
}

function fail(error) {
  const raw = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
  const missingTable =
    /schema cache|could not find the table|relation .* does not exist|column .* does not exist/i.test(raw);
  if (missingTable) {
    return {
      success: false,
      error:
        'Estate Vault needs a database update. In Supabase SQL Editor run the estate-inventory migration SQL files (correct project), then refresh.'
    };
  }
  return { success: false, error: raw };
}

function ok(data) {
  return { success: true, data };
}

/**
 * Resolve the signed-in PR's estate row for a case number (create if missing).
 * Requires estate-multi-estate-foundation.sql (estate_settings.id + unique case).
 */
async function resolveOwnedEstate(caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return { ok: false, error: auth.error };

  const cn = resolveCaseArg(caseNumber);
  if (!cn) {
    return { ok: false, error: 'Estate case number is required.' };
  }

  const cacheKey = `${auth.userId}:${cn}`;
  const cached = ownedEstateCache.get(cacheKey);
  if (cached && Date.now() - cached.at < OWNED_ESTATE_TTL_MS) {
    return cached.value;
  }

  const { data: existing, error: findErr } = await selectSettings((q) =>
    q.eq('owner_id', auth.userId).ilike('case_number', cn).maybeSingle()
  );

  if (findErr) {
    const msg = findErr.message || String(findErr);
    const missingIdCol =
      /could not find the ['"]id['"] column/i.test(msg) ||
      /column\s+[\w.]*estate_settings\.id\s+does not exist/i.test(msg) ||
      /column\s+['"]id['"]\s+does not exist/i.test(msg);
    if (missingIdCol) {
      return {
        ok: false,
        error:
          'Multi-estate isolation is required. Run supabase-migrations/estate-multi-estate-foundation.sql in Supabase, then refresh.'
      };
    }
    return { ok: false, error: msg };
  }

  if (existing?.id) {
    const hit = {
      ok: true,
      userId: auth.userId,
      estateId: existing.id,
      caseNumber: existing.case_number || cn,
      settings: existing,
      legacy: false
    };
    ownedEstateCache.set(cacheKey, { at: Date.now(), value: hit });
    return hit;
  }

  // Also allow lookup by court case number owned by this PR (display identity)
  const { data: byCourt, error: courtErr } = await selectSettings((q) =>
    q.eq('owner_id', auth.userId).ilike('court_case_number', cn).maybeSingle()
  );
  if (courtErr) return { ok: false, error: courtErr.message || String(courtErr) };
  if (byCourt?.id) {
    const hit = {
      ok: true,
      userId: auth.userId,
      estateId: byCourt.id,
      caseNumber: byCourt.case_number || cn,
      settings: byCourt,
      legacy: false
    };
    ownedEstateCache.set(cacheKey, { at: Date.now(), value: hit });
    return hit;
  }

  // Do not auto-create empty estates — prevents identity pollution across cases
  const { data: ensured, error: ensureErr } = await supabase.rpc('estate_ensure_owned_estate', {
    p_case_number: cn
  });
  if (ensureErr) {
    if (/estate_ensure_owned_estate|schema cache|does not exist/i.test(ensureErr.message || '')) {
      return {
        ok: false,
        error: 'Estate case not found for this account. Open it from My estates.'
      };
    }
    return { ok: false, error: ensureErr.message || String(ensureErr) };
  }
  if (ensured?.success === false) {
    return { ok: false, error: ensured.error || 'Estate case not found for this account.' };
  }

  const estateId = ensured?.estate_id;
  if (!estateId) {
    return { ok: false, error: 'Estate case not found for this account.' };
  }

  const { data: row, error: rowErr } = await selectSettings((q) => q.eq('id', estateId).maybeSingle());
  if (rowErr) return { ok: false, error: rowErr.message || String(rowErr) };

  const hit = {
    ok: true,
    userId: auth.userId,
    estateId,
    caseNumber: row?.case_number || cn,
    settings: row,
    legacy: false
  };
  ownedEstateCache.set(cacheKey, { at: Date.now(), value: hit });
  return hit;
}

function randomToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function compressImageFile(file, maxEdge = MAX_IMAGE_EDGE, quality = JPEG_QUALITY) {
  if (!file || !file.type?.startsWith('image/')) return file;
  try {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    return blob || file;
  } catch {
    return file;
  }
}

function storagePathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let path = url.slice(idx + marker.length);
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep raw path
  }
  return path || null;
}

async function uploadPhotoAtPath(
  userId,
  pathSuffix,
  file,
  { cacheControl = '3600', skipCompress = false } = {}
) {
  const payload = skipCompress ? file : await compressImageFile(file);
  const path = `${userId}/${pathSuffix}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, payload, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl
  });
  if (error) return fail(error);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return ok(data?.publicUrl || null);
}

/**
 * Download photo bytes via Storage API (auth) — avoids public-URL CORS failures
 * that break rotate/crop in the browser.
 */
async function downloadPhotoBlob(url) {
  const path = storagePathFromPublicUrl(url);
  if (path) {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
    if (!error && data) return data;
    // Retry without nested folders quirks (some rows store encoded segments)
    const alt = path
      .split('/')
      .map((p) => {
        try {
          return decodeURIComponent(p);
        } catch {
          return p;
        }
      })
      .join('/');
    if (alt !== path) {
      const second = await supabase.storage.from(PHOTO_BUCKET).download(alt);
      if (!second.error && second.data) return second.data;
    }
  }
  const raw = String(url || '').trim();
  if (!raw) throw new Error('Could not load photo for editing.');
  const clean = raw.split('#')[0].split('?')[0] || raw;
  const res = await fetch(clean, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    throw new Error(
      path
        ? `Could not load photo (${path}). Check Storage access for this estate.`
        : 'Could not load photo for editing.'
    );
  }
  return res.blob();
}

export async function listCollections(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let collectionsQuery = supabase
    .from('estate_collections')
    .select('id, name, estate_id, collection_number, created_at, updated_at')
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) collectionsQuery = collectionsQuery.eq('estate_id', estate.estateId);

  let { data: collections, error } = await collectionsQuery;
  if (error && isMissingColumnError(error, 'collection_number')) {
    collectionsQuery = supabase
      .from('estate_collections')
      .select('id, name, estate_id, created_at, updated_at')
      .eq('owner_id', estate.userId)
      .order('created_at', { ascending: false });
    if (estate.estateId) collectionsQuery = collectionsQuery.eq('estate_id', estate.estateId);
    ({ data: collections, error } = await collectionsQuery);
  }
  if (error) return fail(error);

  let itemsQuery = supabase
    .from('estate_items')
    .select('collection_id')
    .eq('owner_id', estate.userId);
  if (estate.estateId) itemsQuery = itemsQuery.eq('estate_id', estate.estateId);

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) return fail(itemsError);

  const counts = {};
  for (const row of items || []) {
    counts[row.collection_id] = (counts[row.collection_id] || 0) + 1;
  }

  return ok(
    (collections || []).map((c) => ({
      ...c,
      itemCount: counts[c.id] || 0
    }))
  );
}

export async function createCollection(name, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  const trimmed = (name || '').trim();
  if (!trimmed) return fail('Collection name is required.');

  const row = { owner_id: estate.userId, name: trimmed };
  if (estate.estateId) {
    row.estate_id = estate.estateId;
    const n = await allocateCollectionNumber(estate.estateId);
    if (n != null) row.collection_number = n;
  }

  let { data, error } = await supabase
    .from('estate_collections')
    .insert(row)
    .select('id, name, collection_number, created_at, updated_at')
    .single();

  if (error && isMissingColumnError(error, 'collection_number')) {
    delete row.collection_number;
    ({ data, error } = await supabase
      .from('estate_collections')
      .insert(row)
      .select('id, name, created_at, updated_at')
      .single());
  }

  if (error) return fail(error);
  return ok({ ...data, itemCount: 0 });
}

export async function getCollection(collectionId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_collections')
    .select('id, name, collection_number, created_at, updated_at')
    .eq('id', collectionId)
    .eq('owner_id', estate.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  let { data, error } = await q.maybeSingle();
  if (error && isMissingColumnError(error, 'collection_number')) {
    q = supabase
      .from('estate_collections')
      .select('id, name, created_at, updated_at')
      .eq('id', collectionId)
      .eq('owner_id', estate.userId);
    if (estate.estateId) q = q.eq('estate_id', estate.estateId);
    ({ data, error } = await q.maybeSingle());
  }

  if (error) return fail(error);
  if (!data) return fail('Collection not found.');
  return ok(data);
}

export async function listItems(collectionId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const { data, error } = await selectItems((q) => {
    let next = q
      .eq('owner_id', estate.userId)
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });
    if (estate.estateId) next = next.eq('estate_id', estate.estateId);
    return next;
  });
  if (error) return fail(error);
  return ok(data || []);
}

/**
 * @param {string} caseNumber
 * @param {{ collections?: Array<{ id: string, name?: string }> }} [opts]
 *        Pass preloaded collections to skip a duplicate listCollections round-trip.
 */
export async function listAllItemsWithRooms(caseNumber, opts = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const collectionsResult = Array.isArray(opts.collections)
    ? { success: true, data: opts.collections }
    : await listCollections(caseNumber);
  if (!collectionsResult.success) return collectionsResult;
  const roomById = Object.fromEntries(
    (collectionsResult.data || []).map((c) => {
      const name = c.name || 'Room';
      const number = c.collection_number ?? c.collectionNumber;
      const label = roomTitleWithCode(name, number);
      return [c.id, { name, label }];
    })
  );

  const { data, error } = await selectItems((q) => {
    let next = q.eq('owner_id', estate.userId).order('created_at', { ascending: false });
    if (estate.estateId) next = next.eq('estate_id', estate.estateId);
    return next;
  });

  if (error) return fail(error);

  return ok(
    (data || []).map((item) => {
      const room = roomById[item.collection_id];
      const label = room?.label || room?.name || 'Unassigned';
      return {
        ...item,
        room: label,
        room_name: room ? label : null,
        collection_name: room?.name || null
      };
    })
  );
}

function buildItemInsertPayload(authUserId, collectionId, input, meta, estateId = null) {
  const legalStatus = input?.legalStatus || LEGAL_STATUS.secured;
  const now = new Date().toISOString();
  return {
    owner_id: authUserId,
    estate_id: estateId || null,
    collection_id: collectionId,
    name: (input?.name || '').trim(),
    notes: (input?.notes || '').trim() || null,
    item_condition: normalizeItemCondition(input?.condition) || 'good',
    condition_notes: String(input?.conditionNotes || '').trim() || null,
    estimated_value:
      input?.estimatedValue == null || input?.estimatedValue === ''
        ? null
        : Math.max(0, Number(input.estimatedValue) || 0),
    valuation_date: input?.valuationDate || null,
    valuation_source: String(input?.valuationSource || '').trim() || null,
    valuation_notes: String(input?.valuationNotes || '').trim() || null,
    photo_url: null,
    photo_urls: [],
    legal_status: legalStatus,
    value_tier: input?.valueTier || 'general_household',
    is_memorandum_asset: Boolean(input?.isMemorandumAsset),
    assigned_beneficiary: input?.isMemorandumAsset
      ? input?.assignedBeneficiary || null
      : null,
    descendants_interest:
      normalizeDescendantsInterestPct(input?.descendantsInterestPct) != null,
    descendants_interest_pct: normalizeDescendantsInterestPct(
      input?.descendantsInterestPct
    ),
    // Capture/receipt times are stamped by DB trigger (server clock). GPS is device-reported.
    photo_captured_at: null,
    photo_received_at: null,
    photo_gps_lat: meta?.photo_gps_lat ?? null,
    photo_gps_lng: meta?.photo_gps_lng ?? null,
    created_by_role: 'admin',
    created_by_name: 'Personal Representative',
    review_status: 'approved',
    is_approved_by_pr: true,
    disputed_at: legalStatus === LEGAL_STATUS.disputed ? now : null,
    distributed_at: legalStatus === LEGAL_STATUS.distributed ? now : null
  };
}

/**
 * @param {{
 *  name: string,
 *  collectionId?: string,
 *  newCollectionName?: string,
 *  notes?: string,
 *  photoFile?: File|Blob,
 *  photoFiles?: Array<File|Blob>,
 *  legalStatus?: string,
 *  valueTier?: string,
 *  isMemorandumAsset?: boolean,
 *  assignedBeneficiary?: string,
 *  descendantsInterestPct?: number|null,
 *  deviceGps?: { lat: number|null, lng: number|null }
 * }} input
 */
export async function createItem(input) {
  const estate = await resolveOwnedEstate(input?.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const itemName = (input?.name || '').trim();
  if (!itemName) return fail('Item name is required.');
  if (input?.estimatedValue != null && input.estimatedValue !== '') {
    const value = Number(input.estimatedValue);
    if (!Number.isFinite(value) || value < 0) {
      return fail('Estimated value must be zero or a positive amount.');
    }
  }

  let collectionId = input?.collectionId || null;
  let roomNumber = null;
  if (collectionId && estate.estateId) {
    let { data: col, error: colErr } = await supabase
      .from('estate_collections')
      .select('id, estate_id, name, collection_number')
      .eq('id', collectionId)
      .eq('owner_id', estate.userId)
      .maybeSingle();
    if (colErr && isMissingColumnError(colErr, 'collection_number')) {
      ({ data: col, error: colErr } = await supabase
        .from('estate_collections')
        .select('id, estate_id, name')
        .eq('id', collectionId)
        .eq('owner_id', estate.userId)
        .maybeSingle());
    }
    if (colErr) return fail(colErr);
    if (!col) return fail('Room / collection not found.');
    if (col.estate_id && col.estate_id !== estate.estateId) {
      return fail(
        'That room belongs to a different estate case. Create or pick a room in this case first.'
      );
    }
    if (!col.estate_id) {
      await supabase
        .from('estate_collections')
        .update({ estate_id: estate.estateId })
        .eq('id', collectionId)
        .eq('owner_id', estate.userId);
    }
    roomNumber = await ensureCollectionNumber(col, estate.estateId);
  }

  if (!collectionId) {
    const newName = (input?.newCollectionName || '').trim();
    if (!newName) return fail('Pick a room/collection or create a new one.');
    const created = await createCollection(newName, estate.caseNumber);
    if (!created.success) return created;
    collectionId = created.data.id;
    roomNumber = Number(created.data.collection_number) || null;
  }

  if (input?.isMemorandumAsset && !input?.assignedBeneficiary) {
    return fail('Assigned beneficiary is required for memorandum assets.');
  }

  const files = [];
  if (Array.isArray(input?.photoFiles)) files.push(...input.photoFiles.filter(Boolean));
  else if (input?.photoFile) files.push(input.photoFile);
  const photoBatch = files.slice(0, MAX_ITEM_PHOTOS);

  let meta = {
    photo_captured_at: null,
    photo_gps_lat: null,
    photo_gps_lng: null
  };
  if (photoBatch[0]) {
    meta = await extractPhotoMetadata(photoBatch[0]);
    if (meta.photo_gps_lat == null && input?.deviceGps?.lat != null) {
      meta.photo_gps_lat = input.deviceGps.lat;
      meta.photo_gps_lng = input.deviceGps.lng;
    }
  }

  const payload = buildItemInsertPayload(
    estate.userId,
    collectionId,
    { ...input, name: itemName },
    meta,
    estate.estateId
  );
  if (!estate.estateId) delete payload.estate_id;

  if (estate.estateId && roomNumber != null) {
    const itemNumber = await allocateItemNumber(estate.estateId, roomNumber);
    if (itemNumber != null) {
      payload.room_number = roomNumber;
      payload.item_number = itemNumber;
    }
  }

  let { data: item, error } = await supabase
    .from('estate_items')
    .insert(payload)
    .select(itemSelect)
    .single();

  if (
    error &&
    (isMissingColumnError(error, 'room_number') || isMissingColumnError(error, 'item_number'))
  ) {
    itemSelect = ITEM_SELECT_NO_REF;
    delete payload.room_number;
    delete payload.item_number;
    ({ data: item, error } = await supabase
      .from('estate_items')
      .insert(payload)
      .select(itemSelect)
      .single());
  }

  if (
    error &&
    (isMissingColumnError(error, 'estimated_value') ||
      isMissingColumnError(error, 'valuation_') ||
      isMissingColumnError(error, 'item_condition') ||
      isMissingColumnError(error, 'condition_notes'))
  ) {
    itemSelect = ITEM_SELECT_LEGACY;
    const legacyPayload = { ...payload };
    delete legacyPayload.estimated_value;
    delete legacyPayload.valuation_date;
    delete legacyPayload.valuation_source;
    delete legacyPayload.valuation_notes;
    delete legacyPayload.item_condition;
    delete legacyPayload.condition_notes;
    delete legacyPayload.room_number;
    delete legacyPayload.item_number;
    ({ data: item, error } = await supabase
      .from('estate_items')
      .insert(legacyPayload)
      .select(itemSelect)
      .single());
  }

  if (error) {
    if (
      isMissingColumnError(error, 'estimated_value') ||
      isMissingColumnError(error, 'valuation_')
    ) {
      return fail(
        'Inventory valuations need the court-accounting SQL migration. Run supabase-migrations/estate-court-accounting-upgrade-2026-07.sql, then try again.'
      );
    }
    if (
      isMissingColumnError(error, 'item_condition') ||
      isMissingColumnError(error, 'condition_notes')
    ) {
      return fail(
        'Item condition needs a database update. Run supabase-migrations/estate-item-condition-2026-08.sql in Supabase, then try again.'
      );
    }
    return fail(error);
  }

  logEstateActivity({
    eventType: 'item_create',
    caseNumber: estate.caseNumber,
    metadata: { item_id: item?.id }
  });

  if (!photoBatch.length) return ok(item);

  const urls = [];
  let warning = '';
  for (let i = 0; i < photoBatch.length; i += 1) {
    const fileMeta =
      i === 0
        ? meta
        : await extractPhotoMetadata(photoBatch[i]).then((m) => {
            if (m.photo_gps_lat == null && input?.deviceGps?.lat != null) {
              return {
                ...m,
                photo_gps_lat: input.deviceGps.lat,
                photo_gps_lng: input.deviceGps.lng
              };
            }
            return m;
          });
    const uploaded = await uploadPhotoAtPath(estate.userId, `${item.id}_${i}.jpg`, photoBatch[i]);
    if (!uploaded.success) {
      warning = uploaded.error || 'Some photos failed to upload.';
      break;
    }
    urls.push(
      buildPhotoEntry(uploaded.data, {
        takenBy: 'Personal Representative',
        capturedAt: item.photo_captured_at || new Date().toISOString(),
        receivedAt: item.photo_received_at || new Date().toISOString(),
        gpsLat: fileMeta.photo_gps_lat,
        gpsLng: fileMeta.photo_gps_lng,
        deviceCapturedAtClaim: fileMeta.photo_captured_at || null
      })
    );
  }

  if (!urls.length) {
    return { success: true, data: item, warning: warning || 'Item saved, but photos failed to upload.' };
  }

  let photoQ = supabase
    .from('estate_items')
    .update({
      photo_url: urls[0].url,
      photo_urls: urls,
      // Do not send client capture times — DB trigger keeps server stamps; GPS fill-once OK if null
      photo_gps_lat: meta.photo_gps_lat,
      photo_gps_lng: meta.photo_gps_lng,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)
    .eq('owner_id', estate.userId);
  if (estate.estateId) photoQ = photoQ.eq('estate_id', estate.estateId);
  const { data: updated, error: updateError } = await photoQ.select(itemSelect).single();

  if (updateError) {
    return {
      success: true,
      data: { ...item, photo_url: urls[0].url, photo_urls: urls },
      warning: updateError.message
    };
  }
  return warning ? { success: true, data: updated, warning } : ok(updated);
}

export async function updateItem(itemId, patch, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const updates = { updated_at: new Date().toISOString() };
  if (patch.name != null) updates.name = String(patch.name).trim();
  if (patch.notes != null) updates.notes = String(patch.notes).trim() || null;
  if (patch.condition !== undefined) {
    const cond = normalizeItemCondition(patch.condition);
    if (patch.condition && !cond) {
      return fail('Condition must be excellent, good, fair, or poor.');
    }
    updates.item_condition = cond;
  }
  if (patch.conditionNotes !== undefined) {
    updates.condition_notes = String(patch.conditionNotes || '').trim() || null;
  }
  if (patch.legalStatus != null) {
    updates.legal_status = patch.legalStatus;
    if (patch.legalStatus === LEGAL_STATUS.disputed) {
      updates.disputed_at = new Date().toISOString();
    } else {
      updates.disputed_at = null;
    }
    if (patch.legalStatus === LEGAL_STATUS.distributed) {
      updates.distributed_at = new Date().toISOString();
    }
    if (patch.legalStatus === LEGAL_STATUS.archived) {
      updates.approved_for_sale = false;
    }
  }
  if (patch.valueTier != null) updates.value_tier = patch.valueTier;
  if (patch.estimatedValue !== undefined) {
    if (patch.estimatedValue === null || patch.estimatedValue === '') {
      updates.estimated_value = null;
    } else {
      const value = Number(patch.estimatedValue);
      if (!Number.isFinite(value) || value < 0) {
        return fail('Estimated value must be zero or a positive amount.');
      }
      updates.estimated_value = value;
    }
  }
  if (patch.valuationDate !== undefined) {
    updates.valuation_date = patch.valuationDate || null;
  }
  if (patch.valuationSource !== undefined) {
    updates.valuation_source = String(patch.valuationSource || '').trim() || null;
  }
  if (patch.valuationNotes !== undefined) {
    updates.valuation_notes = String(patch.valuationNotes || '').trim() || null;
  }
  if (patch.isMemorandumAsset != null) {
    updates.is_memorandum_asset = Boolean(patch.isMemorandumAsset);
    if (!patch.isMemorandumAsset) updates.assigned_beneficiary = null;
  }
  if (patch.assignedBeneficiary != null) {
    updates.assigned_beneficiary = patch.assignedBeneficiary || null;
  }
  if (patch.descendantsInterestPct !== undefined) {
    const pct = normalizeDescendantsInterestPct(patch.descendantsInterestPct);
    updates.descendants_interest_pct = pct;
    updates.descendants_interest = pct != null;
  } else if (patch.descendantsInterest != null) {
    // Legacy boolean callers
    const on = Boolean(patch.descendantsInterest);
    updates.descendants_interest = on;
    updates.descendants_interest_pct = on ? 100 : null;
  }
  if (patch.collectionId != null) {
    const collectionId = patch.collectionId;
    if (collectionId && estate.estateId) {
      const { data: col, error: colErr } = await supabase
        .from('estate_collections')
        .select('id, estate_id, name')
        .eq('id', collectionId)
        .eq('owner_id', estate.userId)
        .maybeSingle();
      if (colErr) return fail(colErr);
      if (!col) return fail('Room / collection not found.');
      if (col.estate_id && col.estate_id !== estate.estateId) {
        return fail(
          'That room belongs to a different estate case. Create or pick a room in this case first.'
        );
      }
      if (!col.estate_id) {
        await supabase
          .from('estate_collections')
          .update({ estate_id: estate.estateId })
          .eq('id', collectionId)
          .eq('owner_id', estate.userId);
      }
    }
    updates.collection_id = collectionId;
  }
  if (patch.approvedForSale != null) {
    updates.approved_for_sale = Boolean(patch.approvedForSale);
  }

  let priorAuctionPaidAt = null;
  if (patch.auctionPaid != null) {
    let priorQ = supabase
      .from('estate_items')
      .select('auction_paid_at, auction_proceeds_where')
      .eq('id', itemId)
      .eq('owner_id', auth.userId);
    if (estate.estateId) priorQ = priorQ.eq('estate_id', estate.estateId);
    const prior = await priorQ.maybeSingle();
    priorAuctionPaidAt = prior.data?.auction_paid_at || null;
    updates.auction_paid_at = patch.auctionPaid ? new Date().toISOString() : null;
    if (!patch.auctionPaid) {
      updates.auction_proceeds_where = null;
    }
  }

  if (patch.auctionProceedsWhere !== undefined) {
    const where = String(patch.auctionProceedsWhere || '').trim();
    updates.auction_proceeds_where = where ? where.slice(0, 400) : null;
  }

  // Newly marking sold/paid: require either a deposit account or “where the money is.”
  if (patch.auctionPaid && !priorAuctionPaidAt) {
    const depositAccountIdEarly = String(patch.depositAccountId || patch.accountId || '').trim();
    const whereEarly = String(
      patch.auctionProceedsWhere != null
        ? patch.auctionProceedsWhere
        : updates.auction_proceeds_where || ''
    ).trim();
    if (!depositAccountIdEarly && whereEarly.length < 3) {
      return fail(
        'Buyer paid — pick the estate account you deposited into, or say where the money is for now.'
      );
    }
    if (depositAccountIdEarly) {
      updates.auction_proceeds_where = null;
    }
  }

  if (patch.reviewStatus != null) {
    updates.review_status = patch.reviewStatus;
    if (patch.reviewStatus === 'approved') {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = auth.userId;
      updates.is_approved_by_pr = true;
    }
    if (patch.reviewStatus === 'rejected') {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = auth.userId;
      updates.is_approved_by_pr = false;
    }
  }
  if (patch.isApprovedByPr != null) {
    updates.is_approved_by_pr = Boolean(patch.isApprovedByPr);
  }

  let q = supabase
    .from('estate_items')
    .update(updates)
    .eq('id', itemId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(itemSelect).single();

  if (error) {
    if (
      isMissingColumnError(error, 'estimated_value') ||
      isMissingColumnError(error, 'valuation_')
    ) {
      return fail(
        'Inventory valuations need the court-accounting SQL migration. Run supabase-migrations/estate-court-accounting-upgrade-2026-07.sql, then try again.'
      );
    }
    if (
      isMissingColumnError(error, 'item_condition') ||
      isMissingColumnError(error, 'condition_notes')
    ) {
      return fail(
        'Item condition needs a database update. Run supabase-migrations/estate-item-condition-2026-08.sql in Supabase, then try again.'
      );
    }
    if (isMissingColumnError(error, 'auction_proceeds_where')) {
      return fail(
        'Sale proceeds tracking needs a database update. Run supabase-migrations/estate-sale-proceeds-where-2026-08.sql in Supabase, then try again.'
      );
    }
    return fail(error);
  }

  // One-action: mark sale paid → deposit proceeds into Estate Funds.
  const depositAccountId = String(patch.depositAccountId || patch.accountId || '').trim();
  let warning = '';
  if (patch.auctionPaid && depositAccountId && data) {
    const proceeds = Number(data.highest_bid);
    if (Number.isFinite(proceeds) && proceeds > 0) {
      let alreadyDeposited = false;
      if (priorAuctionPaidAt) {
        let depQ = supabase
          .from('estate_account_transactions')
          .select('id')
          .eq('item_id', data.id)
          .eq('category', 'sale_proceeds')
          .limit(1);
        if (estate.estateId) depQ = depQ.eq('estate_id', estate.estateId);
        const { data: existingDep } = await depQ.maybeSingle();
        alreadyDeposited = Boolean(existingDep?.id);
      }
      if (!alreadyDeposited) {
        const txn = await addAccountTransaction(estate, {
          accountId: depositAccountId,
          amount: proceeds,
          category: 'sale_proceeds',
          memo: `Sale proceeds — ${data.name || 'item'}`,
          itemId: data.id
        });
        if (!txn.success) {
          warning =
            txn.error ||
            'Sale marked paid, but the estate-account deposit failed. Record money coming in under Estate Funds.';
        } else {
          // Deposited — clear any temporary “where” note.
          await supabase
            .from('estate_items')
            .update({ auction_proceeds_where: null, updated_at: new Date().toISOString() })
            .eq('id', data.id)
            .eq('owner_id', auth.userId);
          data.auction_proceeds_where = null;
        }
      }
    }
  }

  // Unmark paid → reverse any sale_proceeds deposit (original rows stay; adjustment posted).
  if (patch.auctionPaid === false && priorAuctionPaidAt && data?.id) {
    const rev = await reverseLinkedFundsTransactions(estate, {
      itemId: data.id,
      category: 'sale_proceeds',
      reason: `Sale unmarked as paid — ${data.name || 'item'}`
    });
    if (!rev.success) {
      warning = [
        warning,
        rev.error || 'Paid flag cleared, but Funds sale deposit could not be reversed automatically.'
      ]
        .filter(Boolean)
        .join(' ');
    } else if (rev.data?.reversedCount) {
      logEstateActivity({
        eventType: 'account_update',
        caseNumber: resolveCaseArg(caseNumber),
        metadata: {
          item_id: data.id,
          field: 'funds_sale_reversal',
          related_id: data.id,
          note: `Reversed ${rev.data.reversedCount} sale proceeds row(s)`,
          amount: String(data.highest_bid ?? '')
        }
      });
    }
  }

  if (warning) return { success: true, data, warning };
  return ok(data);
}

/** True when this item already has a sale_proceeds Funds deposit. */
export async function itemHasSaleProceedsDeposit(itemId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  const id = String(itemId || '').trim();
  if (!id) return fail('Missing item.');
  let q = supabase
    .from('estate_account_transactions')
    .select('id')
    .eq('item_id', id)
    .eq('category', 'sale_proceeds')
    .limit(1);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  const { data, error } = await q.maybeSingle();
  if (error) return fail(error);
  return ok(Boolean(data?.id));
}

/**
 * Replace one inventory photo with a prepared File/Blob (internal + re-upload).
 * Preserves provenance. Always writes a new storage object key to avoid CDN stale.
 */
export async function replaceItemPhoto(itemId, photoIndex, file, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const id = String(itemId || '').trim();
  const index = Number(photoIndex);
  if (!id) return fail('Missing item.');
  if (!Number.isInteger(index) || index < 0 || index >= ITEM_PHOTO_SLOT_MAX) {
    return fail(`Photo index must be between 0 and ${ITEM_PHOTO_SLOT_MAX - 1}.`);
  }
  if (!file) return fail('Missing photo file.');

  let getQ = supabase
    .from('estate_items')
    .select(itemSelect)
    .eq('id', id)
    .eq('owner_id', estate.userId);
  if (estate.estateId) getQ = getQ.eq('estate_id', estate.estateId);
  const { data: item, error: getError } = await getQ.single();
  if (getError) return fail(getError);
  if (!item) return fail('Item not found.');

  return writeReplacedItemPhoto(estate, item, index, file, { skipCompress: false });
}

/**
 * Download current photo, apply rotate/crop in-browser, upload new object, update row.
 * Uses Storage download (not public fetch) so CORS cannot block the edit.
 */
export async function replaceItemPhotoTransformed(
  itemId,
  photoIndex,
  { rotateDeg = 0, cropNorm = null } = {},
  caseNumber
) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const id = String(itemId || '').trim();
  const index = Number(photoIndex);
  if (!id) return fail('Missing item.');
  if (!Number.isInteger(index) || index < 0 || index >= ITEM_PHOTO_SLOT_MAX) {
    return fail(`Photo index must be between 0 and ${ITEM_PHOTO_SLOT_MAX - 1}.`);
  }
  const deg = ((Number(rotateDeg) || 0) % 360 + 360) % 360;
  if (!deg && !cropNorm) return fail('Rotate or crop before saving.');

  let getQ = supabase
    .from('estate_items')
    .select(itemSelect)
    .eq('id', id)
    .eq('owner_id', estate.userId);
  if (estate.estateId) getQ = getQ.eq('estate_id', estate.estateId);
  const { data: item, error: getError } = await getQ.single();
  if (getError) return fail(getError);
  if (!item) return fail('Item not found.');

  const existing = getPhotoEntries(item);
  const prev = existing[index] || (existing.length === 1 ? existing[0] : null);
  const sourceUrl = prev?.url || item.photo_url;
  if (!sourceUrl) return fail('This item has no photo to edit.');

  let sourceBlob;
  try {
    sourceBlob = await downloadPhotoBlob(sourceUrl);
  } catch (err) {
    return fail(err?.message || 'Could not load photo for editing.');
  }

  let transformed;
  try {
    transformed = await transformImageSource(sourceBlob, {
      rotateDeg: deg,
      cropNorm
    });
  } catch (err) {
    return fail(err?.message || 'Could not rotate/crop photo.');
  }

  const written = await writeReplacedItemPhoto(
    estate,
    item,
    index,
    new File([transformed], `${id}_${index}_edit.jpg`, { type: 'image/jpeg' }),
    { skipCompress: true }
  );
  if (!written.success) return written;
  return ok({ item: written.data, previewBlob: transformed });
}

async function writeReplacedItemPhoto(estate, item, index, file, { skipCompress = false } = {}) {
  const id = item.id;
  const existing = getPhotoEntries(item);
  const prev = existing[index] || (existing.length === 1 ? existing[0] : null);
  const oldPath = storagePathFromPublicUrl(prev?.url || (index === 0 ? item.photo_url : ''));

  const stamp = Date.now();
  const pathSuffix = `${id}_${index}_${stamp}.jpg`;
  const uploaded = await uploadPhotoAtPath(estate.userId, pathSuffix, file, {
    cacheControl: '0',
    skipCompress
  });
  if (!uploaded.success) return fail(uploaded.error || 'Photo upload failed.');
  if (!uploaded.data) return fail('Photo upload failed.');

  const publicUrl = `${uploaded.data.split('?')[0]}?v=${stamp}`;

  const nextEntry = buildPhotoEntry(publicUrl, {
    takenBy: prev?.taken_by || item.created_by_name || 'Personal Representative',
    capturedAt: prev?.captured_at || item.photo_captured_at || null,
    receivedAt: prev?.received_at || item.photo_received_at || null,
    gpsLat: prev?.gps_lat ?? item.photo_gps_lat ?? null,
    gpsLng: prev?.gps_lng ?? item.photo_gps_lng ?? null,
    deviceCapturedAtClaim: prev?.device_captured_at_claim || null
  });

  // Prefer SECURITY DEFINER RPC so provenance triggers cannot silently keep the old URL.
  const { data: rpcData, error: rpcError } = await supabase.rpc('estate_admin_replace_item_photo', {
    p_item_id: id,
    p_case_number: estate.caseNumber || resolveCaseArg(),
    p_photo_index: index,
    p_photo_url: publicUrl,
    p_photo_entry: nextEntry
  });

  let updated = null;
  if (!rpcError && rpcData?.success && rpcData?.item) {
    updated = rpcData.item;
  } else if (
    rpcError &&
    /estate_admin_replace_item_photo|schema cache|does not exist/i.test(rpcError.message || '')
  ) {
    // Fallback until SQL migration is applied
    const urls = existing.length ? [...existing] : [];
    while (urls.length <= index) urls.push(null);
    urls[index] = nextEntry;
    const cleaned = urls.filter(Boolean);
    if (!cleaned.length) cleaned.push(nextEntry);
    const primaryUrl = index === 0 ? publicUrl : cleaned[0]?.url || publicUrl;
    let photoQ = supabase
      .from('estate_items')
      .update({
        photo_url: primaryUrl,
        photo_urls: cleaned,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('owner_id', estate.userId);
    if (estate.estateId) photoQ = photoQ.eq('estate_id', estate.estateId);
    const { data, error: updateError } = await photoQ.select(itemSelect).single();
    if (updateError) return fail(updateError);
    updated = data;
  } else if (rpcError) {
    return fail(rpcError);
  } else {
    return fail(rpcData?.error || 'Could not link the new photo to this item.');
  }

  const returnedEntries = getPhotoEntries(updated);
  const returnedUrl =
    returnedEntries[index]?.url ||
    (index === 0 ? updated?.photo_url : returnedEntries[0]?.url) ||
    '';
  if (!String(returnedUrl).includes(String(stamp))) {
    return fail(
      'Photo file uploaded, but the item record still points at the old image. In Supabase SQL Editor run supabase-migrations/estate-admin-replace-item-photo.sql, then try again.'
    );
  }

  const newPath = storagePathFromPublicUrl(publicUrl);
  if (oldPath && newPath && oldPath !== newPath) {
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
    } catch {
      // best-effort cleanup
    }
  }

  return ok(updated);
}

/**
 * Append new photos to an item (PR edit). Respects MAX_ITEM_PHOTOS.
 * @param {string} itemId
 * @param {Array<File|Blob>} files
 * @param {string} [caseNumber]
 * @param {{ deviceGps?: { lat: number|null, lng: number|null } }} [opts]
 */
export async function appendItemPhotos(itemId, files, caseNumber, opts = {}) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const id = String(itemId || '').trim();
  if (!id) return fail('Missing item.');
  const incoming = (Array.isArray(files) ? files : [files]).filter(Boolean);
  if (!incoming.length) return fail('Choose at least one photo.');

  let getQ = supabase
    .from('estate_items')
    .select(itemSelect)
    .eq('id', id)
    .eq('owner_id', estate.userId);
  if (estate.estateId) getQ = getQ.eq('estate_id', estate.estateId);
  const { data: item, error: getError } = await getQ.single();
  if (getError) return fail(getError);
  if (!item) return fail('Item not found.');

  const existing = getPhotoEntries(item);
  const room = MAX_ITEM_PHOTOS - existing.length;
  if (room <= 0) {
    return fail(`This item already has the maximum of ${MAX_ITEM_PHOTOS} photos.`);
  }
  const batch = incoming.slice(0, room);
  const urls = [...existing];
  let warning = '';

  for (let i = 0; i < batch.length; i += 1) {
    const index = urls.length;
    if (index >= ITEM_PHOTO_SLOT_MAX) {
      warning = `Reached storage slot limit (${ITEM_PHOTO_SLOT_MAX}).`;
      break;
    }
    const fileMeta = await extractPhotoMetadata(batch[i]).then((m) => {
      if (m.photo_gps_lat == null && opts?.deviceGps?.lat != null) {
        return {
          ...m,
          photo_gps_lat: opts.deviceGps.lat,
          photo_gps_lng: opts.deviceGps.lng
        };
      }
      return m;
    });
    const uploaded = await uploadPhotoAtPath(
      estate.userId,
      `${id}_${index}_${Date.now()}.jpg`,
      batch[i]
    );
    if (!uploaded.success) {
      warning = uploaded.error || 'Some photos failed to upload.';
      break;
    }
    urls.push(
      buildPhotoEntry(uploaded.data, {
        takenBy: 'Personal Representative',
        capturedAt: item.photo_captured_at || new Date().toISOString(),
        receivedAt: item.photo_received_at || new Date().toISOString(),
        gpsLat: fileMeta.photo_gps_lat,
        gpsLng: fileMeta.photo_gps_lng,
        deviceCapturedAtClaim: fileMeta.photo_captured_at || null
      })
    );
  }

  if (urls.length === existing.length) {
    return fail(warning || 'Photos failed to upload.');
  }

  let photoQ = supabase
    .from('estate_items')
    .update({
      photo_url: urls[0]?.url || item.photo_url,
      photo_urls: urls,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('owner_id', estate.userId);
  if (estate.estateId) photoQ = photoQ.eq('estate_id', estate.estateId);
  const { data: updated, error: updateError } = await photoQ.select(itemSelect).single();
  if (updateError) return fail(updateError);

  logEstateActivity({
    eventType: 'item_photo_append',
    caseNumber: estate.caseNumber,
    metadata: { item_id: id, added: urls.length - existing.length }
  });

  return warning ? { success: true, data: updated, warning } : ok(updated);
}

/** Download an estate photo for rotate/crop (Storage API first). */
export async function downloadItemPhotoForEdit(url) {
  try {
    const blob = await downloadPhotoBlob(url);
    if (!blob) return fail('Could not load photo for editing.');
    return ok(blob);
  } catch (err) {
    return fail(err?.message || 'Could not load photo for editing.');
  }
}

/**
 * Soft-remove: archive keeps the row + photos for the estate file.
 * Prefer this for real probate records.
 */
export async function archiveItem(itemId, caseNumber) {
  return updateItem(
    itemId,
    {
      legalStatus: LEGAL_STATUS.archived,
      approvedForSale: false
    },
    caseNumber
  );
}

/**
 * Hard delete one item (owner only via RPC). Use for test cleanup / personal photos —
 * not for normal probate workflow (use Archive instead).
 */
export async function deleteItemPermanently(itemId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!itemId) return fail('Item id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  // Pre-check: item must belong to the active estate (RPC also hardened when SQL applied)
  let pre = supabase
    .from('estate_items')
    .select('id')
    .eq('id', itemId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) pre = pre.eq('estate_id', estate.estateId);
  const { data: owned, error: preErr } = await pre.maybeSingle();
  if (preErr) return fail(preErr);
  if (!owned) return fail('Item not found in this estate.');

  const { data, error } = await supabase.rpc('estate_admin_delete_item', {
    p_item_id: itemId,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;

  // Best-effort photo cleanup (ignore storage errors after row is gone)
  try {
    const paths = [];
    for (let i = 0; i < 8; i += 1) {
      paths.push(`${auth.userId}/${itemId}_${i}.jpg`);
    }
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  } catch {
    // ignore
  }

  return ok(data);
}

export async function ensureCaseSettings(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  if (!estate.ok) return fail(estate.error);
  if (estate.settings) return ok(estate.settings);
  return getSettings(caseNumber);
}

export async function listSiblingAccounts(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  let q = supabase
    .from('estate_sibling_accounts')
    .select(
      'sibling_key, display_name, preferred_name, access_tier, can_browse_rooms, financial_visibility, visibility_sections, updated_at'
    )
    .eq('owner_id', estate.userId)
    .order('display_name', { ascending: true });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  const { data, error } = await q;
  if (error) {
    // Older DBs without newer columns — step down
    if (/visibility_sections|financial_visibility|can_browse_rooms|preferred_name/i.test(error.message || '')) {
      let q2 = supabase
        .from('estate_sibling_accounts')
        .select('sibling_key, display_name, preferred_name, access_tier, can_browse_rooms, financial_visibility, updated_at')
        .eq('owner_id', estate.userId)
        .order('display_name', { ascending: true });
      if (estate.estateId) q2 = q2.eq('estate_id', estate.estateId);
      let retry = await q2;
      if (retry.error && /financial_visibility|can_browse_rooms|preferred_name/i.test(retry.error.message || '')) {
        let q3 = supabase
          .from('estate_sibling_accounts')
          .select('sibling_key, display_name, preferred_name, access_tier, can_browse_rooms, updated_at')
          .eq('owner_id', estate.userId)
          .order('display_name', { ascending: true });
        if (estate.estateId) q3 = q3.eq('estate_id', estate.estateId);
        retry = await q3;
        if (retry.error && /can_browse_rooms|preferred_name/i.test(retry.error.message || '')) {
          let q4 = supabase
            .from('estate_sibling_accounts')
            .select('sibling_key, display_name, preferred_name, access_tier, updated_at')
            .eq('owner_id', estate.userId)
            .order('display_name', { ascending: true });
          if (estate.estateId) q4 = q4.eq('estate_id', estate.estateId);
          retry = await q4;
          if (retry.error && /preferred_name/i.test(retry.error.message || '')) {
            let q5 = supabase
              .from('estate_sibling_accounts')
              .select('sibling_key, display_name, access_tier, updated_at')
              .eq('owner_id', estate.userId)
              .order('display_name', { ascending: true });
            if (estate.estateId) q5 = q5.eq('estate_id', estate.estateId);
            retry = await q5;
          }
        }
      }
      if (retry.error) return fail(retry.error);
      return ok(
        (retry.data || []).map((row) => {
          const financial_visibility = normalizeFamilyFinancialVisibility(
            String(row.access_tier || '').toLowerCase() === 'memorandum'
              ? 'minimal'
              : row.financial_visibility
          );
          return {
            ...row,
            preferred_name: row.preferred_name ?? null,
            can_browse_rooms:
              row.can_browse_rooms != null
                ? Boolean(row.can_browse_rooms)
                : ['residual', 'both'].includes(String(row.access_tier || 'residual').toLowerCase()),
            financial_visibility,
            visibility_sections: normalizeVisibilitySections(row.visibility_sections, {
              tier: financial_visibility,
              accessTier: row.access_tier,
              canBrowseRooms: row.can_browse_rooms
            }),
            admin_label: row.display_name
          };
        })
      );
    }
    return fail(error);
  }
  return ok(
    (data || []).map((row) => {
      const financial_visibility = normalizeFamilyFinancialVisibility(
        String(row.access_tier || '').toLowerCase() === 'memorandum'
          ? 'minimal'
          : row.financial_visibility
      );
      return {
        ...row,
        can_browse_rooms:
          row.can_browse_rooms != null
            ? Boolean(row.can_browse_rooms)
            : ['residual', 'both'].includes(String(row.access_tier || 'residual').toLowerCase()),
        financial_visibility,
        visibility_sections: normalizeVisibilitySections(row.visibility_sections, {
          tier: financial_visibility,
          accessTier: row.access_tier,
          canBrowseRooms: row.can_browse_rooms
        }),
        admin_label: row.display_name,
        preferred_name: row.preferred_name || null
      };
    })
  );
}

function buildSiblingSessionFromPayload(data, caseFallback) {
  const preferred = data.preferred_name != null ? String(data.preferred_name).trim() || null : null;
  const adminLabel = String(data.admin_label || data.display_name || '').trim();
  const publicName = preferred || adminLabel;
  const needsPreferred =
    data.needs_preferred_name != null
      ? Boolean(data.needs_preferred_name)
      : !preferred;
  const accessTier = data.access_tier || 'residual';
  const financialVisibility = normalizeFamilyFinancialVisibility(
    String(accessTier).toLowerCase() === 'memorandum'
      ? 'minimal'
      : data.financial_visibility
  );
  const visibilitySections = normalizeVisibilitySections(data.visibility_sections, {
    tier: financialVisibility,
    accessTier
  });
  return {
    token: data.token,
    sibling_key: data.sibling_key,
    display_name: publicName,
    admin_label: adminLabel,
    preferred_name: preferred,
    needs_preferred_name: needsPreferred,
    case_number: data.case_number || caseFallback,
    expires_at: data.expires_at,
    must_change_password: Boolean(data.must_change_password),
    access_tier: accessTier,
    financial_visibility: financialVisibility,
    visibility_sections: visibilitySections,
    can_browse_rooms:
      data.can_browse_rooms != null
        ? Boolean(data.can_browse_rooms)
        : Boolean(visibilitySections.rooms_inventory)
  };
}

function persistSiblingSession(session) {
  try {
    localStorage.setItem(SIBLING_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  return session;
}

/** @deprecated Prefer addHeir + setHeirPersonInvitePassword — unscoped legacy RPC revoked. */
export async function setSiblingPassword() {
  return fail(
    'Legacy heir password update is disabled. Use Settings → Heirs (case-scoped invite passwords).'
  );
}

/** @deprecated Prefer per-person invites via addHeir / setHeirPersonInvitePassword */
export async function setHeirInvitePassword(password, caseNumber) {
  const { data, error } = await supabase.rpc('estate_set_heir_invite_password', {
    p_password: password,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** Set / reset one heir’s invite password (clears their personal password). */
export async function setHeirPersonInvitePassword(siblingKey, password, caseNumber) {
  const key = String(siblingKey || '').trim();
  const pass = String(password || '').trim();
  if (!key) return fail('Missing person key.');
  if (pass.length < 6) return fail('Invite password must be at least 6 characters.');
  const { data, error } = await supabase.rpc('estate_set_heir_person_invite_password', {
    p_sibling_key: key,
    p_password: pass,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function addHeir(displayName, accessTier = 'residual', invitePassword, caseNumber) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter the person’s name (at least 2 characters).');
  }
  const pass = String(invitePassword || '').trim();
  if (pass.length < 6) {
    return fail('Set an invite password for this person (at least 6 characters).');
  }
  const tier = String(accessTier || 'residual')
    .trim()
    .toLowerCase();
  const { data, error } = await supabase.rpc('estate_add_heir', {
    p_display_name: name,
    p_access_tier: tier,
    p_case_number: resolveCaseArg(caseNumber),
    p_invite_password: pass
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setHeirAccessTier(siblingKey, accessTier, caseNumber) {
  const key = String(siblingKey || '').trim();
  const tier = String(accessTier || 'residual')
    .trim()
    .toLowerCase();
  if (!key) return fail('Missing heir key');
  const { data, error } = await supabase.rpc('estate_set_heir_access_tier', {
    p_sibling_key: key,
    p_access_tier: tier,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setHeirCanBrowseRooms(siblingKey, canBrowseRooms, caseNumber) {
  const key = String(siblingKey || '').trim();
  if (!key) return fail('Missing heir key');
  const { data, error } = await supabase.rpc('estate_set_heir_can_browse_rooms', {
    p_sibling_key: key,
    p_can_browse: Boolean(canBrowseRooms),
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setHeirFinancialVisibility(siblingKey, visibility, caseNumber) {
  const key = String(siblingKey || '').trim();
  if (!key) return fail('Missing heir key');
  const { data, error } = await supabase.rpc('estate_set_heir_financial_visibility', {
    p_sibling_key: key,
    p_visibility: normalizeFamilyFinancialVisibility(visibility),
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  if (data?.visibility_sections) {
    data.visibility_sections = normalizeVisibilitySections(data.visibility_sections, {
      tier: data.financial_visibility,
      accessTier: data.access_tier
    });
  }
  return ok(data);
}

export async function setHeirVisibilitySections(
  siblingKey,
  sections,
  caseNumber,
  visibility = null
) {
  const key = String(siblingKey || '').trim();
  if (!key) return fail('Missing heir key');
  const { data, error } = await supabase.rpc('estate_set_heir_visibility_sections', {
    p_sibling_key: key,
    p_case_number: resolveCaseArg(caseNumber),
    p_sections: sections && typeof sections === 'object' ? sections : {},
    p_visibility: visibility != null ? normalizeFamilyFinancialVisibility(visibility) : null
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_set_heir_visibility_sections|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Per-section visibility needs supabase-migrations/estate-heir-visibility-sections-2026-08.sql.'
      );
    }
    return failed;
  }
  if (data?.visibility_sections) {
    data.visibility_sections = normalizeVisibilitySections(data.visibility_sections, {
      tier: data.financial_visibility,
      accessTier: data.access_tier
    });
  }
  return ok(data);
}

export async function renameHeir(siblingKey, displayName, caseNumber) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter a name (at least 2 characters).');
  }
  const { data, error } = await supabase.rpc('estate_rename_heir', {
    p_sibling_key: siblingKey,
    p_display_name: name,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function listHeirNamesForCase(caseNumber) {
  const { data, error } = await supabase.rpc('estate_list_heir_names', {
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const names = (data.names || [])
    .map((row) => (typeof row === 'string' ? row : row?.display_name))
    .filter(Boolean);
  return ok({ case_number: data.case_number, names });
}

export async function removeHeir(siblingKey, caseNumber) {
  const { data, error } = await supabase.rpc('estate_remove_heir', {
    p_sibling_key: siblingKey,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export function isAdminUnlocked(caseNumber) {
  try {
    const raw = sessionStorage.getItem(ADMIN_UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed?.unlockedAt) return false;
    const cn = normalizeEstateCaseNumber(caseNumber || activeEstateCase);
    // Legacy unlocks without caseNumber are invalid under multi-estate
    if (!parsed.caseNumber) return false;
    return (
      normalizeEstateCaseNumber(parsed.caseNumber) === cn
    );
  } catch {
    return false;
  }
}

export function clearAdminUnlock() {
  try {
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
    sessionStorage.removeItem(ADMIN_MUST_CHANGE_KEY);
  } catch {
    // ignore
  }
}

export function adminMustChangePassword(caseNumber) {
  try {
    const stored = sessionStorage.getItem(ADMIN_MUST_CHANGE_KEY);
    if (!stored) return false;
    const cn = normalizeEstateCaseNumber(caseNumber || activeEstateCase);
    return normalizeEstateCaseNumber(stored) === cn;
  } catch {
    return false;
  }
}

export function clearAdminMustChangePassword() {
  try {
    sessionStorage.removeItem(ADMIN_MUST_CHANGE_KEY);
  } catch {
    // ignore
  }
}

function markAdminUnlocked(mustChangePassword, caseNumber) {
  try {
    const cn = normalizeEstateCaseNumber(caseNumber || activeEstateCase);
    sessionStorage.setItem(
      ADMIN_UNLOCK_KEY,
      JSON.stringify({ unlockedAt: Date.now(), caseNumber: cn })
    );
    if (mustChangePassword) {
      sessionStorage.setItem(ADMIN_MUST_CHANGE_KEY, cn);
    } else {
      sessionStorage.removeItem(ADMIN_MUST_CHANGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Estate Vault admin login: case password via atlasbackend → Supabase session for RLS.
 * Blocked while an heir/helper invite session is active on this device.
 */
export async function loginEstateAdmin(password, caseNumber = '') {
  if (hasActiveNonAdminEstateRole()) {
    return fail(NON_ADMIN_ROLE_BLOCK);
  }
  try {
    const res = await fetch(`${estateAuctionApiBase()}/api/estate-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        caseNumber: resolveCaseArg(caseNumber)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return fail(data.error || 'Incorrect password.');
    }
    if (!data.accessToken || !data.refreshToken) {
      return fail('Estate admin session was not returned by the server.');
    }
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken
    });
    if (sessionErr) {
      return fail(sessionErr.message || 'Could not start estate admin session.');
    }
    const cn = data.caseNumber || resolveCaseArg(caseNumber);
    clearSiblingSession();
    clearHelperSession();
    clearAdvisorSession();
    clearAuctionBidder();
    markAdminUnlocked(Boolean(data.mustChangePassword), cn);
    logEstateActivity({
      eventType: 'admin_unlock',
      caseNumber: cn
    });
    return ok({
      must_change_password: Boolean(data.mustChangePassword),
      case_number: cn
    });
  } catch (err) {
    return fail(err?.message || 'Could not reach estate admin login server.');
  }
}

/** @deprecated Prefer loginEstateAdmin — requires an existing auth session */
export async function verifyAdminPassword(password, caseNumber) {
  if (hasActiveNonAdminEstateRole()) {
    return fail(NON_ADMIN_ROLE_BLOCK);
  }
  const { data, error } = await supabase.rpc('estate_verify_admin_password', {
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  clearSiblingSession();
  clearHelperSession();
  clearAdvisorSession();
  markAdminUnlocked(Boolean(data?.must_change_password), caseNumber);
  return ok(data);
}

export async function setAdminPassword(currentPassword, newPassword, caseNumber) {
  const { data, error } = await supabase.rpc('estate_set_admin_password', {
    p_current: currentPassword,
    p_new: newPassword,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  clearAdminMustChangePassword();
  logEstateActivity({
    eventType: 'admin_password_changed',
    caseNumber: data?.case_number || resolveCaseArg(caseNumber)
  });
  return ok(data);
}

/**
 * Forgotten-PIN recovery. Authorization is estate ownership under the signed-in
 * PR account, so the old PIN is never needed. The RPC records the reset itself.
 */
export async function resetAdminPasswordAsOwner(newPassword, caseNumber) {
  const { data, error } = await supabase.rpc('estate_reset_admin_password_owned', {
    p_case_number: resolveCaseArg(caseNumber),
    p_new_password: newPassword
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  clearAdminMustChangePassword();
  return ok(data);
}

export function getStoredSiblingSession(caseNumber) {
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(SIBLING_SESSION_KEY);
      return null;
    }
    if (caseNumber) {
      const want = normalizeEstateCaseNumber(caseNumber);
      const have = normalizeEstateCaseNumber(parsed.case_number);
      if (!want || !have || want !== have) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSiblingSession() {
  try {
    localStorage.removeItem(SIBLING_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * True when this browser has an active heir, helper, or advisor invite session.
 * Those roles must leave before unlocking Personal Representative / admin.
 */
export function hasActiveNonAdminEstateRole() {
  return Boolean(getStoredSiblingSession() || getStoredHelperSession() || getStoredAdvisorSession());
}

/** Short label for the active invite role, if any. */
export function describeActiveNonAdminEstateRole() {
  const sibling = getStoredSiblingSession();
  if (sibling) {
    const name = sibling.display_name || sibling.admin_label || 'heir';
    const caseLabel = sibling.case_number ? ` (case ${sibling.case_number})` : '';
    return `heir (${name})${caseLabel}`;
  }
  const helper = getStoredHelperSession();
  if (helper) {
    const name = helper.display_name || 'helper';
    const caseLabel = helper.case_number ? ` (case ${helper.case_number})` : '';
    return `helper (${name})${caseLabel}`;
  }
  const advisor = getStoredAdvisorSession();
  if (advisor) {
    const name = advisor.display_name || 'advisor';
    const caseLabel = advisor.case_number ? ` (case ${advisor.case_number})` : '';
    return `advisor (${name})${caseLabel}`;
  }
  return '';
}

const NON_ADMIN_ROLE_BLOCK =
  'You are signed in as a family, helper, or advisor role. Leave that estate session before signing in as Personal Representative.';

export async function siblingLogin(caseNumber, displayName, password) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Select or enter your name.');
  }
  const { data, error } = await supabase.rpc('estate_sibling_login', {
    p_case_number: resolveCaseArg(caseNumber),
    p_display_name: name,
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  clearAdminUnlock();
  clearHelperSession();
  clearAdvisorSession();
  const session = persistSiblingSession(
    buildSiblingSessionFromPayload(data, resolveCaseArg(caseNumber))
  );
  logEstateActivity({
    eventType: 'heir_login',
    caseNumber: session.case_number || caseNumber,
    sessionToken: session.token
  });
  return ok(session);
}

/** Heir chooses the name shown to family (PIN login stays the credential). */
export async function setPreferredName(preferredName, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const name = String(preferredName || '').trim();
  if (name.length < 2) return fail('Enter a name (at least 2 characters).');
  const { data, error } = await supabase.rpc('estate_set_preferred_name', {
    p_token: sessionToken,
    p_preferred_name: name
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (error && /estate_set_preferred_name|does not exist|schema cache/i.test(error.message || '')) {
      return fail(
        'Preferred-name update needs a database update. Run supabase-migrations/estate-heir-preferred-name.sql in Supabase.'
      );
    }
    return failed;
  }
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.preferred_name = data.preferred_name || name;
      parsed.display_name = data.display_name || name;
      parsed.admin_label = data.admin_label || parsed.admin_label;
      parsed.needs_preferred_name = false;
      persistSiblingSession(parsed);
    }
  } catch {
    // ignore
  }
  return ok(data);
}

export async function heirChangePassword(currentPassword, newPassword, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_heir_change_password', {
    p_token: sessionToken,
    p_current_password: currentPassword,
    p_new_password: newPassword
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.must_change_password = false;
      localStorage.setItem(SIBLING_SESSION_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
  return ok(data);
}

export async function siblingListItems(token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_sibling_list_items', {
    p_token: sessionToken
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const preferred =
    data.preferred_name != null ? String(data.preferred_name).trim() || null : null;
  const adminLabel = String(data.admin_label || data.display_name || '').trim();
  const publicName = preferred || adminLabel || data.display_name;
  const accessTier = data.access_tier || 'residual';
  const financialVisibility = normalizeFamilyFinancialVisibility(
    String(accessTier).toLowerCase() === 'memorandum'
      ? 'minimal'
      : data.financial_visibility
  );
  const visibilitySections = normalizeVisibilitySections(data.visibility_sections, {
    tier: financialVisibility,
    accessTier
  });
  const canBrowseRooms =
    data.can_browse_rooms != null
      ? Boolean(data.can_browse_rooms)
      : Boolean(visibilitySections.rooms_inventory);
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (data.access_tier) parsed.access_tier = accessTier;
      parsed.can_browse_rooms = canBrowseRooms;
      parsed.financial_visibility = financialVisibility;
      parsed.visibility_sections = visibilitySections;
      if (data.display_name || preferred) parsed.display_name = publicName;
      if (adminLabel) parsed.admin_label = adminLabel;
      parsed.preferred_name = preferred;
      if (data.needs_preferred_name != null) {
        parsed.needs_preferred_name = Boolean(data.needs_preferred_name);
      }
      persistSiblingSession(parsed);
    }
  } catch {
    // ignore
  }
  return ok({
    sibling_key: data.sibling_key,
    display_name: publicName,
    admin_label: adminLabel,
    preferred_name: preferred,
    needs_preferred_name:
      data.needs_preferred_name != null ? Boolean(data.needs_preferred_name) : !preferred,
    access_tier: accessTier,
    financial_visibility: financialVisibility,
    visibility_sections: visibilitySections,
    can_browse_rooms: canBrowseRooms,
    letters_issued_at: data.letters_issued_at || null,
    case_number: data.case_number || '',
    estate_name: data.estate_name != null ? String(data.estate_name).trim() || null : null,
    court_case_number:
      data.court_case_number != null ? String(data.court_case_number).trim() || null : null,
    probate_window_mode: data.probate_window_mode || 'duration',
    probate_window_amount: data.probate_window_amount ?? 90,
    probate_window_unit: data.probate_window_unit || 'days',
    probate_window_end_date: data.probate_window_end_date || null,
    items: data.items || []
  });
}

/** Friendly estate name for a signed-in heir (PR getSettings is not available). */
export async function getSiblingEstateLabel(token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_sibling_estate_label', {
    p_token: sessionToken
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_sibling_estate_label|schema cache|does not exist/i.test(failed.error || '')) {
      // Deployed builds before this RPC: transparency summary already returns estate_name.
      const transparency = await getHeirTransparencySummary();
      if (transparency.success) {
        return ok({
          estate_name: transparency.data?.estate_name || null,
          case_number: transparency.data?.case_number || null,
          court_case_number: transparency.data?.court_case_number || null
        });
      }
      return fail(
        'Estate label needs supabase-migrations/estate-sibling-estate-label-2026-08.sql in Supabase.'
      );
    }
    return failed;
  }
  return ok({
    estate_name: data?.estate_name != null ? String(data.estate_name).trim() || null : null,
    case_number: data?.case_number || null,
    court_case_number:
      data?.court_case_number != null ? String(data.court_case_number).trim() || null : null
  });
}

export async function siblingRequestItem(itemId, reason, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_request_item', {
    p_token: sessionToken,
    p_item_id: itemId,
    p_reason: reason
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const sess = getStoredSiblingSession();
  logEstateActivity({
    eventType: 'heir_request_item',
    caseNumber: sess?.case_number,
    sessionToken,
    metadata: { item_id: itemId }
  });
  return ok(data);
}

export async function siblingCancelRequest(itemId, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_cancel_item_request', {
    p_token: sessionToken,
    p_item_id: itemId
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** Heir: no interest / authorize public sale (unanimous => auction flags). */
export async function siblingReleaseForSale(itemId, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_heir_release_for_sale', {
    p_token: sessionToken,
    p_item_id: itemId
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_heir_release_for_sale|family_releases|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Family release needs a database update. Run supabase-migrations/estate-family-release-for-sale.sql in the Supabase SQL Editor.'
      );
    }
    return failed;
  }
  return ok(data);
}

function messagingMigrationHint(failed) {
  if (
    failed &&
    /estate_messages|estate_heir_list_messages|estate_heir_send_message|schema cache|does not exist/i.test(
      failed.error || ''
    )
  ) {
    return fail(
      'Messaging needs a database update. Run supabase-migrations/estate-messaging.sql in the Supabase SQL Editor.'
    );
  }
  return failed;
}

/** Heir: list messages with the Personal Representative. */
export async function siblingListMessages(token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_heir_list_messages', {
    p_token: sessionToken
  });
  const failed = messagingMigrationHint(rpcFail(data, error));
  if (failed) return failed;
  return ok({
    messages: data.messages || [],
    unread_count: Number(data.unread_count) || 0,
    sibling_key: data.sibling_key || null
  });
}

/** Heir: send a message to the Personal Representative. */
export async function siblingSendMessage(body, token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_heir_send_message', {
    p_token: sessionToken,
    p_body: body
  });
  const failed = messagingMigrationHint(rpcFail(data, error));
  if (failed) return failed;
  return ok(data.message || data);
}

/** Heir: mark PR replies as read. */
export async function siblingMarkMessagesRead(token) {
  const sessionToken = token || getStoredSiblingSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_heir_mark_messages_read', {
    p_token: sessionToken
  });
  const failed = messagingMigrationHint(rpcFail(data, error));
  if (failed) return failed;
  return ok(data);
}

/**
 * Admin: list heir message threads for the active estate
 * (one thread per sibling_key with last message + unread from heirs).
 */
export async function listMessageThreads(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId) {
    return fail('Could not resolve estate for messages.');
  }

  let q = supabase
    .from('estate_messages')
    .select('id, sibling_key, sender_role, body, read_at, created_at')
    .order('created_at', { ascending: false });
  q = q.eq('estate_id', estate.estateId);

  const { data: rows, error } = await q;
  if (error) {
    return messagingMigrationHint(fail(error)) || fail(error);
  }

  const heirsResult = await listSiblingAccounts(caseNumber || estate.caseNumber);
  const heirMap = new Map();
  if (heirsResult.success) {
    (heirsResult.data || []).forEach((h) => {
      heirMap.set(h.sibling_key, h);
    });
  }

  const byKey = new Map();
  for (const row of rows || []) {
    const key = row.sibling_key;
    if (!byKey.has(key)) {
      byKey.set(key, {
        sibling_key: key,
        last_message: row,
        unread_count: 0,
        message_count: 0
      });
    }
    const thread = byKey.get(key);
    thread.message_count += 1;
    if (row.sender_role === 'heir' && !row.read_at) {
      thread.unread_count += 1;
    }
  }

  const threads = [...byKey.values()].map((t) => {
    const heir = heirMap.get(t.sibling_key);
    return {
      ...t,
      display_name: heir?.display_name || t.sibling_key,
      preferred_name: heir?.preferred_name || null
    };
  });

  // Also include heirs with no messages yet so PR can start a conversation
  if (heirsResult.success) {
    for (const h of heirsResult.data || []) {
      if (!byKey.has(h.sibling_key)) {
        threads.push({
          sibling_key: h.sibling_key,
          display_name: h.display_name || h.sibling_key,
          preferred_name: h.preferred_name || null,
          last_message: null,
          unread_count: 0,
          message_count: 0
        });
      }
    }
  }

  threads.sort((a, b) => {
    if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
    const at = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
    const bt = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
    return bt - at;
  });

  const totalUnread = threads.reduce((n, t) => n + (t.unread_count || 0), 0);
  return ok({ threads, total_unread: totalUnread });
}

/** Light unread count for PR home — avoids nested heir list. */
export async function countUnreadHeirMessages(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId) {
    return fail('Could not resolve estate for messages.');
  }

  const { count, error } = await supabase
    .from('estate_messages')
    .select('id', { count: 'exact', head: true })
    .eq('estate_id', estate.estateId)
    .eq('sender_role', 'heir')
    .is('read_at', null);

  if (error) {
    return messagingMigrationHint(fail(error)) || fail(error);
  }
  return ok({ total_unread: Number(count) || 0 });
}

/** Admin: messages for one heir thread. */
export async function listMessagesForHeir(siblingKey, caseNumber) {
  const key = String(siblingKey || '').trim();
  if (!key) return fail('Heir is required.');
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId) return fail('Could not resolve estate for messages.');

  const { data: rows, error } = await supabase
    .from('estate_messages')
    .select('id, sibling_key, sender_role, body, read_at, created_at')
    .eq('estate_id', estate.estateId)
    .eq('sibling_key', key)
    .order('created_at', { ascending: true });

  if (error) {
    return messagingMigrationHint(fail(error)) || fail(error);
  }
  return ok(rows || []);
}

/** Admin: send message to an heir. */
export async function sendAdminMessage(siblingKey, body, caseNumber) {
  const key = String(siblingKey || '').trim();
  const text = String(body || '').trim();
  if (!key) return fail('Heir is required.');
  if (!text) return fail('Message cannot be empty.');
  if (text.length > 4000) return fail('Message is too long (max 4000 characters).');

  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId || !estate.userId) {
    return fail('Could not resolve estate for messages.');
  }

  const { data, error } = await supabase
    .from('estate_messages')
    .insert({
      owner_id: estate.userId,
      estate_id: estate.estateId,
      sibling_key: key,
      sender_role: 'admin',
      body: text
    })
    .select('id, sibling_key, sender_role, body, read_at, created_at')
    .single();

  if (error) {
    return messagingMigrationHint(fail(error)) || fail(error);
  }
  return ok(data);
}

/** Admin: mark heir → PR messages as read for a thread. */
export async function markAdminMessagesRead(siblingKey, caseNumber) {
  const key = String(siblingKey || '').trim();
  if (!key) return fail('Heir is required.');
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId) return fail('Could not resolve estate for messages.');

  const { error } = await supabase
    .from('estate_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('estate_id', estate.estateId)
    .eq('sibling_key', key)
    .eq('sender_role', 'heir')
    .is('read_at', null);

  if (error) {
    return messagingMigrationHint(fail(error)) || fail(error);
  }
  return ok(true);
}

export async function listAuctionItems(caseNumber) {
  const cn = resolveCaseArg(caseNumber);
  const { data, error } = await supabase.rpc('estate_list_auction_items', {
    p_case_number: cn
  });
  const failed = rpcFail(data, error);
  if (failed) {
    // Fail closed: never return unfiltered approved_for_sale rows across estates
    return fail(
      failed.error ||
        'Auction catalog is unavailable. Apply estate multi-estate foundation SQL, then retry.'
    );
  }
  return ok(data?.items || []);
}

export async function placeAuctionBid({ itemId, amount, sessionToken, caseNumber }) {
  const bidder = getAuctionBidder(caseNumber);
  const token = sessionToken || bidder?.sessionToken;
  if (!token) {
    return fail('Register and verify a payment card before bidding.');
  }
  // Soft client guard: EstateIt admin unlock or logged-in estate owner should not bid
  if (isAdminUnlocked(caseNumber)) {
    return fail(
      'Personal Representative admin session is active — do not bid on the public auction. Use Admin Notes or pay FMV into the estate account.'
    );
  }
  const ownership = await isLoggedInEstateOwner(caseNumber);
  if (ownership.success && ownership.data === true) {
    return fail(
      'Your account owns this estate inventory — you may not place public auction bids.'
    );
  }
  const cn = resolveCaseArg(caseNumber);
  const listed = await listPublicEstates();
  if (listed.success) {
    const estate = (listed.data || []).find((e) => e.caseNumber === cn);
    const window = estate?.auctionWindow || resolveAuctionWindow({});
    if (!window.biddingOpen) {
      if (window.phase === 'upcoming' || window.phase === 'unscheduled') {
        return fail(
          'Auction has not opened yet. You can preview lots, but bidding starts on the open date.'
        );
      }
      return fail('This auction has ended. Bidding is closed.');
    }
  }
  const { data, error } = await supabase.rpc('estate_place_bid', {
    p_item_id: itemId,
    p_bidder_token: token,
    p_amount: Number(amount)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  logEstateActivity({
    eventType: 'auction_bid',
    caseNumber: cn,
    metadata: { item_id: itemId, amount: Number(amount) }
  });
  return ok(data);
}
export async function isLoggedInEstateOwner(caseNumber = '') {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) return ok(false);
  const { data, error } = await supabase.rpc('estate_auction_public_info', {
    p_case_number: caseNumber
  });
  if (error || !data?.success) return ok(false);
  return ok(Boolean(data.owner_id && data.owner_id === userData.user.id));
}

/** Atlasbackend base for EstateIt routes (admin login + auction). */
function estateAuctionApiBase() {
  return estateBackendBase();
}

export async function getAuctionPublicConfig(caseNumber = '') {
  try {
    const res = await fetch(
      `${estateAuctionApiBase()}/api/estate-auction/config?caseNumber=${encodeURIComponent(resolveCaseArg(caseNumber))}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return fail(data.error || 'Could not load auction payment config.');
    }
    return ok(data);
  } catch (err) {
    return fail(err?.message || 'Could not reach auction payment server.');
  }
}

export async function createAuctionSetupIntent({ name, email, phone, caseNumber }) {
  try {
    const res = await fetch(`${estateAuctionApiBase()}/api/estate-auction/setup-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        caseNumber: resolveCaseArg(caseNumber)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return fail(data.error || 'Could not start card verification.');
    }
    return ok(data);
  } catch (err) {
    return fail(err?.message || 'Could not start card verification.');
  }
}

export async function confirmAuctionRegistration({
  setupIntentId,
  name,
  email,
  phone,
  caseNumber,
  termsAccepted
}) {
  try {
    const res = await fetch(`${estateAuctionApiBase()}/api/estate-auction/confirm-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setupIntentId,
        name,
        email,
        phone,
        caseNumber: resolveCaseArg(caseNumber),
        termsAccepted: Boolean(termsAccepted)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return fail(data.error || 'Could not complete registration.');
    }
    const saved = saveAuctionBidderSession(data.bidder);
    if (!saved.success) return saved;
    return ok(saved.data);
  } catch (err) {
    return fail(err?.message || 'Could not complete registration.');
  }
}

export async function getSettings(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  if (!estate.ok) return fail(estate.error);

  if (!estate.settings) {
    return ok({
      id: estate.estateId || null,
      owner_id: estate.userId,
      case_number: estate.caseNumber || resolveCaseArg(caseNumber),
      letters_issued_at: null,
      probate_window_mode: 'duration',
      probate_window_amount: 90,
      probate_window_unit: 'days',
      probate_window_end_date: null,
      auction_pickup_window: null,
      pr_auction_block_emails: null,
      pr_loans_total: 0,
      estate_cash_on_hand: 0
    });
  }

  const data = estate.settings;
  return ok({
    ...data,
    probate_window_mode: data.probate_window_mode || 'duration',
    probate_window_amount: data.probate_window_amount ?? 90,
    probate_window_unit: data.probate_window_unit || 'days',
    probate_window_end_date: data.probate_window_end_date || null,
    family_financial_visibility: data.family_financial_visibility || 'minimal'
  });
}

export async function saveSettings({
  lettersIssuedAt,
  caseNumber,
  estateName,
  courtCaseNumber,
  probateWindowMode,
  probateWindowAmount,
  probateWindowUnit,
  probateWindowEndDate,
  auctionStartDate,
  auctionEndDate,
  auctionPickupWindow,
  prAuctionBlockEmails,
  prLoansTotal,
  estateCashOnHand,
  familyFinancialVisibility,
  willReference,
  memorandumReference,
  residualNotes,
  equalizationNotes
} = {}) {
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);

  const row = {
    owner_id: estate.userId,
    updated_at: new Date().toISOString()
  };
  if (estate.estateId) row.id = estate.estateId;

  // Never rename case via saveSettings unless explicitly changing identity —
  // keep locked to the active estate case.
  row.case_number = estate.caseNumber || resolveCaseArg(caseNumber);

  if (estateName !== undefined) {
    const name = String(estateName || '').trim();
    if (name.length < 2) {
      return fail('Enter an estate name (at least 2 characters).');
    }
    row.estate_name = name.slice(0, 120);
  }
  if (courtCaseNumber !== undefined) {
    const court = String(courtCaseNumber || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    row.court_case_number = court || null;
  }

  if (estateName !== undefined || courtCaseNumber !== undefined) {
    const { data: idCheck, error: idErr } = await supabase.rpc('estate_check_identity_available', {
      p_estate_name: row.estate_name ?? estate.settings?.estate_name ?? null,
      p_court_case_number: row.court_case_number !== undefined
        ? row.court_case_number
        : estate.settings?.court_case_number ?? null,
      p_exclude_estate_id: estate.estateId
    });
    if (idErr) {
      if (!/estate_check_identity_available|schema cache|does not exist/i.test(idErr.message || '')) {
        return fail(idErr);
      }
      // Migration not applied yet — fall through; unique indexes will still protect when present
    } else if (idCheck?.success === false) {
      return fail(idCheck.error || 'That case number is already in use by another estate.');
    }
  }

  if (lettersIssuedAt !== undefined) {
    const previousLetters = estate.settings?.letters_issued_at || null;
    const nextLetters = lettersIssuedAt || null;
    row.letters_issued_at = nextLetters;
    if (String(previousLetters || '') !== String(nextLetters || '')) {
      logEstateActivity({
        eventType: 'date_correction',
        caseNumber: estate.caseNumber,
        metadata: {
          field: 'letters_issued_at',
          old_value: previousLetters || '',
          new_value: nextLetters || ''
        }
      });
    }
  }
  if (probateWindowMode !== undefined) {
    const mode = String(probateWindowMode || '')
      .trim()
      .toLowerCase();
    row.probate_window_mode = mode === 'date' ? 'date' : 'duration';
  }
  if (probateWindowAmount !== undefined) {
    const n = Number(probateWindowAmount);
    if (!Number.isFinite(n) || n < 1) {
      return fail('Probate window amount must be at least 1.');
    }
    row.probate_window_amount = Math.min(3650, Math.floor(n));
  }
  if (probateWindowUnit !== undefined) {
    const u = String(probateWindowUnit || '')
      .trim()
      .toLowerCase();
    row.probate_window_unit = u === 'weeks' || u === 'months' ? u : 'days';
  }
  if (probateWindowEndDate !== undefined) {
    const previousEnd = estate.settings?.probate_window_end_date || null;
    const nextEnd = probateWindowEndDate || null;
    row.probate_window_end_date = nextEnd;
    if (String(previousEnd || '') !== String(nextEnd || '')) {
      logEstateActivity({
        eventType: 'date_correction',
        caseNumber: estate.caseNumber,
        metadata: {
          field: 'probate_window_end_date',
          old_value: previousEnd || '',
          new_value: nextEnd || ''
        }
      });
    }
  }
  if (auctionStartDate !== undefined) {
    row.auction_start_date = auctionStartDate || null;
  }
  if (auctionEndDate !== undefined) {
    row.auction_end_date = auctionEndDate || null;
  }
  {
    const start =
      auctionStartDate !== undefined
        ? auctionStartDate || null
        : estate.settings?.auction_start_date || null;
    const end =
      auctionEndDate !== undefined
        ? auctionEndDate || null
        : estate.settings?.auction_end_date || null;
    if (start && end && String(end).slice(0, 10) < String(start).slice(0, 10)) {
      return fail('Auction end date must be on or after the start date.');
    }
  }
  if (auctionPickupWindow !== undefined) {
    row.auction_pickup_window = String(auctionPickupWindow || '').trim() || null;
  }
  if (prAuctionBlockEmails !== undefined) {
    row.pr_auction_block_emails = String(prAuctionBlockEmails || '').trim() || null;
  }
  if (prLoansTotal != null && prLoansTotal !== '') {
    const n = Number(prLoansTotal);
    if (!Number.isNaN(n)) row.pr_loans_total = n;
  }
  if (estateCashOnHand != null && estateCashOnHand !== '') {
    const n = Number(estateCashOnHand);
    if (!Number.isNaN(n)) row.estate_cash_on_hand = n;
  }
  if (familyFinancialVisibility !== undefined) {
    row.family_financial_visibility = normalizeFamilyFinancialVisibility(
      familyFinancialVisibility
    );
  }
  if (willReference !== undefined) {
    row.will_reference = String(willReference || '').trim() || null;
  }
  if (memorandumReference !== undefined) {
    row.memorandum_reference = String(memorandumReference || '').trim() || null;
  }
  if (residualNotes !== undefined) {
    row.residual_notes = String(residualNotes || '').trim() || null;
  }
  if (equalizationNotes !== undefined) {
    row.equalization_notes = String(equalizationNotes || '').trim() || null;
  }

  if (!estate.estateId) {
    return fail(
      'This estate is missing multi-estate scope. Run estate-multi-estate-foundation.sql before saving settings.'
    );
  }

  const { data, error } = await supabase
    .from('estate_settings')
    .upsert(row, { onConflict: 'id' })
    .select(settingsSelect)
    .single();

  if (error) {
    if (isMissingColumnError(error, 'family_financial_visibility')) {
      return fail(
        'Family financial visibility needs the transparency SQL migration. Run supabase-migrations/estate-family-transparency-2026-07.sql, then try again.'
      );
    }
    if (
      isMissingColumnError(error, 'will_reference') ||
      isMissingColumnError(error, 'memorandum_reference') ||
      isMissingColumnError(error, 'residual_notes') ||
      isMissingColumnError(error, 'equalization_notes')
    ) {
      return fail(
        'Governing instrument fields need the OS-quality SQL migration. Run supabase-migrations/estate-os-quality-2026-07.sql, then try again.'
      );
    }
    if (isMissingColumnError(error, 'accounting_method')) {
      return fail(
        'Accounting method needs the court-accounting SQL migration. Run supabase-migrations/estate-court-accounting-upgrade-2026-07.sql, then try again.'
      );
    }
    if (/estate_settings_court_case_uidx|estate_settings_name_court_uidx|duplicate key|unique/i.test(error.message || '')) {
      return fail(
        'That case number is already used by another estate. Each estate must keep its own case number.'
      );
    }
    return fail(error);
  }
  logEstateActivity({
    eventType: 'settings_save',
    caseNumber: estate.caseNumber
  });
  return ok(data);
}

/**
 * Explicit PR certification of inventory completion.
 * Completion is never inferred from an empty review queue.
 */
export async function setInventoryCompletion({
  caseNumber,
  complete = true,
  reopenReason = ''
} = {}) {
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  if (!estate.ok) return fail(estate.error);
  if (!estate.estateId) {
    return fail(
      'This estate is missing multi-estate scope. Run estate-multi-estate-foundation.sql first.'
    );
  }
  if (estate.settings?.closed_at) {
    return fail('This estate is closed for records. Reopen the estate before changing inventory status.');
  }

  const now = new Date().toISOString();
  let updates;
  let eventType;

  if (complete) {
    const [itemsResult, pendingResult] = await Promise.all([
      listAllItemsWithRooms(estate.caseNumber),
      listPendingReviewItems(estate.caseNumber)
    ]);
    if (!itemsResult.success) return itemsResult;
    if (!pendingResult.success) return pendingResult;
    const activeItems = (itemsResult.data || []).filter(
      (item) => item?.legal_status !== 'archived'
    );
    if (!activeItems.length) {
      return fail('Add at least one inventory item before marking the inventory complete.');
    }
    if ((pendingResult.data || []).length) {
      return fail(
        `Review the ${(pendingResult.data || []).length} pending item(s) before marking the inventory complete.`
      );
    }
    updates = {
      inventory_completed_at: now,
      inventory_completed_by:
        estate.settings?.owner_email || estate.userId || 'Personal Representative',
      inventory_reopened_at: null,
      inventory_reopen_reason: null,
      updated_at: now
    };
    eventType = 'inventory_marked_complete';
  } else {
    const reason = String(reopenReason || '').trim();
    if (reason.length < 5) {
      return fail('Enter a brief reason for reopening the inventory.');
    }
    updates = {
      inventory_completed_at: null,
      inventory_completed_by: null,
      inventory_reopened_at: now,
      inventory_reopen_reason: reason.slice(0, 500),
      updated_at: now
    };
    eventType = 'inventory_reopened';
  }

  const { data, error } = await supabase
    .from('estate_settings')
    .update(updates)
    .eq('id', estate.estateId)
    .eq('owner_id', estate.userId)
    .select(SETTINGS_SELECT)
    .single();

  if (error) {
    if (
      isMissingColumnError(error, 'inventory_completed_at') ||
      isMissingColumnError(error, 'inventory_completed_by') ||
      isMissingColumnError(error, 'inventory_reopened_at') ||
      isMissingColumnError(error, 'inventory_reopen_reason')
    ) {
      return fail(
        'Inventory completion needs the inventory-completion SQL migration. Run supabase-migrations/estate-inventory-completion-2026-07.sql, then try again.'
      );
    }
    return fail(error);
  }

  logEstateActivity({
    eventType,
    caseNumber: estate.caseNumber,
    metadata: complete ? {} : { reason: updates.inventory_reopen_reason }
  });
  return ok(data);
}

export async function listPublicEstates() {
  const { data, error } = await supabase.rpc('estate_list_public_estates');
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const rows = Array.isArray(data?.estates) ? data.estates : [];
  const estates = rows
    .map((row) => {
      const caseNumber = normalizeEstateCaseNumber(row?.case_number);
      if (!caseNumber) return null;
      const estateName =
        String(row?.estate_name || '').trim() || caseNumber;
      const courtCaseNumber = normalizeEstateCaseNumber(row?.court_case_number) || null;
      const auctionStartDate = row?.auction_start_date
        ? String(row.auction_start_date).slice(0, 10)
        : null;
      const auctionEndDate = row?.auction_end_date
        ? String(row.auction_end_date).slice(0, 10)
        : null;
      return {
        caseNumber,
        estateName,
        courtCaseNumber,
        auctionStartDate,
        auctionEndDate,
        auctionWindow: resolveAuctionWindow({
          auction_start_date: auctionStartDate,
          auction_end_date: auctionEndDate
        })
      };
    })
    .filter(Boolean);
  return ok(estates);
}

/** Estates owned by the signed-in Google PR. */
export async function listOwnedEstates() {
  const { data, error } = await supabase.rpc('estate_list_owned_estates');
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_list_owned_estates|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Owner estates need a database update. Run supabase-migrations/estate-create-owned-estate.sql in Supabase.'
      );
    }
    return failed;
  }
  return ok(Array.isArray(data?.estates) ? data.estates : []);
}

/** Create a new estate for the signed-in Google PR. */
export async function createOwnedEstate({ estateName, courtCaseNumber = null, caseNumber = null } = {}) {
  const { data, error } = await supabase.rpc('estate_create_owned_estate', {
    p_estate_name: String(estateName || '').trim(),
    p_court_case_number: courtCaseNumber ? String(courtCaseNumber).trim() : null,
    p_case_number: caseNumber ? String(caseNumber).trim() : null
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_create_owned_estate|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Create estate needs a database update. Run supabase-migrations/estate-create-owned-estate.sql in Supabase.'
      );
    }
    return failed;
  }
  logEstateActivity({
    eventType: 'estate_create',
    caseNumber: data?.case_number,
    metadata: { court_case_number: data?.court_case_number || null }
  });
  void notifyEstateOperator({
    event: 'estate',
    estateName: data?.estate_name || String(estateName || '').trim() || null,
    caseNumber: data?.case_number || null,
    courtCaseNumber: data?.court_case_number || null,
    estateId: data?.estate_id || data?.id || null
  });
  return ok(data);
}
export async function claimOwnedEstate({ caseNumber, password } = {}) {
  const cn = normalizeEstateCaseNumber(caseNumber);
  const pass = String(password || '');
  if (!cn) return fail('Case number is required.');
  if (!pass) return fail('Admin password is required.');

  const { data, error } = await supabase.rpc('estate_claim_owned_estate', {
    p_case_number: cn,
    p_password: pass
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_claim_owned_estate|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Claim estate needs a database update. Run supabase-migrations/estate-one-primary-pr-email.sql in Supabase.'
      );
    }
    return failed;
  }
  logEstateActivity({
    eventType: 'estate_claim',
    caseNumber: data?.case_number || cn
  });
  return ok(data);
}

/**
 * Whether a case shell may be entered (published, allowlisted, or owned by signed-in PR).
 */
export async function checkEstateCaseAccessible(caseNumber) {
  const cn = normalizeEstateCaseNumber(caseNumber);
  if (!cn) return ok({ accessible: false, reason: 'missing' });

  if (isOpenEstateCase(cn)) {
    return ok({ accessible: true, published: true, allowlisted: true });
  }

  const { data, error } = await supabase.rpc('estate_case_accessible', {
    p_case_number: cn
  });
  if (error) {
    if (/estate_case_accessible|schema cache|does not exist/i.test(error.message || '')) {
      // SQL not applied yet — fall back to static allowlist only
      return ok({ accessible: isOpenEstateCase(cn), reason: 'rpc_missing' });
    }
    return fail(error);
  }
  if (data?.success === false) {
    return ok({ accessible: false, reason: data.error || 'denied' });
  }
  return ok({
    accessible: Boolean(data?.accessible),
    owned: Boolean(data?.owned),
    published: Boolean(data?.published),
    caseNumber: data?.case_number || cn
  });
}

/** True when signed-in auth user owns this estate case. */
export async function isLoggedInOwnerOfCase(caseNumber) {
  const cn = normalizeEstateCaseNumber(caseNumber);
  if (!cn) return ok(false);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return ok(false);

  const { data, error } = await supabase
    .from('estate_settings')
    .select('id, owner_id')
    .ilike('case_number', cn)
    .maybeSingle();
  if (error) return fail(error);
  return ok(Boolean(data?.owner_id && data.owner_id === userData.user.id));
}

/**
 * Resolve a typed estate name (or court/portal case id) against the public list.
 * @returns {{ ok: true, estate } | { ok: false, error: string, matches?: object[] }}
 */
/**
 * Family door lookup. Resolves server-side so the client never receives a
 * directory of every estate on the platform.
 */
export async function findPublicEstateByName(rawName) {
  const typed = String(rawName || '').trim();
  if (typed.length < 2) {
    return fail('Enter the estate name (at least 2 characters).');
  }

  const { data, error } = await supabase.rpc('estate_find_public_estate_by_name', {
    p_name: typed
  });
  if (error) {
    if (/estate_find_public_estate_by_name|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Estate lookup needs a database update. Run supabase-migrations/estate-security-hardening-2026-07.sql in Supabase.'
      );
    }
    return fail(error);
  }
  if (data?.success === false) {
    return fail(data.error || 'No estate found with that name.');
  }

  const row = data?.estate;
  const caseNumber = normalizeEstateCaseNumber(row?.case_number);
  if (!caseNumber) {
    return fail('No estate found with that name. Check the spelling and try again.');
  }
  const auctionStartDate = row?.auction_start_date
    ? String(row.auction_start_date).slice(0, 10)
    : null;
  const auctionEndDate = row?.auction_end_date ? String(row.auction_end_date).slice(0, 10) : null;
  return ok({
    caseNumber,
    estateName: String(row?.estate_name || '').trim() || caseNumber,
    courtCaseNumber: normalizeEstateCaseNumber(row?.court_case_number) || null,
    auctionStartDate,
    auctionEndDate,
    auctionWindow: resolveAuctionWindow({
      auction_start_date: auctionStartDate,
      auction_end_date: auctionEndDate
    })
  });
}

/** Landing “View auctions” — only estates whose auction has started (public). */
export async function listPublicAuctionSummaries() {
  const listed = await listPublicEstates();
  if (!listed.success) return listed;
  const estates = (listed.data || []).filter((e) => e.auctionWindow?.isPublic);
  const summaries = [];
  for (const estate of estates) {
    const lots = await listAuctionItems(estate.caseNumber);
    const items = lots.success ? lots.data || [] : [];
    summaries.push({
      caseNumber: estate.caseNumber,
      estateName: estate.estateName,
      courtCaseNumber: estate.courtCaseNumber,
      lotCount: items.length,
      sampleItems: items.slice(0, 3),
      auctionWindow: estate.auctionWindow
    });
  }
  summaries.sort((a, b) => a.estateName.localeCompare(b.estateName));
  return ok(summaries);
}

/**
 * Landing sign-in: estate already resolved; access code identifies the person.
 * Heirs: unique PIN. Helpers: name + PIN (pass displayName).
 * @param {{ caseNumber: string, code: string, displayName?: string }}
 */
export async function loginWithEstateAccessCode({ caseNumber, code, displayName }) {
  const cn = resolveCaseArg(caseNumber);
  const pass = String(code || '').trim();
  const name = String(displayName || '').trim();
  if (!pass) return fail('Enter your access code.');

  const { data, error } = await supabase.rpc('estate_login_by_access_code', {
    p_case_number: cn,
    p_password: pass,
    p_display_name: name || null
  });
  if (!error && data?.success) {
    const role = data.role;
    if (role === 'family') {
      clearHelperSession();
      clearAdvisorSession();
      clearAdminUnlock();
      const session = persistSiblingSession(buildSiblingSessionFromPayload(data, cn));
      logEstateActivity({
        eventType: 'heir_login',
        caseNumber: session.case_number || cn,
        sessionToken: session.token
      });
      return ok({ role: 'family', ...session });
    }
    if (role === 'helper') {
      clearSiblingSession();
      clearAdvisorSession();
      clearAdminUnlock();
      const session = {
        token: data.token,
        display_name: data.display_name || 'Helper',
        helper_key: data.helper_key || null,
        case_number: data.case_number || cn,
        expires_at: data.expires_at
      };
      try {
        localStorage.setItem(HELPER_SESSION_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }
      logEstateActivity({
        eventType: 'helper_login',
        caseNumber: session.case_number,
        sessionToken: session.token
      });
      return ok({ role: 'helper', ...session });
    }
    if (role === 'advisor') {
      clearSiblingSession();
      clearHelperSession();
      clearAdminUnlock();
      const session = persistAdvisorSession({
        token: data.token,
        display_name: data.display_name || 'Advisor',
        contact_id: data.contact_id || null,
        category: data.category || null,
        case_number: data.case_number || cn,
        expires_at: data.expires_at,
        must_change_password: Boolean(data.must_change_password)
      });
      logEstateActivity({
        eventType: 'advisor_login',
        caseNumber: session.case_number,
        sessionToken: session.token
      });
      return ok({ role: 'advisor', ...session });
    }
  }

  // Personal Representative (admin password) — never escalate from an active
  // heir/helper/advisor session on this device.
  if (hasActiveNonAdminEstateRole()) {
    return fail(NON_ADMIN_ROLE_BLOCK);
  }
  const admin = await loginEstateAdmin(pass, cn);
  if (admin.success) {
    clearSiblingSession();
    clearHelperSession();
    clearAdvisorSession();
    return ok({ role: 'admin', ...admin.data });
  }

  const rpcMsg = data?.error || (error ? error.message : '');
  if (rpcMsg && /does not exist|schema cache|estate_login_by_access_code/i.test(rpcMsg)) {
    return fail(
      'Access-code sign-in needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
    );
  }
  return fail(rpcMsg || admin.error || 'Incorrect access code for this estate.');
}

export async function createReadOnlyShareLink(caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const catalog = await listAllItemsWithRooms(caseNumber);
  if (!catalog.success) return catalog;

  const settings = await getSettings(caseNumber);
  const cn = settings.success
    ? settings.data.case_number
    : estate.caseNumber || resolveCaseArg(caseNumber);
  const token = randomToken();

  const html = buildReadOnlyHtml({
    caseNumber: cn,
    items: catalog.data,
    generatedAt: new Date().toISOString()
  });
  const json = buildCatalogJson({
    caseNumber: cn,
    items: catalog.data,
    generatedAt: new Date().toISOString()
  });

  const htmlPath = `${auth.userId}/exports/${token}.html`;
  const jsonPath = `${auth.userId}/exports/${token}.json`;

  const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const jsonBlob = new Blob([json], { type: 'application/json;charset=utf-8' });

  const { error: htmlErr } = await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(htmlPath, htmlBlob, { upsert: true, contentType: 'text/html;charset=utf-8' });
  if (htmlErr) return fail(htmlErr);

  await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(jsonPath, jsonBlob, { upsert: true, contentType: 'application/json;charset=utf-8' });

  const { data: pub } = supabase.storage.from(EXPORT_BUCKET).getPublicUrl(htmlPath);
  const publicUrl = pub?.publicUrl || null;

  if (!estate.estateId) {
    return fail('Could not resolve estate id for this export link.');
  }

  const linkInsert = {
    owner_id: auth.userId,
    token,
    storage_path: htmlPath,
    public_url: publicUrl,
    estate_id: estate.estateId
  };

  const { data: linkRow, error: linkErr } = await supabase
    .from('estate_export_links')
    .insert(linkInsert)
    .select('id, token, public_url, created_at')
    .single();

  if (linkErr) {
    return ok({ publicUrl, token, warning: linkErr.message });
  }
  return ok({ ...linkRow, publicUrl, jsonUrl: supabase.storage.from(EXPORT_BUCKET).getPublicUrl(jsonPath).data?.publicUrl });
}

export async function listPendingReviewItems(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_items')
    .select(itemSelect)
    .eq('owner_id', estate.userId)
    .eq('review_status', 'pending_pr_review')
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;

  if (error) return fail(error);

  const collectionIds = [...new Set((data || []).map((i) => i.collection_id).filter(Boolean))];
  let rooms = {};
  if (collectionIds.length) {
    const { data: cols } = await supabase
      .from('estate_collections')
      .select('id, name')
      .in('id', collectionIds);
    rooms = Object.fromEntries((cols || []).map((c) => [c.id, c.name]));
  }

  return ok(
    (data || []).map((item) => ({
      ...item,
      room: rooms[item.collection_id] || 'Unassigned'
    }))
  );
}

export async function approvePendingItem(itemId, patch = {}, caseNumber) {
  const legalStatus = patch.legalStatus;
  const isMemo =
    patch.isMemorandumAsset != null
      ? Boolean(patch.isMemorandumAsset)
      : legalStatus === LEGAL_STATUS.claimed_memorandum;
  const canAuction =
    legalStatus !== LEGAL_STATUS.claimed_memorandum &&
    legalStatus !== LEGAL_STATUS.disputed &&
    legalStatus !== LEGAL_STATUS.distributed &&
    legalStatus !== LEGAL_STATUS.unauthorized_removal &&
    legalStatus !== LEGAL_STATUS.archived;

  return updateItem(
    itemId,
    {
      reviewStatus: 'approved',
      isApprovedByPr: true,
      legalStatus,
      valueTier: patch.valueTier,
      isMemorandumAsset: isMemo,
      assignedBeneficiary: isMemo ? patch.assignedBeneficiary || null : null,
      descendantsInterestPct: normalizeDescendantsInterestPct(patch.descendantsInterestPct),
      approvedForSale: canAuction ? Boolean(patch.approvedForSale) : false
    },
    caseNumber
  );
}

export async function rejectPendingItem(itemId, caseNumber) {
  return updateItem(
    itemId,
    {
      reviewStatus: 'rejected',
      isApprovedByPr: false,
      legalStatus: LEGAL_STATUS.archived,
      approvedForSale: false
    },
    caseNumber
  );
}

export async function setAuctionPassword(password, caseNumber) {
  const { data, error } = await supabase.rpc('estate_set_auction_password', {
    p_password: password,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** @deprecated Auction browse is public; kept for older Settings installs */
export async function auctionPasswordConfigured(caseNumber) {
  const { data, error } = await supabase.rpc('estate_auction_password_configured', {
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok({ configured: Boolean(data?.configured) });
}

export function getAuctionBidder(caseNumber) {
  try {
    const raw = localStorage.getItem(AUCTION_BIDDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionToken || !parsed?.email) return null;
    if (parsed.sessionExpiresAt && new Date(parsed.sessionExpiresAt) <= new Date()) {
      localStorage.removeItem(AUCTION_BIDDER_KEY);
      return null;
    }
    if (!parsed.isEligibleToBid) return null;
    if (caseNumber) {
      const want = normalizeEstateCaseNumber(caseNumber);
      const have = normalizeEstateCaseNumber(parsed.caseNumber || parsed.case_number);
      // Missing case stamp = other-case bleed — treat as not registered here
      if (!have || !want || have !== want) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persist Stripe-validated bidder session (not honor-system name-only). */
export function saveAuctionBidderSession(bidder) {
  if (!bidder?.sessionToken || !bidder?.email) {
    return fail('Invalid bidder session.');
  }
  const row = {
    id: bidder.id || null,
    name: String(bidder.name || bidder.display_name || '').trim(),
    email: String(bidder.email || '').trim(),
    phone: String(bidder.phone || '').trim(),
    cardBrand: bidder.cardBrand || bidder.card_brand || null,
    cardLast4: bidder.cardLast4 || bidder.card_last4 || null,
    sessionToken: bidder.sessionToken || bidder.session_token,
    sessionExpiresAt: bidder.sessionExpiresAt || bidder.session_expires_at || null,
    isEligibleToBid: bidder.isEligibleToBid !== false,
    termsAcceptedAt: bidder.termsAcceptedAt || bidder.terms_accepted_at || null,
    caseNumber:
      normalizeEstateCaseNumber(bidder.caseNumber || bidder.case_number) ||
      resolveCaseArg(bidder.caseNumber),
    registeredAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(AUCTION_BIDDER_KEY, JSON.stringify(row));
  } catch (err) {
    return fail(err?.message || 'Could not save registration.');
  }
  return ok(row);
}

/** @deprecated Use confirmAuctionRegistration — honor-system registration removed */
export function saveAuctionBidder() {
  return fail('Card verification is required. Use Register to bid and complete Stripe checkout.');
}

export function clearAuctionBidder() {
  try {
    localStorage.removeItem(AUCTION_BIDDER_KEY);
  } catch {
    // ignore
  }
}

/** @deprecated Browse is open; no unlock gate */
export function isAuctionUnlocked() {
  return true;
}

export function clearAuctionUnlock() {
  // no-op — password gate removed
}

export async function verifyAuctionPassword(caseNumber, password) {
  const { data, error } = await supabase.rpc('estate_verify_auction_password', {
    p_case_number: resolveCaseArg(caseNumber),
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** @deprecated Shared helper password retired — use addHelper / listHelpers. */
export async function setHelperPassword(_password, _caseNumber) {
  return fail(
    'Shared helper passwords are retired. Use Settings → Helpers to add each helper with their own name and PIN.'
  );
}

export async function listHelpers(caseNumber) {
  const { data, error } = await supabase.rpc('estate_list_helpers', {
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) {
    if (/estate_list_helpers|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Helpers need a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(Array.isArray(data?.helpers) ? data.helpers : []);
}

export async function addHelper(displayName, pin, caseNumber) {
  const name = String(displayName || '').trim();
  const code = String(pin || '').trim();
  if (name.length < 2) return fail('Enter the helper\'s name (at least 2 characters).');
  if (!/^[0-9]{6}$/.test(code)) return fail('PIN must be exactly 6 digits.');
  const { data, error } = await supabase.rpc('estate_add_helper', {
    p_display_name: name,
    p_pin: code,
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) {
    if (/estate_add_helper|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Helpers need a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setHelperPin(helperKey, pin, caseNumber) {
  const key = String(helperKey || '').trim();
  const code = String(pin || '').trim();
  if (!key) return fail('Helper key required.');
  if (!/^[0-9]{6}$/.test(code)) return fail('PIN must be exactly 6 digits.');
  const { data, error } = await supabase.rpc('estate_set_helper_pin', {
    p_helper_key: key,
    p_pin: code,
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) {
    if (/estate_set_helper_pin|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Helpers need a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function removeHelper(helperKey, caseNumber) {
  const key = String(helperKey || '').trim();
  if (!key) return fail('Helper key required.');
  const { data, error } = await supabase.rpc('estate_remove_helper', {
    p_helper_key: key,
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) {
    if (/estate_remove_helper|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Helpers need a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/**
 * Access codes for one estate. Requires the current admin password as re-auth —
 * an owner session alone must not expose helper / heir codes.
 */
export async function getAccessPasswords(caseNumber, adminPassword) {
  const { data, error } = await supabase.rpc('estate_get_access_passwords', {
    p_case_number: resolveCaseArg(caseNumber),
    p_admin_password: adminPassword ? String(adminPassword) : null
  });
  if (error) {
    if (/estate_get_access_passwords|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Access codes need a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  if (data?.success === false) {
    return {
      success: false,
      error: data.error || 'Could not load access codes.',
      requiresAdminPassword: Boolean(data.requires_admin_password)
    };
  }
  const heirs = Array.isArray(data?.heirs)
    ? data.heirs.map((h) => ({
        sibling_key: h?.sibling_key ?? '',
        display_name: h?.display_name ?? '',
        preferred_name: h?.preferred_name ?? null,
        invite_password: h?.invite_password ?? null,
        invite_configured: Boolean(h?.invite_configured),
        invite_weak: Boolean(h?.invite_weak),
        has_personal_password: Boolean(h?.has_personal_password)
      }))
    : [];
  const helpers = Array.isArray(data?.helpers)
    ? data.helpers.map((h) => ({
        helper_key: h?.helper_key ?? '',
        display_name: h?.display_name ?? '',
        pin: h?.pin ?? null,
        pin_configured: Boolean(h?.pin_configured),
        pin_weak: Boolean(h?.pin_weak),
        active: h?.active !== false
      }))
    : [];
  return ok({
    admin_configured: Boolean(data?.admin_configured),
    admin_is_starter: Boolean(data?.admin_is_starter),
    helper_password: data?.helper_password ?? null,
    helper_configured: Boolean(data?.helper_configured),
    helper_weak: Boolean(data?.helper_weak),
    helpers,
    heir_invite_password: data?.heir_invite_password ?? null,
    heir_invite_configured: Boolean(data?.heir_invite_configured),
    heirs
  });
}

export function getStoredHelperSession(caseNumber) {
  try {
    const raw = localStorage.getItem(HELPER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(HELPER_SESSION_KEY);
      return null;
    }
    if (caseNumber) {
      const want = normalizeEstateCaseNumber(caseNumber);
      const have = normalizeEstateCaseNumber(parsed.case_number);
      if (!want || !have || want !== have) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearHelperSession() {
  try {
    localStorage.removeItem(HELPER_SESSION_KEY);
  } catch {
    // ignore
  }
}

function persistAdvisorSession(session) {
  try {
    localStorage.setItem(ADVISOR_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  return session;
}

export function getStoredAdvisorSession(caseNumber) {
  try {
    const raw = localStorage.getItem(ADVISOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(ADVISOR_SESSION_KEY);
      return null;
    }
    if (caseNumber) {
      const want = normalizeEstateCaseNumber(caseNumber);
      const have = normalizeEstateCaseNumber(parsed.case_number);
      if (!want || !have || want !== have) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAdvisorSession() {
  try {
    localStorage.removeItem(ADVISOR_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * PR: enable advisor portal for a contact and set/reset PIN (min 6 chars).
 * Pass enabled=false to disable and clear the PIN.
 */
export async function setContactPortalPin({ contactId, pin, enabled = true, caseNumber }) {
  const id = contactId;
  if (!id) return fail('Contact required.');
  const turnOn = enabled !== false;
  const code = String(pin || '').trim();
  if (turnOn && code.length < 6) {
    return fail('PIN must be at least 6 characters.');
  }
  const { data, error } = await supabase.rpc('estate_set_contact_portal_pin', {
    p_contact_id: id,
    p_pin: turnOn ? code : '',
    p_enabled: turnOn,
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) {
    if (/estate_set_contact_portal_pin|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor portal needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/**
 * Advisor sets personal password after invite PIN login (or changes later).
 * First-time: pass empty currentPassword.
 */
export async function advisorSetPassword(currentPassword, newPassword, token) {
  const sessionToken = token || getStoredAdvisorSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const next = String(newPassword || '').trim();
  if (next.length < 6) return fail('New password must be at least 6 characters.');
  const { data, error } = await supabase.rpc('estate_advisor_set_password', {
    p_session_token: sessionToken,
    p_current_password: String(currentPassword || '').trim(),
    p_new_password: next
  });
  if (error) {
    if (/estate_advisor_set_password|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor passwords need a database update. Run supabase-migrations/estate-advisor-personal-password-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  try {
    const raw = localStorage.getItem(ADVISOR_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.must_change_password = false;
      localStorage.setItem(ADVISOR_SESSION_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
  return ok(data);
}

export async function advisorListFamilyUpdates(token) {
  const sessionToken = token || getStoredAdvisorSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_advisor_list_family_updates', {
    p_session_token: sessionToken
  });
  if (error) {
    if (/estate_advisor_list_family_updates|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor portal needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data?.updates || []);
}

export async function advisorGetFamilyUpdate(updateId, token) {
  const sessionToken = token || getStoredAdvisorSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  if (!updateId) return fail('Update required.');
  const { data, error } = await supabase.rpc('estate_advisor_get_family_update', {
    p_session_token: sessionToken,
    p_update_id: updateId
  });
  if (error) {
    if (/estate_advisor_get_family_update|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor portal needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const pack = data?.package && typeof data.package === 'object' ? data.package : {};
  return ok({
    id: data.id,
    update_number: data.update_number,
    updateNumber: data.update_number,
    title: data.title,
    pr_note: data.pr_note,
    prNote: data.pr_note,
    published_at: data.published_at,
    package: pack,
    ...pack
  });
}

export async function advisorGetOverview(token) {
  const sessionToken = token || getStoredAdvisorSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_advisor_overview', {
    p_session_token: sessionToken
  });
  if (error) {
    if (/estate_advisor_overview|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor portal needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function advisorGetFormalAccounting(token) {
  const sessionToken = token || getStoredAdvisorSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_advisor_formal_accounting', {
    p_session_token: sessionToken
  });
  if (error) {
    if (/estate_advisor_formal_accounting|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Advisor portal needs a database update. Run supabase-migrations/estate-contact-advisor-portal-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function helperLogin(caseNumber, password, displayName) {
  const name = (displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter the name the Personal Representative set for you.');
  }
  const pin = String(password || '').trim();
  if (!pin) return fail('Enter your PIN.');
  const { data, error } = await supabase.rpc('estate_helper_login', {
    p_case_number: resolveCaseArg(caseNumber),
    p_password: pin,
    p_display_name: name
  });
  if (error) {
    if (/estate_helper_login|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Helper sign-in needs a database update. Run supabase-migrations/estate-helper-accounts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  clearAdminUnlock();
  clearSiblingSession();
  clearAdvisorSession();
  const session = {
    token: data.token,
    display_name: data.display_name,
    helper_key: data.helper_key || null,
    case_number: data.case_number,
    expires_at: data.expires_at
  };
  try {
    localStorage.setItem(HELPER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  logEstateActivity({
    eventType: 'helper_login',
    caseNumber: session.case_number || caseNumber,
    sessionToken: session.token
  });
  return ok(session);
}

export async function helperListCollections(token) {
  const sessionToken = token || getStoredHelperSession()?.token;
  if (!sessionToken) return fail('Please sign in.');
  const { data, error } = await supabase.rpc('estate_helper_list_collections', {
    p_token: sessionToken
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_helper_list_collections|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Helper rooms need a database update. Run supabase-migrations/estate-helper-scope-by-estate.sql in the Supabase SQL Editor.'
      );
    }
    return failed;
  }
  return ok({
    display_name: data.display_name,
    collections: data.collections || []
  });
}

export async function helperCreateItem(input) {
  const session = getStoredHelperSession();
  if (!session?.token) return fail('Please sign in.');

  const photoFiles = [];
  if (Array.isArray(input?.photoFiles)) photoFiles.push(...input.photoFiles.filter(Boolean));
  else if (input?.photoFile) photoFiles.push(input.photoFile);
  const photoBatch = photoFiles.slice(0, MAX_ITEM_PHOTOS);

  let meta = {
    photo_captured_at: null,
    photo_gps_lat: null,
    photo_gps_lng: null
  };
  if (photoBatch[0]) {
    meta = await extractPhotoMetadata(photoBatch[0]);
    if (meta.photo_gps_lat == null && input?.deviceGps?.lat != null) {
      meta.photo_gps_lat = input.deviceGps.lat;
      meta.photo_gps_lng = input.deviceGps.lng;
    }
  }

  const { data, error } = await supabase.rpc('estate_helper_create_item', {
    p_token: session.token,
    p_name: input.name,
    p_notes: input.notes || null,
    p_collection_id: input.collectionId || null,
    p_new_collection_name: input.newCollectionName || null,
    p_photo_captured_at: meta.photo_captured_at,
    p_photo_gps_lat: meta.photo_gps_lat,
    p_photo_gps_lng: meta.photo_gps_lng
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;

  logEstateActivity({
    eventType: 'helper_item_create',
    caseNumber: session.case_number,
    sessionToken: session.token,
    metadata: { item_id: data?.item?.id }
  });

  const item = data.item;
  const uploadPrefix = data.upload_prefix;

  const applyCondition = async (row) => {
    const cond = normalizeItemCondition(input?.condition) || 'good';
    const notes = String(input?.conditionNotes || '').trim() || null;
    if (!row?.id) return row;
    const { data: condData, error: condErr } = await supabase.rpc(
      'estate_helper_set_item_condition',
      {
        p_token: session.token,
        p_item_id: row.id,
        p_condition: cond,
        p_condition_notes: notes
      }
    );
    if (condErr) {
      if (/estate_helper_set_item_condition|schema cache|does not exist/i.test(condErr.message || '')) {
        return {
          ...row,
          _conditionWarning:
            'Item saved. Run supabase-migrations/estate-item-condition-2026-08.sql to store condition.'
        };
      }
      return row;
    }
    if (condData?.success === false) return row;
    return condData?.item || row;
  };

  if (photoBatch.length && item?.id && uploadPrefix) {
    // upload_prefix is `{ownerId}/{itemId}_0` — strip trailing `_0` for base path
    const basePath = String(uploadPrefix).replace(/_0$/, '');
    const entries = [];
    let uploadWarning = '';

    for (let i = 0; i < photoBatch.length; i += 1) {
      const fileMeta =
        i === 0
          ? meta
          : await extractPhotoMetadata(photoBatch[i]).then((m) => {
              if (m.photo_gps_lat == null && input?.deviceGps?.lat != null) {
                return {
                  ...m,
                  photo_gps_lat: input.deviceGps.lat,
                  photo_gps_lng: input.deviceGps.lng
                };
              }
              return m;
            });
      const compressed = await compressImageFile(photoBatch[i]);
      const path = `${basePath}_${i}.jpg`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, compressed, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });
      if (upErr) {
        uploadWarning = upErr.message || 'Some photos failed to upload.';
        break;
      }
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const photoUrl = pub?.publicUrl;
      if (!photoUrl) {
        uploadWarning = 'Photo upload URL missing.';
        break;
      }
      entries.push(
        buildPhotoEntry(photoUrl, {
          takenBy: session.display_name || 'Helper',
          capturedAt: item.photo_captured_at || new Date().toISOString(),
          receivedAt: item.photo_received_at || new Date().toISOString(),
          gpsLat: fileMeta.photo_gps_lat,
          gpsLng: fileMeta.photo_gps_lng,
          deviceCapturedAtClaim: fileMeta.photo_captured_at || null
        })
      );
    }

    if (entries.length) {
      let saved = item;
      const multi = await supabase.rpc('estate_helper_set_photos', {
        p_token: session.token,
        p_item_id: item.id,
        p_photo_urls: entries
      });
      if (multi.data?.success && multi.data?.item) {
        saved = multi.data.item;
      } else if (
        multi.error &&
        /estate_helper_set_photos|schema cache|does not exist/i.test(multi.error.message || '')
      ) {
        // Fallback until SQL migration is applied — first photo only via legacy RPC
        const attached = await supabase.rpc('estate_helper_set_photo', {
          p_token: session.token,
          p_item_id: item.id,
          p_photo_url: entries[0].url,
          p_device_captured_at: meta.photo_captured_at || null
        });
        if (attached.data?.success && attached.data?.item) {
          saved = attached.data.item;
          if (entries.length > 1) {
            uploadWarning =
              (uploadWarning ? `${uploadWarning} ` : '') +
              'Only the first photo was linked. Run supabase-migrations/estate-helper-set-photos-2026-08.sql for multi-photo.';
          }
        } else {
          saved = { ...item, photo_url: entries[0].url, photo_urls: entries };
        }
      } else if (multi.data?.success === false) {
        uploadWarning = multi.data.error || uploadWarning || 'Could not link photos.';
        saved = { ...item, photo_url: entries[0].url, photo_urls: entries };
      } else {
        saved = { ...item, photo_url: entries[0].url, photo_urls: entries };
        uploadWarning =
          uploadWarning ||
          multi.error?.message ||
          'Item saved; photo link may need refresh.';
      }

      saved = await applyCondition(saved);
      const warning = [saved._conditionWarning, uploadWarning].filter(Boolean).join(' ');
      if (saved._conditionWarning) delete saved._conditionWarning;
      return warning ? { success: true, data: saved, warning } : ok(saved);
    }

    const withCond = await applyCondition(item);
    const warning = withCond._conditionWarning;
    if (warning) delete withCond._conditionWarning;
    return {
      success: true,
      data: withCond,
      warning: warning || uploadWarning || 'Item saved for PR review, but the photo upload failed.'
    };
  }

  const withCond = await applyCondition(item);
  const warning = withCond._conditionWarning;
  if (warning) delete withCond._conditionWarning;
  return warning ? { success: true, data: withCond, warning } : ok(withCond);
}

const SCENE_SELECT =
  'id, owner_id, estate_id, room_label, notes, photo_url, photo_urls, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, created_by_role, created_by_name, archived_at, change_history, created_at, updated_at';

/** Resolve room label from collection id / new name (same rooms as inventory). */
async function resolveSceneRoomLabel(estate, input) {
  let roomLabel = String(input?.roomLabel || '').trim();
  const collectionId = input?.collectionId || null;
  const newRoomName = String(input?.newCollectionName || '').trim();

  if (collectionId) {
    const { data: col, error: colErr } = await supabase
      .from('estate_collections')
      .select('id, name, estate_id')
      .eq('id', collectionId)
      .eq('owner_id', estate.userId)
      .maybeSingle();
    if (colErr) return { ok: false, error: colErr.message || String(colErr) };
    if (!col) return { ok: false, error: 'Room / collection not found.' };
    if (col.estate_id && col.estate_id !== estate.estateId) {
      return { ok: false, error: 'That room belongs to a different estate case.' };
    }
    return { ok: true, roomLabel: String(col.name || '').trim() };
  }

  if (newRoomName) {
    const listed = await listCollections(estate.caseNumber);
    if (listed.success) {
      const match = (listed.data || []).find(
        (c) => String(c.name || '').trim().toLowerCase() === newRoomName.toLowerCase()
      );
      if (match?.name) {
        return { ok: true, roomLabel: String(match.name).trim() };
      }
    }
    const created = await createCollection(newRoomName, estate.caseNumber);
    if (!created.success) return { ok: false, error: created.error || 'Could not create room.' };
    return { ok: true, roomLabel: String(created.data?.name || newRoomName).trim() };
  }

  if (!roomLabel) return { ok: false, error: 'Room or area label is required.' };
  return { ok: true, roomLabel };
}

/** Admin-only: list as-found scene captures (not shown to heirs). */
export async function listSceneCaptures(caseNumber, options = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const includeArchived = Boolean(options.includeArchived);

  let q = supabase
    .from('estate_scene_captures')
    .select(SCENE_SELECT)
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  if (!includeArchived) q = q.is('archived_at', null);

  const { data, error } = await q;

  if (error) {
    // Older DBs without archived_at / change_history — retry core columns
    if (/archived_at|change_history|schema cache|does not exist/i.test(error.message || '')) {
      let legacy = supabase
        .from('estate_scene_captures')
        .select(
          'id, owner_id, estate_id, room_label, notes, photo_url, photo_urls, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, created_by_role, created_by_name, created_at, updated_at'
        )
        .eq('owner_id', estate.userId)
        .order('created_at', { ascending: false });
      if (estate.estateId) legacy = legacy.eq('estate_id', estate.estateId);
      const retry = await legacy;
      if (retry.error) {
        if (/estate_scene_captures|schema cache|does not exist/i.test(retry.error.message || '')) {
          return fail(
            'Scene documentation needs a database update. Run supabase-migrations/estate-scene-captures.sql then estate-scene-change-history.sql.'
          );
        }
        return fail(retry.error);
      }
      return ok(retry.data || []);
    }
    if (/estate_scene_captures|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Scene documentation needs a database update. Run supabase-migrations/estate-scene-captures.sql in the Supabase SQL Editor.'
      );
    }
    return fail(error);
  }
  return ok(data || []);
}

/**
 * Admin: update scene room / notes / archive flag.
 * Photo provenance stays locked by DB trigger; change_history appends via trigger.
 */
export async function updateSceneCapture(sceneId, patch, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!sceneId) return fail('Scene id required.');

  const updates = { updated_at: new Date().toISOString() };

  if (
    patch.collectionId != null ||
    patch.newCollectionName != null ||
    patch.roomLabel != null
  ) {
    const resolved = await resolveSceneRoomLabel(estate, patch);
    if (!resolved.ok) return fail(resolved.error);
    updates.room_label = resolved.roomLabel;
  }

  if (patch.notes !== undefined) {
    updates.notes = patch.notes == null ? null : String(patch.notes).trim() || null;
  }

  if (patch.archived === true) {
    updates.archived_at = new Date().toISOString();
  } else if (patch.archived === false) {
    updates.archived_at = null;
  }

  let q = supabase
    .from('estate_scene_captures')
    .update(updates)
    .eq('id', sceneId)
    .eq('owner_id', estate.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(SCENE_SELECT).single();
  if (error) {
    if (/archived_at|change_history/i.test(error.message || '')) {
      return fail(
        'Scene edit history needs a database update. Run supabase-migrations/estate-scene-change-history.sql in Supabase.'
      );
    }
    return fail(error);
  }
  return ok(data);
}

export async function archiveSceneCapture(sceneId, caseNumber) {
  return updateSceneCapture(sceneId, { archived: true }, caseNumber);
}

export async function restoreSceneCapture(sceneId, caseNumber) {
  return updateSceneCapture(sceneId, { archived: false }, caseNumber);
}

/** Hard delete one scene photo (owner + case). Prefer archive for real records. */
export async function deleteSceneCapturePermanently(sceneId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!sceneId) return fail('Scene id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const cn = resolveCaseArg(caseNumber);
  if (!cn) return fail('Estate case number is required.');

  const { data, error } = await supabase.rpc('estate_admin_delete_scene', {
    p_scene_id: sceneId,
    p_case_number: cn
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_admin_delete_scene|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Scene delete needs a database update. Run supabase-migrations/estate-scene-change-history.sql in Supabase.'
      );
    }
    return failed;
  }

  try {
    await supabase.storage.from(PHOTO_BUCKET).remove([
      `${auth.userId}/scenes/${sceneId}.jpg`,
      `helper/${auth.userId}/scenes/${sceneId}.jpg`
    ]);
  } catch {
    // ignore storage cleanup errors
  }

  return ok(data);
}

/** Admin: capture a walk-in / room / box scene photo. */
export async function createSceneCapture(input) {
  const estate = await resolveOwnedEstate(input?.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const resolved = await resolveSceneRoomLabel(estate, input);
  if (!resolved.ok) return fail(resolved.error);
  const roomLabel = resolved.roomLabel;
  if (!input?.photoFile) return fail('A photo is required for scene documentation.');

  let meta = await extractPhotoMetadata(input.photoFile);
  if (meta.photo_gps_lat == null && input?.deviceGps?.lat != null) {
    meta = {
      ...meta,
      photo_gps_lat: input.deviceGps.lat,
      photo_gps_lng: input.deviceGps.lng
    };
  }

  const insertRow = {
    owner_id: estate.userId,
    room_label: roomLabel,
    notes: String(input?.notes || '').trim() || null,
    photo_captured_at: new Date().toISOString(),
    photo_received_at: new Date().toISOString(),
    photo_gps_lat: meta.photo_gps_lat,
    photo_gps_lng: meta.photo_gps_lng,
    created_by_role: 'admin',
    created_by_name: 'Personal Representative'
  };
  if (estate.estateId) insertRow.estate_id = estate.estateId;

  const { data: row, error } = await supabase
    .from('estate_scene_captures')
    .insert(insertRow)
    .select(SCENE_SELECT)
    .single();

  if (error) {
    if (/estate_scene_captures|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Scene documentation needs a database update. Run supabase-migrations/estate-scene-captures.sql in the Supabase SQL Editor.'
      );
    }
    return fail(error);
  }

  const uploaded = await uploadPhotoAtPath(estate.userId, `scenes/${row.id}.jpg`, input.photoFile);
  if (!uploaded.success) {
    return { success: true, data: row, warning: uploaded.error || 'Scene saved, but photo upload failed.' };
  }

  const entry = buildPhotoEntry(uploaded.data, {
    takenBy: 'Personal Representative',
    capturedAt: row.photo_captured_at || new Date().toISOString(),
    receivedAt: row.photo_received_at || new Date().toISOString(),
    gpsLat: meta.photo_gps_lat,
    gpsLng: meta.photo_gps_lng,
    deviceCapturedAtClaim: meta.photo_captured_at || null
  });
  entry.kind = 'scene';

  const { data: updated, error: updateError } = await (() => {
    let q = supabase
      .from('estate_scene_captures')
      .update({
        photo_url: entry.url,
        photo_urls: [entry],
        photo_gps_lat: meta.photo_gps_lat,
        photo_gps_lng: meta.photo_gps_lng,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .eq('owner_id', estate.userId);
    if (estate.estateId) q = q.eq('estate_id', estate.estateId);
    return q.select(SCENE_SELECT).single();
  })();

  if (updateError) {
    return {
      success: true,
      data: { ...row, photo_url: entry.url, photo_urls: [entry] },
      warning: updateError.message
    };
  }
  return ok(updated);
}

/** Helper: create scene capture (admin-only gallery). */
export async function helperCreateScene(input) {
  const session = getStoredHelperSession();
  if (!session?.token) return fail('Please sign in.');

  const roomLabel = String(input?.roomLabel || '').trim();
  if (!roomLabel) return fail('Room or area label is required.');
  if (!input?.photoFile) return fail('A photo is required for scene documentation.');

  let meta = await extractPhotoMetadata(input.photoFile);
  if (meta.photo_gps_lat == null && input?.deviceGps?.lat != null) {
    meta = {
      ...meta,
      photo_gps_lat: input.deviceGps.lat,
      photo_gps_lng: input.deviceGps.lng
    };
  }

  const { data, error } = await supabase.rpc('estate_helper_create_scene', {
    p_token: session.token,
    p_room_label: roomLabel,
    p_notes: String(input?.notes || '').trim() || null,
    p_photo_gps_lat: meta.photo_gps_lat,
    p_photo_gps_lng: meta.photo_gps_lng
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_helper_create_scene|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Scene documentation needs a database update. Run supabase-migrations/estate-scene-captures.sql in the Supabase SQL Editor.'
      );
    }
    return failed;
  }

  logEstateActivity({
    eventType: 'helper_scene_create',
    caseNumber: session.case_number,
    sessionToken: session.token,
    metadata: { scene_id: data?.scene?.id }
  });

  const scene = data.scene;
  const uploadPrefix = data.upload_prefix;

  if (scene?.id && uploadPrefix) {
    const compressed = await compressImageFile(input.photoFile);
    const path = `${uploadPrefix}.jpg`;
    const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, compressed, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600'
    });
    if (!upErr) {
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const photoUrl = pub?.publicUrl;
      if (photoUrl) {
        const attached = await supabase.rpc('estate_helper_set_scene_photo', {
          p_token: session.token,
          p_scene_id: scene.id,
          p_photo_url: photoUrl,
          p_device_captured_at: meta.photo_captured_at || null
        });
        if (attached.data?.success && attached.data?.scene) {
          return ok(attached.data.scene);
        }
        return {
          success: true,
          data: { ...scene, photo_url: photoUrl },
          warning: 'Scene saved; photo link may need refresh.'
        };
      }
    }
    return { success: true, data: scene, warning: 'Scene saved, but the photo upload failed.' };
  }

  return ok(scene);
}

/** Admin-only: list estate expense rows (RLS restricts to owner). */
export async function listEstateExpenses(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_expenses')
    .select('id, owner_id, estate_id, expense_name, amount, date_paid, receipt_url, created_at, updated_at')
    .eq('owner_id', estate.userId)
    .order('date_paid', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;

  if (error) return fail(error);
  return ok(data || []);
}

const EXPENSE_SELECT =
  'id, owner_id, estate_id, expense_name, amount, date_paid, receipt_url, created_at, updated_at';

async function attachExpenseReceiptPhoto(estate, expenseId, receiptFile) {
  if (!receiptFile) return { success: true, url: null };
  const uploaded = await uploadPhotoAtPath(
    estate.userId,
    `expenses/${expenseId}.jpg`,
    receiptFile
  );
  if (!uploaded.success) {
    return { success: false, error: uploaded.error || 'Receipt photo upload failed.' };
  }

  let q = supabase
    .from('estate_expenses')
    .update({
      receipt_url: uploaded.data,
      updated_at: new Date().toISOString()
    })
    .eq('id', expenseId)
    .eq('owner_id', estate.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(EXPENSE_SELECT).single();
  if (error) return { success: false, error: error.message || 'Could not save receipt photo.' };
  return { success: true, data, url: uploaded.data };
}

export async function addEstateExpense({
  expenseName,
  amount,
  datePaid,
  receiptUrl,
  receiptFile,
  caseNumber,
  accountId
} = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const name = String(expenseName || '').trim();
  const amt = roundMoney(amount);
  if (name.length < 1) return fail('Expense name is required.');
  if (!Number.isFinite(amt) || amt < 0) return fail('Enter a valid expense amount.');

  const insertRow = {
    owner_id: estate.userId,
    expense_name: name,
    amount: amt,
    date_paid: datePaid || new Date().toISOString(),
    receipt_url: String(receiptUrl || '').trim() || null
  };
  if (estate.estateId) insertRow.estate_id = estate.estateId;

  const { data, error } = await supabase
    .from('estate_expenses')
    .insert(insertRow)
    .select(EXPENSE_SELECT)
    .single();

  if (error) return fail(error);

  let expenseRow = data;
  let warning = '';

  if (receiptFile) {
    const attached = await attachExpenseReceiptPhoto(estate, data.id, receiptFile);
    if (!attached.success) {
      warning = attached.error || 'Expense saved, but the receipt photo failed to upload.';
    } else {
      expenseRow = attached.data || data;
    }
  }

  const payFromAccount = String(accountId || '').trim();
  if (payFromAccount && amt > 0) {
    const txn = await addAccountTransaction(estate, {
      accountId: payFromAccount,
      amount: amt,
      category: 'expense',
      memo: name,
      txnDate: datePaid ? String(datePaid).slice(0, 10) : undefined,
      expenseId: expenseRow.id,
      documentUrl: expenseRow.receipt_url || null
    });
    if (!txn.success) {
      warning = [warning, txn.error || 'Expense saved, but Funds balance was not updated.']
        .filter(Boolean)
        .join(' ');
    }
  }

  if (warning) return { success: true, data: expenseRow, warning };
  return ok(expenseRow);
}

/** Record income / deposit into an estate fund account (one action). */
export async function addEstateFundsDeposit({
  accountId,
  amount,
  memo,
  txnDate,
  category = 'deposit',
  itemId,
  documentUrl,
  caseNumber
} = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const cat = category === 'sale_proceeds' ? 'sale_proceeds' : 'deposit';
  const result = await addAccountTransaction(estate, {
    accountId,
    amount,
    category: cat,
    memo: memo || (cat === 'sale_proceeds' ? 'Sale proceeds' : 'Deposit'),
    txnDate,
    itemId,
    documentUrl
  });
  if (!result.success) return result;

  logEstateActivity({
    eventType: 'account_update',
    caseNumber: estate.caseNumber,
    metadata: {
      account_id: accountId,
      field: 'funds_deposit',
      new_value: String(amount)
    }
  });
  return result;
}

/** Explicit adjustment transaction (correction) — never a silent balance overwrite. */
export async function addEstateFundsAdjustment({
  accountId,
  amount,
  memo,
  txnDate,
  caseNumber
} = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!String(memo || '').trim()) {
    return fail('Add a short note explaining this adjustment.');
  }
  return addAccountTransaction(estate, {
    accountId,
    amount,
    category: 'adjustment',
    memo,
    txnDate
  });
}

export async function listEstateFundsTransactions(caseNumber, accountId) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (accountId) return listAccountTransactions(estate, accountId);
  return listAccountTransactionsForEstate(estate);
}

export async function removeEstateFundsTransaction(transactionId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  return deleteAccountTransaction(estate, transactionId);
}

export async function updateEstateExpense(
  expenseId,
  { expenseName, amount, datePaid, receiptUrl, receiptFile, clearReceipt, caseNumber } = {}
) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!expenseId) return fail('Expense id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const name = String(expenseName || '').trim();
  const amt = roundMoney(amount);
  if (!name) return fail('Expense name is required.');
  if (!Number.isFinite(amt) || amt < 0) return fail('Enter a valid expense amount.');

  const patch = {
    expense_name: name,
    amount: amt,
    date_paid: datePaid || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  // Photo upload wins over a typed URL. clearReceipt drops any existing receipt.
  if (clearReceipt && !receiptFile) {
    patch.receipt_url = null;
  } else if (!receiptFile && receiptUrl !== undefined) {
    patch.receipt_url = String(receiptUrl || '').trim() || null;
  }

  let q = supabase
    .from('estate_expenses')
    .update(patch)
    .eq('id', expenseId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(EXPENSE_SELECT).single();
  if (error) return fail(error);

  let expenseRow = data;
  let warning = '';

  const fundsSync = await syncExpenseFundsAmount(estate, expenseId, amt, name);
  if (!fundsSync.success) {
    warning = fundsSync.error || 'Expense saved, but Funds could not be adjusted automatically.';
  } else if (fundsSync.data?.adjusted) {
    logEstateActivity({
      eventType: 'account_update',
      caseNumber: estate.caseNumber,
      metadata: {
        related_id: expenseId,
        field: 'funds_expense_correction',
        note: name,
        amount: String(fundsSync.data.delta)
      }
    });
  }

  if (receiptFile) {
    const attached = await attachExpenseReceiptPhoto(estate, expenseId, receiptFile);
    if (!attached.success) {
      warning = [warning, attached.error || 'Expense saved, but the receipt photo failed to upload.']
        .filter(Boolean)
        .join(' ');
    } else {
      expenseRow = attached.data || data;
    }
  }

  if (warning) return { success: true, data: expenseRow, warning };
  return ok(expenseRow);
}

export async function deleteEstateExpense(expenseId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!expenseId) return fail('Expense id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  // Reverse Funds first so the court ledger keeps originals + compensating adjustments.
  const rev = await reverseLinkedFundsTransactions(estate, {
    expenseId,
    reason: 'Expense deleted from the estate bill list'
  });
  let warning = '';
  if (!rev.success) {
    warning = rev.error || 'Could not reverse linked Funds expense rows automatically.';
  } else if (rev.data?.reversedCount) {
    logEstateActivity({
      eventType: 'account_update',
      caseNumber: estate.caseNumber,
      metadata: {
        related_id: expenseId,
        field: 'funds_expense_reversal',
        note: `Reversed ${rev.data.reversedCount} Funds row(s) for deleted expense`
      }
    });
  }

  let q = supabase
    .from('estate_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { error } = await q;
  if (error) return fail(error);
  if (warning) return { success: true, data: true, warning };
  return ok(true);
}

const ACCOUNT_SELECT =
  'id, owner_id, estate_id, kind, account_type, counts_as_funds, account_name, institution, last4, balance, opening_balance, is_primary, as_of_date, notes, created_at, updated_at';

const ACCOUNT_SELECT_MID =
  'id, owner_id, estate_id, kind, account_name, institution, last4, balance, opening_balance, is_primary, as_of_date, notes, created_at, updated_at';

const ACCOUNT_SELECT_LEGACY =
  'id, owner_id, estate_id, kind, account_name, institution, last4, balance, as_of_date, notes, created_at, updated_at';

/** Bank / investment accounts and debts. Owner-only — never exposed to heirs. */
export async function listEstateAccounts(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_accounts')
    .select(ACCOUNT_SELECT)
    .eq('owner_id', estate.userId)
    .order('kind', { ascending: true })
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  let { data, error } = await q;
  if (error && /account_type|counts_as_funds/i.test(error.message || '')) {
    let mid = supabase
      .from('estate_accounts')
      .select(ACCOUNT_SELECT_MID)
      .eq('owner_id', estate.userId)
      .order('kind', { ascending: true })
      .order('created_at', { ascending: false });
    if (estate.estateId) mid = mid.eq('estate_id', estate.estateId);
    ({ data, error } = await mid);
  }
  if (error && /opening_balance|is_primary/i.test(error.message || '')) {
    let legacy = supabase
      .from('estate_accounts')
      .select(ACCOUNT_SELECT_LEGACY)
      .eq('owner_id', estate.userId)
      .order('kind', { ascending: true })
      .order('created_at', { ascending: false });
    if (estate.estateId) legacy = legacy.eq('estate_id', estate.estateId);
    ({ data, error } = await legacy);
  }
  if (error) return fail(error);

  const enriched = await enrichAccountsWithFunds(estate, data || []);
  return ok(enriched.accounts);
}

function normalizeAccountInput(input = {}, { forUpdate = false, existingKind = null } = {}) {
  const finalKind =
    input.kind != null
      ? input.kind === 'debt'
        ? 'debt'
        : 'asset'
      : existingKind === 'debt'
        ? 'debt'
        : 'asset';
  const name = String(input.accountName || '').trim();
  const balance = Number(input.balance ?? input.openingBalance);
  const last4 = String(input.last4 || '').replace(/\D/g, '').slice(-4);
  const accountType = normalizeAccountType(
    input.accountType || input.account_type,
    finalKind
  );

  if (name.length < 1) {
    return { ok: false, error: 'Give the account or debt a name.' };
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return {
      ok: false,
      error:
        finalKind === 'debt'
          ? 'Enter the amount owed as a positive amount.'
          : 'Enter the opening balance / value as a positive amount (or zero).'
    };
  }

  const row = {
    kind: finalKind,
    account_type: accountType,
    account_name: name,
    institution: String(input.institution || '').trim() || null,
    last4: last4 || null,
    as_of_date: input.asOfDate || null,
    notes: String(input.notes || '').trim() || null
  };

  if (finalKind === 'debt') {
    row.balance = balance;
    row.opening_balance = balance;
    row.counts_as_funds = false;
    row.is_primary = false;
  } else {
    const explicitCounts =
      input.countsAsFunds != null
        ? Boolean(input.countsAsFunds)
        : input.counts_as_funds != null
          ? Boolean(input.counts_as_funds)
          : null;
    row.counts_as_funds =
      explicitCounts != null
        ? explicitCounts
        : countsAsFundsDefaultForType(accountType, 'asset');
    if (!forUpdate) {
      row.opening_balance = balance;
      row.balance = balance;
      if (input.isPrimary != null) {
        row.is_primary = Boolean(input.isPrimary) && row.counts_as_funds;
      }
    } else {
      if (input.isPrimary != null) {
        row.is_primary = Boolean(input.isPrimary) && row.counts_as_funds;
      }
      if (input.allowOpeningBalanceEdit) {
        row.opening_balance = balance;
      }
      // Always allow updating counts_as_funds / account_type on edit
    }
  }

  return { ok: true, row, kind: finalKind };
}

export async function addEstateAccount(input = {}, caseNumber) {
  const estate = await resolveOwnedEstate(input.caseNumber ?? caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const normalized = normalizeAccountInput(input, { forUpdate: false });
  if (!normalized.ok) return fail(normalized.error);

  const insertRow = { ...normalized.row, owner_id: estate.userId };
  if (estate.estateId) insertRow.estate_id = estate.estateId;

  let { data, error } = await supabase
    .from('estate_accounts')
    .insert(insertRow)
    .select(ACCOUNT_SELECT)
    .single();

  if (error && /opening_balance|is_primary|account_type|counts_as_funds/i.test(error.message || '')) {
    const legacyRow = { ...insertRow };
    delete legacyRow.opening_balance;
    delete legacyRow.is_primary;
    if (/account_type|counts_as_funds/i.test(error.message || '')) {
      delete legacyRow.account_type;
      delete legacyRow.counts_as_funds;
    }
    ({ data, error } = await supabase
      .from('estate_accounts')
      .insert(legacyRow)
      .select(ACCOUNT_SELECT_LEGACY)
      .single());
  }

  if (error) return fail(error);

  logEstateActivity({
    eventType: 'account_add',
    caseNumber: estate.caseNumber,
    metadata: { account_id: data?.id, kind: insertRow.kind }
  });

  const enriched = await enrichAccountsWithFunds(estate, [data]);
  return ok(enriched.accounts[0] || data);
}

export async function updateEstateAccount(accountId, input = {}, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!accountId) return fail('Account id required.');

  const estate = await resolveOwnedEstate(input.caseNumber ?? caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const { data: existing, error: existingErr } = await supabase
    .from('estate_accounts')
    .select(ACCOUNT_SELECT)
    .eq('id', accountId)
    .eq('owner_id', auth.userId)
    .maybeSingle();
  let existingRow = existing;
  if (existingErr && /account_type|counts_as_funds/i.test(existingErr.message || '')) {
    const mid = await supabase
      .from('estate_accounts')
      .select(ACCOUNT_SELECT_MID)
      .eq('id', accountId)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (mid.error && !/opening_balance|is_primary/i.test(mid.error.message || '')) {
      return fail(mid.error);
    }
    existingRow = mid.data;
  } else if (existingErr && !/opening_balance|is_primary/i.test(existingErr.message || '')) {
    return fail(existingErr);
  }

  const existingKind = existingRow?.kind || null;
  const normalized = normalizeAccountInput(
    {
      ...input,
      balance:
        input.balance != null
          ? input.balance
          : existingKind === 'debt'
            ? existingRow?.balance
            : existingRow?.opening_balance ?? existingRow?.balance
    },
    { forUpdate: true, existingKind }
  );
  if (!normalized.ok) return fail(normalized.error);

  // Fund accounts: metadata only (and optional opening edit when explicitly allowed).
  if (normalized.kind !== 'debt') {
    delete normalized.row.balance;
    if (!input.allowOpeningBalanceEdit) delete normalized.row.opening_balance;
  }

  let q = supabase
    .from('estate_accounts')
    .update({ ...normalized.row, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  let { data, error } = await q.select(ACCOUNT_SELECT).single();
  if (error && /account_type|counts_as_funds/i.test(error.message || '')) {
    const midPatch = { ...normalized.row };
    delete midPatch.account_type;
    delete midPatch.counts_as_funds;
    let qMid = supabase
      .from('estate_accounts')
      .update({ ...midPatch, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('owner_id', auth.userId);
    if (estate.estateId) qMid = qMid.eq('estate_id', estate.estateId);
    ({ data, error } = await qMid.select(ACCOUNT_SELECT_MID).single());
  }
  if (error && /opening_balance|is_primary/i.test(error.message || '')) {
    const legacyPatch = { ...normalized.row };
    delete legacyPatch.opening_balance;
    delete legacyPatch.is_primary;
    delete legacyPatch.account_type;
    delete legacyPatch.counts_as_funds;
    let q2 = supabase
      .from('estate_accounts')
      .update({ ...legacyPatch, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('owner_id', auth.userId);
    if (estate.estateId) q2 = q2.eq('estate_id', estate.estateId);
    ({ data, error } = await q2.select(ACCOUNT_SELECT_LEGACY).single());
  }

  if (error) return fail(error);

  if (normalized.kind !== 'debt' && input.allowOpeningBalanceEdit) {
    await syncAccountComputedBalance(estate, accountId);
  }

  logEstateActivity({
    eventType: 'account_update',
    caseNumber: estate.caseNumber,
    metadata: { account_id: accountId, kind: normalized.kind }
  });

  const enriched = await enrichAccountsWithFunds(estate, [data]);
  return ok(enriched.accounts[0] || data);
}

export async function deleteEstateAccount(accountId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!accountId) return fail('Account id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  // Capture private paths before the FK cascade removes document metadata.
  const documents = await supabase
    .from('estate_account_documents')
    .select('storage_path')
    .eq('account_id', accountId)
    .eq('owner_id', auth.userId);

  let q = supabase
    .from('estate_accounts')
    .delete()
    .eq('id', accountId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { error } = await q;
  if (error) return fail(error);

  const paths = (documents.data || []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from(FINANCE_DOCUMENT_BUCKET).remove(paths);
  }

  logEstateActivity({
    eventType: 'account_delete',
    caseNumber: estate.caseNumber,
    metadata: { account_id: accountId }
  });

  return ok(true);
}

const ACCOUNT_DOCUMENT_SELECT =
  'id, owner_id, estate_id, account_id, file_name, storage_path, mime_type, size_bytes, sha256_hash, statement_date, notes, created_at, updated_at';

async function sha256File(file) {
  if (!file?.arrayBuffer || !globalThis.crypto?.subtle) return null;
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

function safeDocumentName(name) {
  return String(name || 'statement')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'statement';
}

export async function listEstateAccountDocuments(accountId, caseNumber) {
  if (!accountId) return fail('Account id required.');
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const { data, error } = await supabase
    .from('estate_account_documents')
    .select(ACCOUNT_DOCUMENT_SELECT)
    .eq('owner_id', estate.userId)
    .eq('estate_id', estate.estateId)
    .eq('account_id', accountId)
    .order('statement_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return fail(error);

  const rows = await Promise.all(
    (data || []).map(async (row) => {
      const signed = await supabase.storage
        .from(FINANCE_DOCUMENT_BUCKET)
        .createSignedUrl(row.storage_path, 60 * 60);
      return {
        ...row,
        signed_url: signed.data?.signedUrl || null,
        signed_url_error: signed.error?.message || null
      };
    })
  );
  return ok(rows);
}

export async function addEstateAccountDocument(
  accountId,
  { file, statementDate, notes, caseNumber } = {}
) {
  if (!accountId) return fail('Account id required.');
  if (!file) return fail('Choose a statement image or PDF.');
  const allowed =
    file.type === 'application/pdf' || String(file.type || '').startsWith('image/');
  if (!allowed) return fail('Statements must be a PDF or image.');
  if (Number(file.size) > 20 * 1024 * 1024) {
    return fail('Statement files must be 20 MB or smaller.');
  }

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const { data: account, error: accountError } = await supabase
    .from('estate_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('owner_id', estate.userId)
    .eq('estate_id', estate.estateId)
    .maybeSingle();
  if (accountError) return fail(accountError);
  if (!account) return fail('Account or debt not found in this estate.');

  const documentId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const fileName = safeDocumentName(file.name);
  const storagePath = `${estate.userId}/${estate.estateId}/${accountId}/${documentId}-${fileName}`;
  const hash = await sha256File(file);
  const uploaded = await supabase.storage
    .from(FINANCE_DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600'
    });
  if (uploaded.error) return fail(uploaded.error);

  const { data, error } = await supabase
    .from('estate_account_documents')
    .insert({
      owner_id: estate.userId,
      estate_id: estate.estateId,
      account_id: accountId,
      file_name: String(file.name || fileName).slice(0, 240),
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: Number(file.size) || null,
      sha256_hash: hash,
      statement_date: statementDate || null,
      notes: String(notes || '').trim() || null
    })
    .select(ACCOUNT_DOCUMENT_SELECT)
    .single();
  if (error) {
    await supabase.storage.from(FINANCE_DOCUMENT_BUCKET).remove([storagePath]);
    return fail(error);
  }
  return ok(data);
}

export async function deleteEstateAccountDocument(documentId, caseNumber) {
  if (!documentId) return fail('Document id required.');
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const { data: row, error: readError } = await supabase
    .from('estate_account_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .eq('owner_id', estate.userId)
    .eq('estate_id', estate.estateId)
    .maybeSingle();
  if (readError) return fail(readError);
  if (!row) return fail('Statement not found.');

  const { error } = await supabase
    .from('estate_account_documents')
    .delete()
    .eq('id', documentId)
    .eq('owner_id', estate.userId)
    .eq('estate_id', estate.estateId);
  if (error) return fail(error);

  const removed = await supabase.storage
    .from(FINANCE_DOCUMENT_BUCKET)
    .remove([row.storage_path]);
  return removed.error
    ? { success: true, data: true, warning: 'Statement record removed; storage cleanup will need retry.' }
    : ok(true);
}

const PR_LOAN_SELECT =
  'id, owner_id, estate_id, amount, purpose, loan_date, notes, created_at, updated_at';

export async function listEstatePrLoans(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_pr_loans')
    .select(PR_LOAN_SELECT)
    .eq('owner_id', estate.userId)
    .order('loan_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;
  if (error) return fail(error);
  return ok(data || []);
}

export async function addEstatePrLoan(
  { amount, purpose, loanDate, notes, caseNumber } = {}
) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const amt = roundMoney(amount);
  const why = String(purpose || '').trim();
  if (!Number.isFinite(amt) || amt <= 0) {
    return fail('Enter the amount you loaned the estate.');
  }
  if (!why) return fail('Describe what the loan was for.');

  const row = {
    owner_id: estate.userId,
    estate_id: estate.estateId,
    amount: amt,
    purpose: why,
    loan_date: loanDate || new Date().toISOString().slice(0, 10),
    notes: String(notes || '').trim() || null
  };

  const { data, error } = await supabase
    .from('estate_pr_loans')
    .insert(row)
    .select(PR_LOAN_SELECT)
    .single();
  if (error) return fail(error);
  return ok(data);
}

export async function updateEstatePrLoan(
  loanId,
  { amount, purpose, loanDate, notes, caseNumber } = {}
) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!loanId) return fail('Loan id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const amt = roundMoney(amount);
  const why = String(purpose || '').trim();
  if (!Number.isFinite(amt) || amt <= 0) {
    return fail('Enter the amount you loaned the estate.');
  }
  if (!why) return fail('Describe what the loan was for.');

  let q = supabase
    .from('estate_pr_loans')
    .update({
      amount: amt,
      purpose: why,
      loan_date: loanDate || new Date().toISOString().slice(0, 10),
      notes: String(notes || '').trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(PR_LOAN_SELECT).single();
  if (error) return fail(error);
  return ok(data);
}

export async function deleteEstatePrLoan(loanId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!loanId) return fail('Loan id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_pr_loans')
    .delete()
    .eq('id', loanId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { error } = await q;
  if (error) return fail(error);
  return ok(true);
}

const CREDITOR_CLAIM_SELECT =
  'id, owner_id, estate_id, creditor_name, amount, status, noticed_date, filed_date, notes, created_at, updated_at';

function normalizeCreditorClaimInput({
  creditorName,
  amount,
  status,
  noticedDate,
  filedDate,
  notes
} = {}) {
  const name = String(creditorName || '').trim();
  if (!name) return { ok: false, error: 'Enter the creditor or claimant name.' };

  let amt = null;
  if (amount !== '' && amount != null) {
    amt = roundMoney(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return { ok: false, error: 'Enter a valid claim amount (or leave blank).' };
    }
  }

  const statusKey = String(status || 'open')
    .trim()
    .toLowerCase();
  const allowed = new Set(['open', 'allowed', 'denied', 'paid', 'withdrawn']);
  if (!allowed.has(statusKey)) {
    return { ok: false, error: 'Choose a valid claim status.' };
  }

  return {
    ok: true,
    row: {
      creditor_name: name,
      amount: amt,
      status: statusKey,
      noticed_date: noticedDate || null,
      filed_date: filedDate || null,
      notes: String(notes || '').trim() || null
    }
  };
}

/** Creditor claims register — owner-only supporting record. */
export async function listEstateCreditorClaims(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_creditor_claims')
    .select(CREDITOR_CLAIM_SELECT)
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;
  if (error) {
    if (/estate_creditor_claims|schema cache|does not exist/i.test(error.message || '')) {
      return ok([]);
    }
    return fail(error);
  }
  return ok(data || []);
}

export async function addEstateCreditorClaim(input = {}) {
  const estate = await resolveOwnedEstate(input.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!estate.estateId) return fail('Estate id is required to record a claim.');

  const normalized = normalizeCreditorClaimInput(input);
  if (!normalized.ok) return fail(normalized.error);

  const row = {
    ...normalized.row,
    owner_id: estate.userId,
    estate_id: estate.estateId
  };

  const { data, error } = await supabase
    .from('estate_creditor_claims')
    .insert(row)
    .select(CREDITOR_CLAIM_SELECT)
    .single();
  if (error) {
    const msg = String(error.message || error.details || error.hint || '');
    if (/schema cache|could not find the table|relation .* does not exist|does not exist/i.test(msg)) {
      return fail(
        'Creditor claims need a database update. Run supabase-migrations/estate-creditor-claims-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }

  logEstateActivity({
    eventType: 'creditor_claim_add',
    caseNumber: estate.caseNumber,
    metadata: { claim_id: data?.id, status: row.status }
  });
  return ok(data);
}

export async function updateEstateCreditorClaim(claimId, input = {}) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!claimId) return fail('Claim id required.');

  const estate = await resolveOwnedEstate(input.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const normalized = normalizeCreditorClaimInput(input);
  if (!normalized.ok) return fail(normalized.error);

  let q = supabase
    .from('estate_creditor_claims')
    .update({ ...normalized.row, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(CREDITOR_CLAIM_SELECT).single();
  if (error) return fail(error);

  logEstateActivity({
    eventType: 'creditor_claim_update',
    caseNumber: estate.caseNumber,
    metadata: { claim_id: claimId, status: normalized.row.status }
  });
  return ok(data);
}

export async function deleteEstateCreditorClaim(claimId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!claimId) return fail('Claim id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_creditor_claims')
    .delete()
    .eq('id', claimId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { error } = await q;
  if (error) return fail(error);

  logEstateActivity({
    eventType: 'creditor_claim_delete',
    caseNumber: estate.caseNumber,
    metadata: { claim_id: claimId }
  });
  return ok(true);
}

const ESTATE_CONTACT_SELECT =
  'id, owner_id, estate_id, category, custom_category, display_name, company, role_title, phone, email, website, address_line1, address_line2, city, region, postal_code, notes, linked_sibling_key, portal_enabled, pin_plain, password_configured, sort_order, created_at, updated_at';

const ESTATE_CONTACT_SELECT_LEGACY =
  'id, owner_id, estate_id, category, custom_category, display_name, company, role_title, phone, email, website, address_line1, address_line2, city, region, postal_code, notes, linked_sibling_key, portal_enabled, pin_plain, sort_order, created_at, updated_at';

const ESTATE_CONTACT_SELECT_BASE =
  'id, owner_id, estate_id, category, custom_category, display_name, company, role_title, phone, email, website, address_line1, address_line2, city, region, postal_code, notes, linked_sibling_key, sort_order, created_at, updated_at';

function normalizeEstateContactInput(input = {}) {
  const displayName = String(input.displayName || input.display_name || '').trim();
  if (displayName.length < 1) return { ok: false, error: 'Contact name is required.' };

  let category = String(input.category || 'other').trim() || 'other';
  const customCategory = String(input.customCategory || input.custom_category || '').trim();
  if (!isKnownContactCategory(category)) category = 'other';
  if (category === 'other' && !customCategory) {
    return { ok: false, error: 'Enter a custom category label, or pick a standard category.' };
  }

  const email = String(input.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email, or leave it blank.' };
  }

  const sortOrder = Number(input.sortOrder ?? input.sort_order);
  const linkedSiblingKey = String(input.linkedSiblingKey || input.linked_sibling_key || '').trim();

  return {
    ok: true,
    row: {
      category,
      custom_category: category === 'other' ? customCategory : null,
      display_name: displayName,
      company: String(input.company || '').trim() || null,
      role_title: String(input.roleTitle || input.role_title || '').trim() || null,
      phone: String(input.phone || '').trim() || null,
      email: email || null,
      website: String(input.website || '').trim() || null,
      address_line1: String(input.addressLine1 || input.address_line1 || '').trim() || null,
      address_line2: String(input.addressLine2 || input.address_line2 || '').trim() || null,
      city: String(input.city || '').trim() || null,
      region: String(input.region || '').trim() || null,
      postal_code: String(input.postalCode || input.postal_code || '').trim() || null,
      notes: String(input.notes || '').trim() || null,
      linked_sibling_key: linkedSiblingKey || null,
      sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0
    }
  };
}

export async function listEstateContacts(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_contacts')
    .select(ESTATE_CONTACT_SELECT)
    .eq('owner_id', estate.userId)
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  let { data, error } = await q;
  if (error && /password_configured|schema cache|column/i.test(error.message || '')) {
    let q2 = supabase
      .from('estate_contacts')
      .select(ESTATE_CONTACT_SELECT_LEGACY)
      .eq('owner_id', estate.userId)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });
    if (estate.estateId) q2 = q2.eq('estate_id', estate.estateId);
    ({ data, error } = await q2);
  }
  if (error && /portal_enabled|pin_plain|schema cache|column/i.test(error.message || '')) {
    let q3 = supabase
      .from('estate_contacts')
      .select(ESTATE_CONTACT_SELECT_BASE)
      .eq('owner_id', estate.userId)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });
    if (estate.estateId) q3 = q3.eq('estate_id', estate.estateId);
    ({ data, error } = await q3);
  }
  if (error) {
    if (/estate_contacts|schema cache|does not exist/i.test(error.message || '')) {
      return ok([]);
    }
    return fail(error);
  }
  return ok(
    (data || []).map((row) => ({
      ...row,
      portal_enabled: Boolean(row.portal_enabled),
      pin_configured: Boolean(row.portal_enabled && (row.pin_plain || row.pin_hash)),
      password_configured: Boolean(row.password_configured)
    }))
  );
}

export async function addEstateContact(input = {}) {
  const estate = await resolveOwnedEstate(input.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!estate.estateId) return fail('Estate id is required to save a contact.');

  const normalized = normalizeEstateContactInput(input);
  if (!normalized.ok) return fail(normalized.error);

  const row = {
    ...normalized.row,
    owner_id: estate.userId,
    estate_id: estate.estateId
  };

  const { data, error } = await supabase
    .from('estate_contacts')
    .insert(row)
    .select(ESTATE_CONTACT_SELECT)
    .single();
  if (error) {
    const msg = String(error.message || error.details || error.hint || '');
    if (/schema cache|could not find the table|relation .* does not exist|does not exist/i.test(msg)) {
      return fail(
        'Contacts need a database update. Run supabase-migrations/estate-contacts-2026-08.sql in Supabase.'
      );
    }
    return fail(error);
  }

  logEstateActivity({
    eventType: 'contact_add',
    caseNumber: estate.caseNumber,
    metadata: { contact_id: data?.id, category: row.category }
  });
  return ok(data);
}

export async function updateEstateContact(contactId, input = {}) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!contactId) return fail('Contact id required.');

  const estate = await resolveOwnedEstate(input.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const normalized = normalizeEstateContactInput(input);
  if (!normalized.ok) return fail(normalized.error);

  let q = supabase
    .from('estate_contacts')
    .update({ ...normalized.row, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.select(ESTATE_CONTACT_SELECT).single();
  if (error) return fail(error);

  logEstateActivity({
    eventType: 'contact_update',
    caseNumber: estate.caseNumber,
    metadata: { contact_id: contactId, category: normalized.row.category }
  });
  return ok(data);
}

export async function deleteEstateContact(contactId, caseNumber) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!contactId) return fail('Contact id required.');

  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_contacts')
    .delete()
    .eq('id', contactId)
    .eq('owner_id', auth.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { error } = await q;
  if (error) return fail(error);

  logEstateActivity({
    eventType: 'contact_delete',
    caseNumber: estate.caseNumber,
    metadata: { contact_id: contactId }
  });
  return ok(true);
}

/**
 * Distribution batches and readiness helpers.
 */
const DISTRIBUTION_SELECT =
  'id, owner_id, estate_id, distribution_date, allocation_method, classification, status, cash_total, property_value_total, notes, claims_override_reason, readiness_snapshot, finalized_at, voided_at, void_reason, created_at, updated_at, recipients:estate_distribution_recipients(id, sibling_key, recipient_name, access_tier, share_percent, cash_amount, acknowledgement_status, acknowledged_at, acknowledgement_note, noticed_at, reminded_at, items:estate_distribution_items(id, item_id, item_name, estimated_value_snapshot, transferred_at, transfer_notes))';

const DISTRIBUTION_SELECT_LEGACY_ACK =
  'id, owner_id, estate_id, distribution_date, allocation_method, classification, status, cash_total, property_value_total, notes, claims_override_reason, readiness_snapshot, finalized_at, voided_at, void_reason, created_at, updated_at, recipients:estate_distribution_recipients(id, sibling_key, recipient_name, access_tier, share_percent, cash_amount, acknowledgement_status, acknowledged_at, acknowledgement_note, items:estate_distribution_items(id, item_id, item_name, estimated_value_snapshot, transferred_at, transfer_notes))';

const DISTRIBUTION_SELECT_NO_CLASS =
  'id, owner_id, estate_id, distribution_date, allocation_method, status, cash_total, property_value_total, notes, claims_override_reason, readiness_snapshot, finalized_at, voided_at, void_reason, created_at, updated_at, recipients:estate_distribution_recipients(id, sibling_key, recipient_name, access_tier, share_percent, cash_amount, acknowledgement_status, acknowledged_at, acknowledgement_note, items:estate_distribution_items(id, item_id, item_name, estimated_value_snapshot, transferred_at, transfer_notes))';

export async function listEstateDistributions(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber || getActiveEstateCase());
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let { data, error } = await supabase
    .from('estate_distributions')
    .select(DISTRIBUTION_SELECT)
    .eq('estate_id', estate.estateId)
    .eq('owner_id', estate.userId)
    .order('distribution_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error && isMissingColumnError(error, 'classification')) {
    ({ data, error } = await supabase
      .from('estate_distributions')
      .select(DISTRIBUTION_SELECT_NO_CLASS)
      .eq('estate_id', estate.estateId)
      .eq('owner_id', estate.userId)
      .order('distribution_date', { ascending: false })
      .order('created_at', { ascending: false }));
    if (data) {
      data = data.map((row) => ({ ...row, classification: 'partial' }));
    }
  }
  if (
    error &&
    (isMissingColumnError(error, 'noticed_at') || isMissingColumnError(error, 'reminded_at'))
  ) {
    ({ data, error } = await supabase
      .from('estate_distributions')
      .select(DISTRIBUTION_SELECT_LEGACY_ACK)
      .eq('estate_id', estate.estateId)
      .eq('owner_id', estate.userId)
      .order('distribution_date', { ascending: false })
      .order('created_at', { ascending: false }));
  }

  if (error) {
    if (/estate_distributions|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Distributions need the distribution SQL migration. Run supabase-migrations/estate-distributions-2026-07.sql, then try again.'
      );
    }
    return fail(error);
  }
  return ok(data || []);
}

export async function getDistributionReadiness(caseNumber, options = {}) {
  const activeCase = caseNumber || getActiveEstateCase();
  const cachedFinance =
    options.finance && typeof options.finance === 'object' ? options.finance : null;
  const [
    settingsResult,
    financeResult,
    heirsResult,
    itemsResult,
    pendingResult,
    distributionsResult
  ] = await Promise.all([
    getSettings(activeCase),
    cachedFinance
      ? Promise.resolve(ok(cachedFinance))
      : getFinanceSummary(activeCase),
    listSiblingAccounts(activeCase),
    listAllItemsWithRooms(activeCase),
    listPendingReviewItems(activeCase),
    listEstateDistributions(activeCase)
  ]);
  if (!settingsResult.success) return settingsResult;
  if (!financeResult.success) return financeResult;
  if (!heirsResult.success) return heirsResult;
  if (!itemsResult.success) return itemsResult;
  if (!pendingResult.success) return pendingResult;

  const settings = settingsResult.data || {};
  const finance = financeResult.data || {};
  const probate = resolveProbateWindow(settings);
  const claimsEnded = Boolean(probate.end && new Date() > probate.end);
  const heirs = heirsResult.data || [];
  const residualRecipients = heirs.filter(
    (person) => person.access_tier !== 'memorandum'
  );
  const availableItems = (itemsResult.data || []).filter(
    (item) =>
      item.legal_status !== 'archived' &&
      item.legal_status !== 'distributed' &&
      !item.approved_for_sale &&
      !(Number(item.highest_bid) > 0) &&
      !item.auction_paid_at
  );
  const liquidAvailable = Math.max(
    0,
    roundMoney(
      Number(finance.fundsAvailable || 0) -
        Number(finance.accountDebtsTotal || 0) -
        Number(finance.prLoansTotal || 0)
    )
  );
  const existingDistributions = Array.isArray(distributionsResult.data)
    ? distributionsResult.data
    : [];

  return ok({
    settings,
    finance,
    heirs,
    residualRecipients,
    availableItems,
    pendingReviewCount: (pendingResult.data || []).length,
    claimsEnded,
    claimsEnd: probate.end ? probate.end.toISOString() : null,
    inventoryComplete: Boolean(settings.inventory_completed_at),
    liquidAvailable,
    outstandingBids: Number(finance.outstandingBids || 0),
    existingDistributions: distributionsResult.success ? existingDistributions : [],
    migrationReady: distributionsResult.success
  });
}

export async function finalizeEstateDistribution({
  caseNumber,
  distributionDate,
  allocationMethod = 'equal',
  classification = 'partial',
  notes = '',
  claimsOverrideReason = '',
  recipients = [],
  accountId
} = {}) {
  const normalizedRecipients = (recipients || [])
    .map((recipient) => ({
      sibling_key: String(recipient?.siblingKey || recipient?.sibling_key || '').trim(),
      share_percent: Number(recipient?.sharePercent ?? recipient?.share_percent) || 0,
      cash_amount: Number(recipient?.cashAmount ?? recipient?.cash_amount) || 0,
      item_ids: Array.isArray(recipient?.itemIds || recipient?.item_ids)
        ? (recipient.itemIds || recipient.item_ids).filter(Boolean)
        : [],
      transfer_notes: String(
        recipient?.transferNotes || recipient?.transfer_notes || ''
      ).trim()
    }))
    .filter((recipient) => recipient.sibling_key)
    .filter(
      (recipient) =>
        (Number(recipient.cash_amount) || 0) > 0 || (recipient.item_ids || []).length > 0
    );
  if (!normalizedRecipients.length) {
    return fail('Add cash or assign at least one property item to at least one recipient.');
  }

  const overrideReason = String(claimsOverrideReason || '').trim();
  const settingsResult = await getSettings(caseNumber);
  if (settingsResult.success) {
    const probate = resolveProbateWindow(settingsResult.data || {});
    const claimsEnded = Boolean(probate.end && new Date() > probate.end);
    if (!claimsEnded && overrideReason.length < 10) {
      return fail(
        'Enter a written reason (at least 10 characters) before distributing while the claims period is still open.'
      );
    }
  }

  const { data, error } = await supabase.rpc('estate_finalize_distribution', {
    p_case_number: resolveCaseArg(caseNumber),
    p_distribution_date:
      distributionDate || new Date().toISOString().slice(0, 10),
    p_allocation_method:
      allocationMethod === 'custom' ? 'custom' : 'equal',
    p_notes: String(notes || '').trim() || null,
    p_claims_override_reason: overrideReason || null,
    p_recipients: normalizedRecipients,
    p_classification: normalizeDistributionClassification(classification)
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_finalize_distribution|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Distributions need the distribution SQL migration. Run supabase-migrations/estate-distributions-2026-07.sql (and estate-family-transparency-2026-07.sql for classification), then try again.'
      );
    }
    return failed;
  }
  logEstateActivity({
    eventType: 'distribution_finalize',
    caseNumber: resolveCaseArg(caseNumber),
    metadata: {
      distribution_id: data?.distribution_id || '',
      field: 'distribution_date',
      new_value: distributionDate || new Date().toISOString().slice(0, 10),
      claims_override_reason: overrideReason || null
    }
  });
  if (overrideReason) {
    await addDecisionNote({
      caseNumber,
      topic: 'distribution_override',
      note: overrideReason,
      distributionId: data?.distribution_id || ''
    });
  }

  // One-action: cash leaving the estate reduces Funds on the chosen account.
  const payFromAccount = String(accountId || '').trim();
  const cashTotal = normalizedRecipients.reduce(
    (sum, r) => sum + (Number(r.cash_amount) || 0),
    0
  );
  let warning = '';
  if (payFromAccount && cashTotal > 0) {
    const estate = await resolveOwnedEstate(caseNumber);
    if (estate.ok && estate.userId) {
      for (const recipient of normalizedRecipients) {
        const cash = Number(recipient.cash_amount) || 0;
        if (cash <= 0) continue;
        const txn = await addAccountTransaction(estate, {
          accountId: payFromAccount,
          amount: cash,
          category: 'distribution',
          memo: `Distribution — ${recipient.sibling_key}`,
          txnDate: distributionDate || new Date().toISOString().slice(0, 10),
          distributionId: data?.distribution_id || null,
          siblingKey: recipient.sibling_key
        });
        if (!txn.success) {
          warning = txn.error || 'Distribution saved, but Funds withdrawal failed.';
          break;
        }
      }
    } else {
      warning = estate.error || 'Distribution saved, but Funds withdrawal could not start.';
    }
  }

  if (warning) return { success: true, data, warning };
  return ok(data);
}

export async function voidEstateDistribution(distributionId, reason, caseNumber) {
  const why = String(reason || '').trim();
  const { data, error } = await supabase.rpc('estate_void_distribution', {
    p_case_number: resolveCaseArg(caseNumber),
    p_distribution_id: distributionId,
    p_reason: why
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;

  logEstateActivity({
    eventType: 'distribution_void',
    caseNumber: resolveCaseArg(caseNumber),
    metadata: {
      distribution_id: String(distributionId || '').trim(),
      field: 'status',
      old_value: 'finalized',
      new_value: 'void',
      note: why
    }
  });

  // Keep original distribution withdrawals on the ledger; post compensating adjustments.
  let warning = '';
  const estate = await resolveOwnedEstate(caseNumber);
  if (estate.ok && estate.userId) {
    const rev = await reverseLinkedFundsTransactions(estate, {
      distributionId,
      reason: why || 'Distribution voided'
    });
    if (!rev.success) {
      warning =
        rev.error ||
        'Distribution voided, but Funds withdrawals could not be reversed automatically. Post an adjustment in Estate Funds.';
    } else if (rev.data?.reversedCount) {
      logEstateActivity({
        eventType: 'account_update',
        caseNumber: resolveCaseArg(caseNumber),
        metadata: {
          distribution_id: String(distributionId || '').trim(),
          field: 'funds_distribution_reversal',
          note: `Reversed ${rev.data.reversedCount} Funds row(s)`,
          related_id: String(distributionId || '').trim()
        }
      });
    }
  } else if (!estate.ok) {
    warning =
      estate.error ||
      'Distribution voided, but Funds reversal could not start. Post an adjustment in Estate Funds.';
  }

  if (warning) return { success: true, data, warning };
  return ok(data);
}

export async function listMyInheritance(caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal again.');
  const { data, error } = await supabase.rpc('estate_heir_list_distributions', {
    p_session_token: session.token
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(Array.isArray(data?.distributions) ? data.distributions : []);
}

/** Family portal transparency dashboard (visibility-gated by PR setting). */
export async function getHeirTransparencySummary(caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal again.');
  const { data, error } = await supabase.rpc('estate_heir_transparency_summary', {
    p_session_token: session.token
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_heir_transparency_summary|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Family transparency needs the SQL migration. Run supabase-migrations/estate-family-transparency-2026-07.sql, then try again.'
      );
    }
    return failed;
  }
  return ok({
    ...data,
    visibility: normalizeFamilyFinancialVisibility(data?.visibility),
    visibility_sections: normalizeVisibilitySections(data?.visibility_sections, {
      tier: data?.visibility,
      accessTier: data?.access_tier || session?.access_tier
    })
  });
}
export async function getHeirDistributionBatchCounts(caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal again.');
  const { data, error } = await supabase.rpc('estate_heir_distribution_batch_counts', {
    p_session_token: session.token
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_heir_distribution_batch_counts|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Distribution batch counts need supabase-migrations/estate-heir-distribution-batch-counts-2026-08.sql.'
      );
    }
    return failed;
  }
  return ok({
    finalizedBatchCount: Number(data?.finalized_batch_count) || 0,
    myDistributionBatchCount: Number(data?.my_distribution_batch_count) || 0
  });
}

export async function acknowledgeMyDistribution(recipientId, note, caseNumber, status = 'acknowledged') {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal again.');
  const payload = {
    p_session_token: session.token,
    p_recipient_id: recipientId,
    p_note: String(note || '').trim() || null,
    p_status: String(status || 'acknowledged').toLowerCase()
  };
  let { data, error } = await supabase.rpc('estate_heir_acknowledge_distribution', payload);
  if (error && /p_status|Could not find|function/i.test(error.message || '')) {
    ({ data, error } = await supabase.rpc('estate_heir_acknowledge_distribution', {
      p_session_token: session.token,
      p_recipient_id: recipientId,
      p_note: String(note || '').trim() || null
    }));
  }
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setRecipientAcknowledgement({
  recipientId,
  status,
  note = '',
  caseNumber
} = {}) {
  const { data, error } = await supabase.rpc('estate_set_recipient_acknowledgement', {
    p_case_number: resolveCaseArg(caseNumber),
    p_recipient_id: recipientId,
    p_status: String(status || '').trim().toLowerCase(),
    p_note: String(note || '').trim() || null
  });
  const failed = rpcFail(data, error);
  if (failed) {
    if (/estate_set_recipient_acknowledgement|schema cache|does not exist/i.test(failed.error || '')) {
      return fail(
        'Acknowledgement trail needs the OS-quality SQL migration. Run supabase-migrations/estate-os-quality-2026-07.sql, then try again.'
      );
    }
    return failed;
  }
  logEstateActivity({
    eventType: 'acknowledgement_update',
    caseNumber: resolveCaseArg(caseNumber),
    metadata: {
      recipient_id: recipientId,
      status: String(status || '').trim().toLowerCase(),
      note: String(note || '').trim().slice(0, 200)
    }
  });
  return ok(data);
}

export async function addDecisionNote({
  caseNumber,
  topic = '',
  note = '',
  relatedId = '',
  itemId = '',
  distributionId = ''
} = {}) {
  const body = String(note || '').trim();
  if (body.length < 3) return fail('Enter a short explanation note (at least 3 characters).');
  const result = await writeEstateActivity({
    eventType: 'decision_note',
    caseNumber: resolveCaseArg(caseNumber),
    metadata: {
      topic: String(topic || 'general').trim().slice(0, 80),
      note: body.slice(0, 500),
      related_id: String(relatedId || '').trim(),
      item_id: String(itemId || '').trim(),
      distribution_id: String(distributionId || '').trim()
    }
  });
  if (!result.success) {
    if (/Unknown event type|Activity log needs/i.test(result.error || '')) {
      return fail(
        'Decision notes need the OS-quality SQL migration. Run supabase-migrations/estate-os-quality-2026-07.sql, then try again.'
      );
    }
    return result;
  }
  return ok(result.data);
}

export async function listDecisionNotes(caseNumber, limit = 100) {
  const result = await listEstateActivityEvents(resolveCaseArg(caseNumber), Math.min(500, limit));
  if (!result.success) return result;
  const notes = (result.data || []).filter(
    (row) => String(row.event_type || '').toLowerCase() === 'decision_note'
  );
  return ok(notes);
}

export async function getFinanceSummary(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let itemsQuery = supabase
    .from('estate_items')
    .select(
      'id, highest_bid, legal_status, approved_for_sale, auction_paid_at, estimated_value, valuation_date, valuation_source'
    )
    .eq('owner_id', estate.userId);
  if (estate.estateId) itemsQuery = itemsQuery.eq('estate_id', estate.estateId);

  let documentsQuery = supabase
    .from('estate_account_documents')
    .select(ACCOUNT_DOCUMENT_SELECT)
    .eq('owner_id', estate.userId)
    .order('statement_date', { ascending: false });
  if (estate.estateId) documentsQuery = documentsQuery.eq('estate_id', estate.estateId);

  const [
    settingsResult,
    expensesResult,
    accountsResult,
    loansResult,
    claimsResult,
    itemsResult,
    documentsResult,
    distributionsResult
  ] =
    await Promise.all([
    getSettings(caseNumber),
    listEstateExpenses(caseNumber),
    listEstateAccounts(caseNumber),
    listEstatePrLoans(caseNumber),
    listEstateCreditorClaims(caseNumber),
    itemsQuery,
    documentsQuery,
    listEstateDistributions(caseNumber)
  ]);

  if (!settingsResult.success) return settingsResult;
  if (!expensesResult.success) return expensesResult;

  let items = [];
  if (itemsResult.error) {
    if (
      isMissingColumnError(itemsResult.error, 'estimated_value') ||
      isMissingColumnError(itemsResult.error, 'valuation_')
    ) {
      let fallback = supabase
        .from('estate_items')
        .select('id, highest_bid, legal_status, approved_for_sale, auction_paid_at')
        .eq('owner_id', estate.userId);
      if (estate.estateId) fallback = fallback.eq('estate_id', estate.estateId);
      const retry = await fallback;
      if (retry.error) return fail(retry.error);
      items = retry.data || [];
    } else {
      return fail(itemsResult.error);
    }
  } else {
    items = itemsResult.data || [];
  }

  const expenses = expensesResult.data || [];
  // Soft-fail: the snapshot still loads on a database that predates the
  // accounts or PR-loan ledger migrations.
  // listEstateAccounts already attaches computed Funds balances when the
  // transactions table is available.
  const accounts = accountsResult.success ? accountsResult.data || [] : [];
  const estateCtx = await resolveOwnedEstate(caseNumber);
  const txnList =
    estateCtx.userId && accountsResult.success
      ? await listAccountTransactionsForEstate(estateCtx)
      : { success: false, data: [] };
  const fundTransactions = txnList.success ? txnList.data || [] : [];
  const fundsComputed = txnList.success;
  const prLoans = loansResult.success ? loansResult.data || [] : [];
  const creditorClaims = claimsResult.success ? claimsResult.data || [] : [];
  const unvaluedInventoryCount = items.filter(
    (item) =>
      !item.auction_paid_at &&
      !(Number(item.highest_bid) > 0) &&
      item.legal_status !== 'distributed' &&
      item.legal_status !== 'archived' &&
      (item.estimated_value == null || item.estimated_value === '')
  ).length;

  // Canonical estate money totals — SAME SQL function as heir transparency.
  // No silent JS fallback: PR and family must not diverge if RPC is missing.
  if (!estateCtx.estateId) {
    return fail(
      'This estate is missing an id, so finance totals cannot load from the shared snapshot.'
    );
  }
  const { data: sqlSnap, error: sqlErr } = await supabase.rpc(
    'estate_compute_finance_snapshot',
    { p_estate_id: estateCtx.estateId }
  );
  if (sqlErr) {
    const msg = String(sqlErr.message || sqlErr.details || sqlErr);
    if (/estate_compute_finance_snapshot|schema cache|does not exist|PGRST202/i.test(msg)) {
      return fail(
        'Shared finance snapshot is not installed. In Supabase, run estate-shared-finance-snapshot-2026-08.sql, then estate-heir-finance-align-2026-08.sql.'
      );
    }
    return fail(sqlErr);
  }
  if (!sqlSnap?.success) {
    return fail(sqlSnap?.error || 'Could not compute estate finance snapshot.');
  }
  const snapshot = mapSqlFinanceSnapshot(sqlSnap);
  if (!snapshot) {
    return fail('Could not map estate finance snapshot.');
  }
  // Prefer Funds-txn accounting method when the client loaded transactions,
  // even if SQL also reports funds_transactions (keeps UI hints consistent).
  if (fundsComputed && snapshot.accountingMethod !== 'funds_transactions') {
    snapshot.accountingMethod = 'funds_transactions';
  }

  const finalizedDistributions = distributionsResult.success
    ? (distributionsResult.data || []).filter((row) => row.status === 'finalized')
    : [];
  const distributedCashTotal = finalizedDistributions.reduce(
    (sum, row) => sum + (Number(row.cash_total) || 0),
    0
  );
  const distributedPropertyValue = finalizedDistributions.reduce(
    (sum, row) => sum + (Number(row.property_value_total) || 0),
    0
  );

  return ok({
    ...snapshot,
    financeSource: 'sql',
    unvaluedInventoryCount,
    // Activity only — never subtracted again from netDistributable.
    distributionsCounted: 0,
    distributionCount: finalizedDistributions.length,
    distributedCashTotal,
    distributedPropertyValue,
    distributionsTotal: distributedCashTotal + distributedPropertyValue,
    estateName: settingsResult.data?.estate_name || 'Estate',
    caseNumber: settingsResult.data?.case_number || resolveCaseArg(caseNumber),
    displayCaseNumber: estateDisplayCaseNumber(
      settingsResult.data,
      settingsResult.data?.case_number || resolveCaseArg(caseNumber)
    ),
    courtCaseNumber: settingsResult.data?.court_case_number || null,
    expenses,
    accounts,
    fundTransactions,
    prLoans,
    creditorClaims,
    accountDocuments: documentsResult.error ? [] : documentsResult.data || [],
    accountsUnavailable: !accountsResult.success,
    fundTransactionsUnavailable: !txnList.success,
    prLoansUnavailable: !loansResult.success,
    creditorClaimsUnavailable: !claimsResult.success,
    accountDocumentsUnavailable: Boolean(documentsResult.error),
    distributionsUnavailable: !distributionsResult.success
  });
}

export async function listEvidenceHistory(caseNumber) {
  const { data, error } = await supabase.rpc('estate_list_evidence_history', {
    p_case_number: resolveCaseArg(caseNumber)
  });
  if (error) return fail(error);
  if (data?.success === false) return fail(data.error || 'Could not load evidence history.');
  return ok({
    settings: data?.settings_history || [],
    finance: data?.finance_history || []
  });
}

export async function closeEstateForRecords(caseNumber, reason) {
  const { data, error } = await supabase.rpc('estate_close_owned', {
    p_case_number: resolveCaseArg(caseNumber),
    p_reason: String(reason || '').trim()
  });
  if (error) return fail(error);
  if (data?.success === false) return fail(data.error || 'Could not close estate.');
  return ok(data);
}

export async function reopenEstateForWork(caseNumber, reason) {
  const { data, error } = await supabase.rpc('estate_reopen_owned', {
    p_case_number: resolveCaseArg(caseNumber),
    p_reason: String(reason || '').trim()
  });
  if (error) return fail(error);
  if (data?.success === false) return fail(data.error || 'Could not reopen estate.');
  return ok(data);
}

/** Outstanding vs paid auction bid lines for finance card viewers. */
export async function listFinanceAuctionItems(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let bidQuery = supabase
    .from('estate_items')
    .select('id, name, highest_bid, auction_paid_at, approved_for_sale, legal_status')
    .eq('owner_id', estate.userId)
    .not('highest_bid', 'is', null)
    .gt('highest_bid', 0)
    .order('highest_bid', { ascending: false });
  if (estate.estateId) bidQuery = bidQuery.eq('estate_id', estate.estateId);

  let unsoldQuery = supabase
    .from('estate_items')
    .select('id, name, highest_bid, auction_paid_at, approved_for_sale, legal_status')
    .eq('owner_id', estate.userId)
    .eq('approved_for_sale', true)
    .or('highest_bid.is.null,highest_bid.eq.0')
    .neq('legal_status', 'archived')
    .order('name', { ascending: true });
  if (estate.estateId) unsoldQuery = unsoldQuery.eq('estate_id', estate.estateId);

  const [bidResult, unsoldResult] = await Promise.all([bidQuery, unsoldQuery]);
  if (bidResult.error) return fail(bidResult.error);

  const outstanding = [];
  const paid = [];
  (bidResult.data || []).forEach((row) => {
    if (row.auction_paid_at) paid.push(row);
    else outstanding.push(row);
  });

  return ok({
    outstanding,
    paid,
    unsold: unsoldResult.error ? [] : unsoldResult.data || []
  });
}

/**
 * PR-only point-in-time evidence bundle. Uses existing estate-scoped readers;
 * no service-role access and no operator data are mixed into the PR record.
 */
export async function buildCourtEvidencePack(caseNumber) {
  try {
  const generatedAt = new Date().toISOString();
  const requests = await Promise.allSettled([
    getSettings(caseNumber),
    listAllItemsWithRooms(caseNumber),
    listSceneCaptures(caseNumber, { includeArchived: true }),
    getFinanceSummary(caseNumber),
    listFinanceAuctionItems(caseNumber),
    listSiblingAccounts(caseNumber),
    listEstateActivityEvents(caseNumber, 500),
    listEvidenceHistory(caseNumber),
    listEstateDistributions(caseNumber)
  ]);

  const names = [
    'estate settings',
    'inventory',
    'scene documentation',
    'finance summary',
    'auction lines',
    'heir list',
    'activity trail',
    'settings and finance history',
    'distribution schedule'
  ];
  const warnings = [];
  const value = (index, fallback) => {
    const settled = requests[index];
    if (settled.status === 'rejected') {
      warnings.push(`${names[index]}: ${settled.reason?.message || 'could not load'}`);
      return fallback;
    }
    const result = settled.value;
    if (!result?.success) {
      warnings.push(`${names[index]}: ${result?.error || 'could not load'}`);
      return fallback;
    }
    return result.data ?? fallback;
  };

  const rawSettings = value(0, {});
  const settings = {
    id: rawSettings.id || null,
    case_number: rawSettings.case_number || resolveCaseArg(caseNumber),
    estate_name: rawSettings.estate_name || null,
    court_case_number: rawSettings.court_case_number || null,
    owner_email: rawSettings.owner_email || null,
    letters_issued_at: rawSettings.letters_issued_at || null,
    probate_window_mode: rawSettings.probate_window_mode || null,
    probate_window_amount: rawSettings.probate_window_amount ?? null,
    probate_window_unit: rawSettings.probate_window_unit || null,
    probate_window_end_date: rawSettings.probate_window_end_date || null,
    auction_start_date: rawSettings.auction_start_date || null,
    auction_end_date: rawSettings.auction_end_date || null,
    auction_pickup_window: rawSettings.auction_pickup_window || null,
    accounting_method: rawSettings.accounting_method || 'current_balances',
    family_financial_visibility: rawSettings.family_financial_visibility || 'minimal',
    inventory_completed_at: rawSettings.inventory_completed_at || null,
    inventory_completed_by: rawSettings.inventory_completed_by || null,
    inventory_reopened_at: rawSettings.inventory_reopened_at || null,
    inventory_reopen_reason: rawSettings.inventory_reopen_reason || null,
    closed_at: rawSettings.closed_at || null,
    close_reason: rawSettings.close_reason || null,
    created_at: rawSettings.created_at || null,
    updated_at: rawSettings.updated_at || null
  };

  const finance = value(3, {});
  const distributions = value(8, []);
  const inventory = value(1, []);
  const scenes = value(2, []);
  const probate = resolveProbateWindow(settings);
  const claimsEnded = Boolean(probate.end && new Date() > probate.end);

  let familyUpdatePublished = false;
  try {
    const updates = await listOwnerFamilyUpdates(caseNumber);
    familyUpdatePublished = Boolean(updates.success && (updates.data || []).length);
  } catch {
    familyUpdatePublished = false;
  }

  const completeness = buildCompletenessCertificate({
    settings,
    finance: {
      ...finance,
      expenses: finance.expenses || []
    },
    distributions,
    items: inventory,
    expenses: finance.expenses || [],
    scenes,
    pendingReviewCount: (inventory || []).filter(
      (item) => item.review_status === 'pending_pr_review'
    ).length,
    claimsEnded,
    familyUpdatePublished
  });

  if (!completeness.filingReady) {
    warnings.push(
      `Completeness: ${completeness.statusLabel} (${completeness.blockingCount} blocking).`
    );
  }
  for (const row of completeness.exceptions || []) {
    if (row.severity === 'block') warnings.push(row.label);
  }

  const formalAccounting = buildFormalAccountingStatement({
    settings,
    finance,
    distributions,
    asOf: generatedAt
  });
  formalAccounting.completeness = completeness;

  let prLegalName = null;
  try {
    const profileResult = await getPrProfile();
    if (profileResult.success && profileResult.data?.legal_name) {
      prLegalName = profileResult.data.legal_name;
    }
  } catch {
    prLegalName = null;
  }

  const pack = await sealCourtPack({
    format: 'estate-vault-court-pack',
    version: 5,
    generated_at: generatedAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    read_only: true,
    filing_ready: completeness.filingReady,
    completeness,
    estate: { ...settings, pr_legal_name: prLegalName },
    inventory,
    scenes,
    finance,
    auction: value(4, { outstanding: [], paid: [] }),
    heirs: value(5, []),
    activity: value(6, []),
    evidence_history: value(7, { settings: [], finance: [] }),
    distributions,
    formal_accounting: formalAccounting,
    warnings
  });

  void supabase.rpc('estate_log_court_pack_export', {
    p_case_number: settings.case_number,
    p_manifest_hash: pack.manifest?.content_hash || null
  });

  return ok(pack);
  } catch (err) {
    return fail(err?.message || 'Could not build court evidence pack.');
  }
}

/**
 * Completeness certificate for filing-readiness gates (exports / counsel review).
 */
export async function getCompletenessCertificate(caseNumber) {
  const [
    settingsResult,
    financeResult,
    distributionsResult,
    itemsResult,
    scenesResult,
    expensesResult,
    updatesResult
  ] = await Promise.all([
    getSettings(caseNumber),
    getFinanceSummary(caseNumber),
    listEstateDistributions(caseNumber),
    listAllItemsWithRooms(caseNumber),
    listSceneCaptures(caseNumber, { includeArchived: true }),
    listEstateExpenses(caseNumber),
    listOwnerFamilyUpdates(caseNumber)
  ]);
  if (!settingsResult.success) return settingsResult;
  const settings = settingsResult.data || {};
  const finance = financeResult.success ? financeResult.data || {} : {};
  const expenses = expensesResult.success
    ? expensesResult.data || []
    : finance.expenses || [];
  const probate = resolveProbateWindow(settings);
  return ok(
    buildCompletenessCertificate({
      settings,
      finance: { ...finance, expenses },
      distributions: distributionsResult.success ? distributionsResult.data || [] : [],
      items: itemsResult.success ? itemsResult.data || [] : [],
      expenses,
      scenes: scenesResult.success ? scenesResult.data || [] : [],
      pendingReviewCount: (itemsResult.success ? itemsResult.data || [] : []).filter(
        (item) => item.review_status === 'pending_pr_review'
      ).length,
      claimsEnded: Boolean(probate.end && new Date() > probate.end),
      familyUpdatePublished: Boolean(updatesResult.success && (updatesResult.data || []).length)
    })
  );
}

/**
 * Build a printable formal accounting statement from the live finance and
 * distribution snapshots. Does not alter current-balances math.
 */
export async function getFormalAccountingStatement(caseNumber) {
  try {
  const [settingsResult, financeResult, distributionsResult, itemsResult, scenesResult, updatesResult] =
    await Promise.all([
      getSettings(caseNumber),
      getFinanceSummary(caseNumber),
      listEstateDistributions(caseNumber),
      listAllItemsWithRooms(caseNumber),
      listSceneCaptures(caseNumber, { includeArchived: true }),
      listOwnerFamilyUpdates(caseNumber)
    ]);
  if (!settingsResult.success) return settingsResult;
  if (!financeResult.success) return financeResult;

  const settings = settingsResult.data || {};
  const finance = financeResult.data || {};
  const distributions = distributionsResult.success ? distributionsResult.data || [] : [];
  const probate = resolveProbateWindow(settings);
  const claimsEnded = Boolean(probate.end && new Date() > probate.end);
  const statement = buildFormalAccountingStatement({
    settings,
    finance,
    distributions,
    asOf: settings.closed_at || new Date().toISOString()
  });
  statement.completeness = buildCompletenessCertificate({
    settings,
    finance,
    distributions,
    items: itemsResult.success ? itemsResult.data || [] : [],
    expenses: finance.expenses || [],
    scenes: scenesResult.success ? scenesResult.data || [] : [],
    pendingReviewCount: (itemsResult.success ? itemsResult.data || [] : []).filter(
      (item) => item.review_status === 'pending_pr_review'
    ).length,
    claimsEnded,
    familyUpdatePublished: Boolean(updatesResult.success && (updatesResult.data || []).length)
  });
  statement.filing_ready = Boolean(statement.completeness?.filingReady);
  statement.balance_stale = Boolean(statement.completeness?.balanceStale);
  return ok(statement);
  } catch (err) {
    return fail(err?.message || 'Could not build formal accounting.');
  }
}

/**
 * Build a printable Family Update package (beneficiary-facing staged transparency).
 */
export async function getFamilyUpdatePackage(caseNumber) {
  const activeCase = caseNumber || getActiveEstateCase();
  const [
    settingsResult,
    itemsResult,
    distributionsResult,
    financeResult,
    auctionResult,
    expensesResult,
    notesResult
  ] = await Promise.all([
    getSettings(activeCase),
    listAllItemsWithRooms(activeCase),
    listEstateDistributions(activeCase),
    getFinanceSummary(activeCase),
    listFinanceAuctionItems(activeCase),
    listEstateExpenses(activeCase),
    listDecisionNotes(activeCase, 40)
  ]);
  if (!settingsResult.success) return settingsResult;
  if (!itemsResult.success) return itemsResult;

  const settings = settingsResult.data || {};
  const visibility = normalizeFamilyFinancialVisibility(
    settings.family_financial_visibility
  );
  const finance = financeResult.success
    ? {
        ...(financeResult.data || {}),
        expenses: expensesResult.success ? expensesResult.data || [] : []
      }
    : null;

  return ok(
    buildFamilyUpdatePackage({
      settings,
      items: itemsResult.data || [],
      distributions: distributionsResult.success ? distributionsResult.data || [] : [],
      finance,
      auction: auctionResult.success ? auctionResult.data : null,
      decisionNotes: notesResult.success ? notesResult.data || [] : [],
      visibilityNote: `Current family financial visibility setting: ${familyFinancialVisibilityLabel(visibility)}.`
    })
  );
}

/**
 * Publish a numbered Family Update for beneficiaries to read in the portal.
 */
export async function publishFamilyUpdate({ caseNumber, prNote = '', title = '' } = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!estate.estateId) return fail('Estate id missing — open Settings and save once.');

  const packResult = await getFamilyUpdatePackage(caseNumber || estate.caseNumber);
  if (!packResult.success) return packResult;

  const { data: nextNumber, error: numError } = await supabase.rpc(
    'estate_next_family_update_number',
    { p_estate_id: estate.estateId }
  );
  if (numError) {
    if (/estate_next_family_update_number|schema cache|does not exist/i.test(numError.message || '')) {
      return fail(
        'Family Update publishing is not installed yet. Run supabase-migrations/estate-family-updates-2026-07.sql.'
      );
    }
    return fail(numError);
  }

  const updateNumber = Number(nextNumber) || 1;
  const note = String(prNote || '').trim();
  const customTitle = String(title || '').trim();
  const pack = {
    ...packResult.data,
    updateNumber,
    publishedAt: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('estate_family_updates')
    .insert({
      owner_id: estate.userId,
      estate_id: estate.estateId,
      update_number: updateNumber,
      title: customTitle || `Family Update #${updateNumber}`,
      pr_note: note || null,
      package: pack
    })
    .select(
      'id, update_number, title, pr_note, published_at, created_at'
    )
    .single();

  if (error) {
    if (/estate_family_updates|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Family Update publishing is not installed yet. Run supabase-migrations/estate-family-updates-2026-07.sql.'
      );
    }
    return fail(error);
  }

  logEstateActivity({
    eventType: 'family_update_publish',
    caseNumber: estate.caseNumber,
    metadata: { note: String(updateNumber) }
  });
  return ok({ ...data, package: pack });
}

export async function getAdministrationChronologyExport(caseNumber) {
  const activeCase = caseNumber || getActiveEstateCase();
  const [settingsResult, activityResult, distResult, updatesResult] = await Promise.all([
    getSettings(activeCase),
    listEstateActivityEvents(activeCase, 300),
    listEstateDistributions(activeCase),
    listOwnerFamilyUpdates(activeCase)
  ]);
  if (!settingsResult.success) return settingsResult;
  return ok(
    buildAdministrationChronology({
      settings: settingsResult.data || {},
      activity: activityResult.success ? activityResult.data || [] : [],
      distributions: distResult.success ? distResult.data || [] : [],
      familyUpdates: updatesResult.success ? updatesResult.data || [] : [],
      inventoryCert: {
        completedAt: settingsResult.data?.inventory_completed_at || null
      }
    })
  );
}

export async function getGiftResidualScheduleExport(caseNumber) {
  const activeCase = caseNumber || getActiveEstateCase();
  const [settingsResult, itemsResult, financeResult, heirsResult] = await Promise.all([
    getSettings(activeCase),
    listAllItemsWithRooms(activeCase),
    getFinanceSummary(activeCase),
    listSiblingAccounts(activeCase)
  ]);
  if (!settingsResult.success) return settingsResult;
  if (!itemsResult.success) return itemsResult;
  return ok(
    buildGiftResidualSchedule({
      settings: settingsResult.data || {},
      items: itemsResult.data || [],
      finance: financeResult.success ? financeResult.data : null,
      heirs: heirsResult.success ? heirsResult.data || [] : []
    })
  );
}

export async function listOwnerFamilyUpdates(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);
  if (!estate.estateId) return ok([]);

  const { data, error } = await supabase
    .from('estate_family_updates')
    .select('id, update_number, title, pr_note, published_at, created_at')
    .eq('estate_id', estate.estateId)
    .order('update_number', { ascending: false });

  if (error) {
    if (/estate_family_updates|schema cache|does not exist/i.test(error.message || '')) {
      return ok([]);
    }
    return fail(error);
  }
  return ok(data || []);
}

export async function listPublishedFamilyUpdates(caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal first.');
  const { data, error } = await supabase.rpc('estate_heir_list_family_updates', {
    p_session_token: session.token
  });
  if (error) return fail(error);
  if (data && data.success === false) return fail(data.error || 'Could not load Family Updates.');
  return ok(data?.updates || []);
}

export async function getPublishedFamilyUpdate(updateId, caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal first.');
  const { data, error } = await supabase.rpc('estate_heir_get_family_update', {
    p_session_token: session.token,
    p_update_id: updateId
  });
  if (error) return fail(error);
  if (data && data.success === false) return fail(data.error || 'Family Update not found.');
  return ok(data?.update || null);
}

export async function markFamilyUpdateRead(updateId, caseNumber) {
  const session = getStoredSiblingSession(caseNumber);
  if (!session?.token) return fail('Sign in to the family portal first.');
  const { data, error } = await supabase.rpc('estate_heir_mark_family_update_read', {
    p_session_token: session.token,
    p_update_id: updateId
  });
  if (error) {
    if (/estate_heir_mark_family_update_read|estate_family_update_reads|schema cache|does not exist/i.test(error.message || '')) {
      return ok({ skipped: true });
    }
    return fail(error);
  }
  if (data && data.success === false) return fail(data.error || 'Could not mark Family Update read.');
  return ok({ read_at: data?.read_at || null });
}

const estateInventoryService = {
  setActiveEstateCase,
  getActiveEstateCase,
  listCollections,
  createCollection,
  getCollection,
  listItems,
  listAllItemsWithRooms,
  listPendingReviewItems,
  approvePendingItem,
  rejectPendingItem,
  createItem,
  updateItem,
  itemHasSaleProceedsDeposit,
  replaceItemPhoto,
  replaceItemPhotoTransformed,
  appendItemPhotos,
  downloadItemPhotoForEdit,
  archiveItem,
  deleteItemPermanently,
  getSettings,
  saveSettings,
  setInventoryCompletion,
  listPublicEstates,
  listOwnedEstates,
  createOwnedEstate,
  claimOwnedEstate,
  checkEstateCaseAccessible,
  isLoggedInOwnerOfCase,
  findPublicEstateByName,
  listPublicAuctionSummaries,
  loginWithEstateAccessCode,
  listEstateExpenses,
  addEstateExpense,
  updateEstateExpense,
  deleteEstateExpense,
  listEstatePrLoans,
  addEstatePrLoan,
  updateEstatePrLoan,
  deleteEstatePrLoan,
  listEstateCreditorClaims,
  addEstateCreditorClaim,
  updateEstateCreditorClaim,
  deleteEstateCreditorClaim,
  listEstateContacts,
  addEstateContact,
  updateEstateContact,
  deleteEstateContact,
  resetAdminPasswordAsOwner,
  listEstateAccounts,
  addEstateAccount,
  updateEstateAccount,
  deleteEstateAccount,
  listEstateAccountDocuments,
  addEstateAccountDocument,
  deleteEstateAccountDocument,
  addEstateFundsDeposit,
  addEstateFundsAdjustment,
  listEstateFundsTransactions,
  removeEstateFundsTransaction,
  getFinanceSummary,
  listEstateDistributions,
  getDistributionReadiness,
  finalizeEstateDistribution,
  voidEstateDistribution,
  listMyInheritance,
  getHeirTransparencySummary,
  getHeirDistributionBatchCounts,
  acknowledgeMyDistribution,
  setRecipientAcknowledgement,
  addDecisionNote,
  listDecisionNotes,
  listFinanceAuctionItems,
  listEvidenceHistory,
  closeEstateForRecords,
  reopenEstateForWork,
  buildCourtEvidencePack,
  getCompletenessCertificate,
  getFormalAccountingStatement,
  getFamilyUpdatePackage,
  publishFamilyUpdate,
  getAdministrationChronologyExport,
  getGiftResidualScheduleExport,
  listOwnerFamilyUpdates,
  listPublishedFamilyUpdates,
  getPublishedFamilyUpdate,
  markFamilyUpdateRead,
  listEstateActivityEvents,
  ensureCaseSettings,
  createReadOnlyShareLink,
  listSiblingAccounts,
  setSiblingPassword,
  setHeirInvitePassword,
  setHeirPersonInvitePassword,
  addHeir,
  setHeirAccessTier,
  setHeirCanBrowseRooms,
  setHeirFinancialVisibility,
  setHeirVisibilitySections,
  renameHeir,
  listHeirNamesForCase,
  removeHeir,
  setHelperPassword,
  listHelpers,
  addHelper,
  setHelperPin,
  removeHelper,
  getAccessPasswords,
  isAdminUnlocked,
  clearAdminUnlock,
  isLoggedInEstateOwner,
  adminMustChangePassword,
  clearAdminMustChangePassword,
  loginEstateAdmin,
  verifyAdminPassword,
  setAdminPassword,
  getStoredSiblingSession,
  clearSiblingSession,
  hasActiveNonAdminEstateRole,
  describeActiveNonAdminEstateRole,
  siblingLogin,
  setPreferredName,
  heirChangePassword,
  siblingListItems,
  getSiblingEstateLabel,
  siblingRequestItem,
  siblingCancelRequest,
  siblingReleaseForSale,
  siblingListMessages,
  siblingSendMessage,
  siblingMarkMessagesRead,
  listMessageThreads,
  countUnreadHeirMessages,
  listMessagesForHeir,
  sendAdminMessage,
  markAdminMessagesRead,
  getStoredHelperSession,
  clearHelperSession,
  getStoredAdvisorSession,
  clearAdvisorSession,
  setContactPortalPin,
  advisorSetPassword,
  advisorListFamilyUpdates,
  advisorGetFamilyUpdate,
  advisorGetOverview,
  advisorGetFormalAccounting,
  helperLogin,
  helperListCollections,
  helperCreateItem,
  listSceneCaptures,
  createSceneCapture,
  updateSceneCapture,
  archiveSceneCapture,
  restoreSceneCapture,
  deleteSceneCapturePermanently,
  helperCreateScene,
  listAuctionItems,
  placeAuctionBid,
  getAuctionPublicConfig,
  createAuctionSetupIntent,
  confirmAuctionRegistration,
  setAuctionPassword,
  auctionPasswordConfigured,
  getAuctionBidder,
  saveAuctionBidder,
  saveAuctionBidderSession,
  clearAuctionBidder,
  isAuctionUnlocked,
  clearAuctionUnlock,
  verifyAuctionPassword,
  compressImageFile
};

export default estateInventoryService;
