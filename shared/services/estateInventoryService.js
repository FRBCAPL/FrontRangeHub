import { supabase } from '../config/supabase.js';
import {
  CASE_NUMBER,
  LEGAL_STATUS,
  normalizeEstateCaseNumber,
  isOpenEstateCase,
  resolveAuctionWindow
} from '../utils/estateInventoryConstants.js';
import { extractPhotoMetadata, buildPhotoEntry } from '../utils/estatePhotoMeta.js';
import { buildReadOnlyHtml, buildCatalogJson } from '../utils/estateExport.js';
import {
  computeFinanceSnapshot,
  sumExpenses,
  sumOutstandingBids,
  sumPaidAuctionSales
} from '../utils/estateFinance.js';

const PHOTO_BUCKET = 'estate-inventory-photos';
const EXPORT_BUCKET = 'estate-inventory-exports';
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;

const ITEM_SELECT =
  'id, collection_id, owner_id, estate_id, name, notes, photo_url, photo_urls, legal_status, value_tier, is_memorandum_asset, assigned_beneficiary, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, disputed_at, distributed_at, sibling_claims, family_releases, approved_for_sale, highest_bid, highest_bidder_name, highest_bidder_email, highest_bidder_phone, bid_updated_at, auction_paid_at, review_status, created_by_role, created_by_name, reviewed_at, is_approved_by_pr, change_history, created_at, updated_at';

const SETTINGS_SELECT =
  'id, owner_id, case_number, estate_name, court_case_number, letters_issued_at, probate_window_mode, probate_window_amount, probate_window_unit, probate_window_end_date, auction_start_date, auction_end_date, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, created_at, updated_at';

const SIBLING_SESSION_KEY = 'estate-sibling-session';
const ADMIN_UNLOCK_KEY = 'estate-admin-unlocked';
const HELPER_SESSION_KEY = 'estate-helper-session';
const AUCTION_BIDDER_KEY = 'estate-auction-bidder';
const ADMIN_MUST_CHANGE_KEY = 'estate-admin-must-change-password';

/** Active case for admin/service calls (set from EstateCaseContext / route). */
let activeEstateCase = CASE_NUMBER;

export function setActiveEstateCase(caseNumber) {
  activeEstateCase = normalizeEstateCaseNumber(caseNumber) || CASE_NUMBER;
  return activeEstateCase;
}

export function getActiveEstateCase() {
  return activeEstateCase || CASE_NUMBER;
}

function resolveCaseArg(caseNumber) {
  return normalizeEstateCaseNumber(caseNumber || activeEstateCase) || CASE_NUMBER;
}

/** Multi-estate: reject owner-wide queries when estate_id is missing (non-legacy). */
function assertEstateScoped(estate) {
  if (!estate?.ok) return { ok: false, error: estate?.error || 'Could not resolve estate.' };
  if (!estate.legacy && !estate.estateId) {
    return {
      ok: false,
      error: 'Could not resolve this estate case. Refresh and try again.'
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

function fail(error) {
  const raw = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
  const missingTable =
    /schema cache|could not find the table|relation .* does not exist|column .* does not exist/i.test(raw);
  if (missingTable) {
    return {
      success: false,
      error:
        'EstateIt needs a database update. In Supabase SQL Editor run the estate-inventory migration SQL files (correct project), then refresh.'
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
  const { data: existing, error: findErr } = await supabase
    .from('estate_settings')
    .select(SETTINGS_SELECT)
    .eq('owner_id', auth.userId)
    .ilike('case_number', cn)
    .maybeSingle();

  if (findErr) {
    const msg = findErr.message || String(findErr);
    // Only fall back when the multi-estate `id` column is truly missing
    const missingIdCol =
      /could not find the ['"]id['"] column/i.test(msg) ||
      /column\s+[\w.]*estate_settings\.id\s+does not exist/i.test(msg) ||
      /column\s+['"]id['"]\s+does not exist/i.test(msg);
    if (missingIdCol) {
      const { data: legacy, error: legacyErr } = await supabase
        .from('estate_settings')
        .select(
          'owner_id, case_number, letters_issued_at, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, created_at, updated_at'
        )
        .eq('owner_id', auth.userId)
        .maybeSingle();
      if (legacyErr) return { ok: false, error: legacyErr.message || String(legacyErr) };
      if (!legacy) {
        return {
          ok: true,
          userId: auth.userId,
          estateId: null,
          caseNumber: cn,
          settings: null,
          legacy: true
        };
      }
      return {
        ok: true,
        userId: auth.userId,
        estateId: null,
        caseNumber: legacy.case_number || cn,
        settings: legacy,
        legacy: true
      };
    }
    return { ok: false, error: msg };
  }

  if (existing?.id) {
    return {
      ok: true,
      userId: auth.userId,
      estateId: existing.id,
      caseNumber: existing.case_number || cn,
      settings: existing,
      legacy: false
    };
  }

  const { data: ensured, error: ensureErr } = await supabase.rpc('estate_ensure_owned_estate', {
    p_case_number: cn
  });
  if (ensureErr) return { ok: false, error: ensureErr.message || String(ensureErr) };
  if (ensured?.success === false) {
    return { ok: false, error: ensured.error || 'Could not open estate case.' };
  }

  const estateId = ensured?.estate_id;
  if (!estateId) return { ok: false, error: 'Could not resolve estate id.' };

  const { data: row, error: rowErr } = await supabase
    .from('estate_settings')
    .select(SETTINGS_SELECT)
    .eq('id', estateId)
    .maybeSingle();
  if (rowErr) return { ok: false, error: rowErr.message || String(rowErr) };

  return {
    ok: true,
    userId: auth.userId,
    estateId,
    caseNumber: row?.case_number || cn,
    settings: row,
    legacy: false
  };
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
    const bitmap = await createImageBitmap(file);
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

async function uploadPhotoAtPath(userId, pathSuffix, file) {
  const compressed = await compressImageFile(file);
  const path = `${userId}/${pathSuffix}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, compressed, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600'
  });
  if (error) return fail(error);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return ok(data?.publicUrl || null);
}

export async function listCollections(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let collectionsQuery = supabase
    .from('estate_collections')
    .select('id, name, estate_id, created_at, updated_at')
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) collectionsQuery = collectionsQuery.eq('estate_id', estate.estateId);

  const { data: collections, error } = await collectionsQuery;
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
  if (estate.estateId) row.estate_id = estate.estateId;

  const { data, error } = await supabase
    .from('estate_collections')
    .insert(row)
    .select('id, name, created_at, updated_at')
    .single();

  if (error) return fail(error);
  return ok({ ...data, itemCount: 0 });
}

export async function getCollection(collectionId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_collections')
    .select('id, name, created_at, updated_at')
    .eq('id', collectionId)
    .eq('owner_id', estate.userId);
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q.maybeSingle();

  if (error) return fail(error);
  if (!data) return fail('Collection not found.');
  return ok(data);
}

export async function listItems(collectionId, caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_items')
    .select(ITEM_SELECT)
    .eq('owner_id', estate.userId)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;
  if (error) return fail(error);
  return ok(data || []);
}

export async function listAllItemsWithRooms(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const collectionsResult = await listCollections(caseNumber);
  if (!collectionsResult.success) return collectionsResult;
  const roomById = Object.fromEntries((collectionsResult.data || []).map((c) => [c.id, c.name]));

  let q = supabase
    .from('estate_items')
    .select(ITEM_SELECT)
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;

  if (error) return fail(error);

  return ok(
    (data || []).map((item) => ({
      ...item,
      room: roomById[item.collection_id] || 'Unassigned'
    }))
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
    photo_url: null,
    photo_urls: [],
    legal_status: legalStatus,
    value_tier: input?.valueTier || 'general_household',
    is_memorandum_asset: Boolean(input?.isMemorandumAsset),
    assigned_beneficiary: input?.isMemorandumAsset
      ? input?.assignedBeneficiary || null
      : null,
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
 *  deviceGps?: { lat: number|null, lng: number|null }
 * }} input
 */
export async function createItem(input) {
  const estate = await resolveOwnedEstate(input?.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const itemName = (input?.name || '').trim();
  if (!itemName) return fail('Item name is required.');

  let collectionId = input?.collectionId || null;
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

  if (!collectionId) {
    const newName = (input?.newCollectionName || '').trim();
    if (!newName) return fail('Pick a room/collection or create a new one.');
    const created = await createCollection(newName, estate.caseNumber);
    if (!created.success) return created;
    collectionId = created.data.id;
  }

  if (input?.isMemorandumAsset && !input?.assignedBeneficiary) {
    return fail('Assigned beneficiary is required for memorandum assets.');
  }

  const files = [];
  if (Array.isArray(input?.photoFiles)) files.push(...input.photoFiles.filter(Boolean));
  else if (input?.photoFile) files.push(input.photoFile);

  let meta = {
    photo_captured_at: null,
    photo_gps_lat: null,
    photo_gps_lng: null
  };
  if (files[0]) {
    meta = await extractPhotoMetadata(files[0]);
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

  const { data: item, error } = await supabase
    .from('estate_items')
    .insert(payload)
    .select(ITEM_SELECT)
    .single();

  if (error) return fail(error);

  if (!files.length) return ok(item);

  const urls = [];
  let warning = '';
  for (let i = 0; i < files.length; i += 1) {
    const fileMeta =
      i === 0
        ? meta
        : await extractPhotoMetadata(files[i]).then((m) => {
            if (m.photo_gps_lat == null && input?.deviceGps?.lat != null) {
              return {
                ...m,
                photo_gps_lat: input.deviceGps.lat,
                photo_gps_lng: input.deviceGps.lng
              };
            }
            return m;
          });
    const uploaded = await uploadPhotoAtPath(estate.userId, `${item.id}_${i}.jpg`, files[i]);
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

  const { data: updated, error: updateError } = await supabase
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
    .eq('owner_id', estate.userId)
    .select(ITEM_SELECT)
    .single();

  if (updateError) {
    return {
      success: true,
      data: { ...item, photo_url: urls[0].url, photo_urls: urls },
      warning: updateError.message
    };
  }
  return warning ? { success: true, data: updated, warning } : ok(updated);
}

export async function updateItem(itemId, patch) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const updates = { updated_at: new Date().toISOString() };
  if (patch.name != null) updates.name = String(patch.name).trim();
  if (patch.notes != null) updates.notes = String(patch.notes).trim() || null;
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
  if (patch.isMemorandumAsset != null) {
    updates.is_memorandum_asset = Boolean(patch.isMemorandumAsset);
    if (!patch.isMemorandumAsset) updates.assigned_beneficiary = null;
  }
  if (patch.assignedBeneficiary != null) {
    updates.assigned_beneficiary = patch.assignedBeneficiary || null;
  }
  if (patch.collectionId != null) updates.collection_id = patch.collectionId;
  if (patch.approvedForSale != null) {
    updates.approved_for_sale = Boolean(patch.approvedForSale);
  }
  if (patch.auctionPaid != null) {
    updates.auction_paid_at = patch.auctionPaid ? new Date().toISOString() : null;
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

  const { data, error } = await supabase
    .from('estate_items')
    .update(updates)
    .eq('id', itemId)
    .eq('owner_id', auth.userId)
    .select(ITEM_SELECT)
    .single();

  if (error) return fail(error);
  return ok(data);
}

/**
 * Soft-remove: archive keeps the row + photos for the estate file.
 * Prefer this for real probate records.
 */
export async function archiveItem(itemId) {
  return updateItem(itemId, {
    legalStatus: LEGAL_STATUS.archived,
    approvedForSale: false
  });
}

/**
 * Hard delete one item (owner only via RPC). Use for test cleanup / personal photos —
 * not for normal probate workflow (use Archive instead).
 */
export async function deleteItemPermanently(itemId) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!itemId) return fail('Item id required.');

  const { data, error } = await supabase.rpc('estate_admin_delete_item', {
    p_item_id: itemId
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
    .select('sibling_key, display_name, preferred_name, access_tier, updated_at')
    .eq('owner_id', estate.userId)
    .order('display_name', { ascending: true });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  const { data, error } = await q;
  if (error) {
    // Older DBs without preferred_name column — fall back
    if (/preferred_name/i.test(error.message || '')) {
      let q2 = supabase
        .from('estate_sibling_accounts')
        .select('sibling_key, display_name, access_tier, updated_at')
        .eq('owner_id', estate.userId)
        .order('display_name', { ascending: true });
      if (estate.estateId) q2 = q2.eq('estate_id', estate.estateId);
      const retry = await q2;
      if (retry.error) return fail(retry.error);
      return ok(
        (retry.data || []).map((row) => ({
          ...row,
          preferred_name: null,
          admin_label: row.display_name
        }))
      );
    }
    return fail(error);
  }
  return ok(
    (data || []).map((row) => ({
      ...row,
      admin_label: row.display_name,
      preferred_name: row.preferred_name || null
    }))
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
    access_tier: data.access_tier || 'residual'
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

/** @deprecated Prefer addHeir + setHeirPersonInvitePassword */
export async function setSiblingPassword(siblingKey, displayName, password) {
  const { data, error } = await supabase.rpc('estate_set_sibling_password', {
    p_sibling_key: siblingKey,
    p_display_name: displayName,
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
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
    p_case_number: caseNumber || CASE_NUMBER
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

export function isAdminUnlocked() {
  try {
    const raw = sessionStorage.getItem(ADMIN_UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed?.unlockedAt) return false;
    // Unlock lasts for this browser tab session (cleared when tab closes)
    return true;
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

export function adminMustChangePassword() {
  try {
    return sessionStorage.getItem(ADMIN_MUST_CHANGE_KEY) === '1';
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

function markAdminUnlocked(mustChangePassword) {
  try {
    sessionStorage.setItem(
      ADMIN_UNLOCK_KEY,
      JSON.stringify({ unlockedAt: Date.now() })
    );
    if (mustChangePassword) {
      sessionStorage.setItem(ADMIN_MUST_CHANGE_KEY, '1');
    } else {
      sessionStorage.removeItem(ADMIN_MUST_CHANGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * EstateIt-only admin login: case password via atlasbackend → Supabase session for RLS.
 * Does not use Hub / ladder Google login or localStorage isAuthenticated.
 */
export async function loginEstateAdmin(password, caseNumber = CASE_NUMBER) {
  try {
    const res = await fetch(`${estateAuctionApiBase()}/api/estate-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        caseNumber: caseNumber || CASE_NUMBER
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
    markAdminUnlocked(Boolean(data.mustChangePassword));
    return ok({
      must_change_password: Boolean(data.mustChangePassword),
      case_number: data.caseNumber || caseNumber || CASE_NUMBER
    });
  } catch (err) {
    return fail(err?.message || 'Could not reach estate admin login server.');
  }
}

/** @deprecated Prefer loginEstateAdmin — requires an existing auth session */
export async function verifyAdminPassword(password) {
  const { data, error } = await supabase.rpc('estate_verify_admin_password', {
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  markAdminUnlocked(Boolean(data?.must_change_password));
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
  return ok(data);
}

export function getStoredSiblingSession() {
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(SIBLING_SESSION_KEY);
      return null;
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

export async function siblingLogin(caseNumber, displayName, password) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Select or enter your name.');
  }
  const { data, error } = await supabase.rpc('estate_sibling_login', {
    p_case_number: caseNumber || CASE_NUMBER,
    p_display_name: name,
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const session = persistSiblingSession(
    buildSiblingSessionFromPayload(data, caseNumber || CASE_NUMBER)
  );
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
  try {
    const raw = localStorage.getItem(SIBLING_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (data.access_tier) parsed.access_tier = data.access_tier || 'residual';
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
    access_tier: data.access_tier || 'residual',
    letters_issued_at: data.letters_issued_at || null,
    case_number: data.case_number || CASE_NUMBER,
    probate_window_mode: data.probate_window_mode || 'duration',
    probate_window_amount: data.probate_window_amount ?? 90,
    probate_window_unit: data.probate_window_unit || 'days',
    probate_window_end_date: data.probate_window_end_date || null,
    items: data.items || []
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
    // Pre-migration fallback: direct select (cross-estate — only until foundation SQL is applied)
    if (/estate_list_auction_items|schema cache|does not exist/i.test(failed.error || '')) {
      const { data: rows, error: qErr } = await supabase
        .from('estate_items')
        .select(
          'id, name, notes, photo_url, photo_urls, value_tier, legal_status, highest_bid, highest_bidder_name, collection_id, approved_for_sale'
        )
        .eq('approved_for_sale', true)
        .eq('review_status', 'approved')
        .not('legal_status', 'in', '(claimed_memorandum,disputed,distributed,archived,unauthorized_removal)')
        .order('created_at', { ascending: false });
      if (qErr) return fail(qErr);
      return ok(
        (rows || []).map((item) => ({
          ...item,
          room: 'Estate'
        }))
      );
    }
    return failed;
  }
  return ok(data?.items || []);
}

export async function placeAuctionBid({ itemId, amount, sessionToken, caseNumber }) {
  const bidder = getAuctionBidder();
  const token = sessionToken || bidder?.sessionToken;
  if (!token) {
    return fail('Register and verify a payment card before bidding.');
  }
  // Soft client guard: Hub admin unlock or logged-in estate owner should not bid
  if (isAdminUnlocked()) {
    return fail(
      'Personal Representative admin session is active — do not bid on the public auction. Use Admin Notes or pay FMV into the estate account.'
    );
  }
  const ownership = await isLoggedInEstateOwner(caseNumber);
  if (ownership.success && ownership.data === true) {
    return fail(
      'Your Hub account owns this estate inventory — you may not place public auction bids.'
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
  return ok(data);
}

/** True when the signed-in Hub user is the estate settings owner for this case. */
export async function isLoggedInEstateOwner(caseNumber = CASE_NUMBER) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) return ok(false);
  const { data, error } = await supabase.rpc('estate_auction_public_info', {
    p_case_number: caseNumber
  });
  if (error || !data?.success) return ok(false);
  return ok(Boolean(data.owner_id && data.owner_id === userData.user.id));
}

/** Atlasbackend base for EstateIt routes (admin login + auction). Not Hub/ladder. */
function estateAuctionApiBase() {
  // Optional dedicated override only (do not use VITE_BACKEND_URL — that is often
  // localhost:8080 for ladder, which has no ESTATE_* keys).
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ESTATE_BACKEND_URL) {
    return String(import.meta.env.VITE_ESTATE_BACKEND_URL).replace(/\/$/, '');
  }
  return 'https://atlasbackend-bnng.onrender.com';
}

export async function getAuctionPublicConfig(caseNumber = CASE_NUMBER) {
  try {
    const res = await fetch(
      `${estateAuctionApiBase()}/api/estate-auction/config?caseNumber=${encodeURIComponent(caseNumber || CASE_NUMBER)}`
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
        caseNumber: caseNumber || CASE_NUMBER
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
        caseNumber: caseNumber || CASE_NUMBER,
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
    probate_window_end_date: data.probate_window_end_date || null
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
  estateCashOnHand
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

  if (lettersIssuedAt !== undefined) {
    row.letters_issued_at = lettersIssuedAt || null;
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
    row.probate_window_end_date = probateWindowEndDate || null;
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

  const conflict = estate.estateId ? 'id' : 'owner_id';
  const { data, error } = await supabase
    .from('estate_settings')
    .upsert(row, { onConflict: conflict })
    .select(SETTINGS_SELECT)
    .single();

  if (error) return fail(error);
  return ok(data);
}

/** Public landing list — friendly names for open estates (requires estate-named-accounts.sql). */
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

/**
 * Resolve a typed estate name (or court/portal case id) against the public list.
 * @returns {{ ok: true, estate } | { ok: false, error: string, matches?: object[] }}
 */
export async function findPublicEstateByName(rawName) {
  const typed = String(rawName || '').trim();
  if (typed.length < 2) {
    return fail('Enter the estate name (at least 2 characters).');
  }
  const listed = await listPublicEstates();
  let estates = listed.success ? listed.data || [] : [];
  if (!listed.success || estates.length === 0) {
    estates = [
      { caseNumber: CASE_NUMBER, estateName: CASE_NUMBER, courtCaseNumber: CASE_NUMBER },
      {
        caseNumber: normalizeEstateCaseNumber('TEST0001'),
        estateName: 'TEST0001',
        courtCaseNumber: null
      }
    ];
  }
  estates = estates.filter((e) => isOpenEstateCase(e.caseNumber));
  if (estates.length === 0) {
    return fail('No estates are open yet.');
  }

  const lower = typed.toLowerCase();
  const asCase = normalizeEstateCaseNumber(typed);
  const exactName = estates.filter((e) => e.estateName.toLowerCase() === lower);
  if (exactName.length === 1) return ok(exactName[0]);
  if (exactName.length > 1) {
    return fail('More than one estate uses that name. Ask the Personal Representative.');
  }

  const byCase = estates.filter(
    (e) => e.caseNumber === asCase || (e.courtCaseNumber && e.courtCaseNumber === asCase)
  );
  if (byCase.length === 1) return ok(byCase[0]);

  const partial = estates.filter((e) => e.estateName.toLowerCase().includes(lower));
  if (partial.length === 1) return ok(partial[0]);
  if (partial.length > 1) {
    return fail('Several estates match that name. Type the full estate name.');
  }
  return fail('No estate found with that name. Check the spelling and try again.');
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
 * Landing sign-in: estate already resolved; access code alone identifies the person.
 * Tries unique heir invite/personal code or helper code first, then admin password.
 * @param {{ caseNumber: string, code: string }}
 */
export async function loginWithEstateAccessCode({ caseNumber, code }) {
  const cn = resolveCaseArg(caseNumber);
  const pass = String(code || '').trim();
  if (!pass) return fail('Enter your access code.');

  const { data, error } = await supabase.rpc('estate_login_by_access_code', {
    p_case_number: cn,
    p_password: pass
  });
  if (!error && data?.success) {
    const role = data.role;
    if (role === 'family') {
      clearHelperSession();
      clearAdminUnlock();
      const session = persistSiblingSession(buildSiblingSessionFromPayload(data, cn));
      return ok({ role: 'family', ...session });
    }
    if (role === 'helper') {
      clearSiblingSession();
      clearAdminUnlock();
      const session = {
        token: data.token,
        display_name: data.display_name || 'Helper',
        case_number: data.case_number || cn,
        expires_at: data.expires_at
      };
      try {
        localStorage.setItem(HELPER_SESSION_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }
      return ok({ role: 'helper', ...session });
    }
  }

  // Personal Representative (admin password)
  const admin = await loginEstateAdmin(pass, cn);
  if (admin.success) {
    clearSiblingSession();
    clearHelperSession();
    return ok({ role: 'admin', ...admin.data });
  }

  const rpcMsg = data?.error || (error ? error.message : '');
  if (rpcMsg && /does not exist|schema cache|estate_login_by_access_code/i.test(rpcMsg)) {
    return fail(
      'Access-code sign-in needs a database update. Run supabase-migrations/estate-login-by-access-code.sql in Supabase.'
    );
  }
  return fail(rpcMsg || admin.error || 'Incorrect access code for this estate.');
}

export async function createReadOnlyShareLink() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const catalog = await listAllItemsWithRooms();
  if (!catalog.success) return catalog;

  const settings = await getSettings();
  const caseNumber = settings.success ? settings.data.case_number : CASE_NUMBER;
  const token = randomToken();

  const html = buildReadOnlyHtml({
    caseNumber,
    items: catalog.data,
    generatedAt: new Date().toISOString()
  });
  const json = buildCatalogJson({
    caseNumber,
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

  const { data: linkRow, error: linkErr } = await supabase
    .from('estate_export_links')
    .insert({
      owner_id: auth.userId,
      token,
      storage_path: htmlPath,
      public_url: publicUrl
    })
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
    .select(ITEM_SELECT)
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

export async function approvePendingItem(itemId, patch = {}) {
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

  return updateItem(itemId, {
    reviewStatus: 'approved',
    isApprovedByPr: true,
    legalStatus,
    valueTier: patch.valueTier,
    isMemorandumAsset: isMemo,
    assignedBeneficiary: isMemo ? patch.assignedBeneficiary || null : null,
    approvedForSale: canAuction ? Boolean(patch.approvedForSale) : false
  });
}

export async function rejectPendingItem(itemId) {
  return updateItem(itemId, {
    reviewStatus: 'rejected',
    isApprovedByPr: false,
    legalStatus: LEGAL_STATUS.archived,
    approvedForSale: false
  });
}

export async function setAuctionPassword(password) {
  const { data, error } = await supabase.rpc('estate_set_auction_password', {
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** @deprecated Auction browse is public; kept for older Settings installs */
export async function auctionPasswordConfigured(caseNumber) {
  const { data, error } = await supabase.rpc('estate_auction_password_configured', {
    p_case_number: caseNumber || CASE_NUMBER
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok({ configured: Boolean(data?.configured) });
}

export function getAuctionBidder() {
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
    p_case_number: caseNumber || CASE_NUMBER,
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function setHelperPassword(password, caseNumber) {
  const { data, error } = await supabase.rpc('estate_set_helper_password', {
    p_password: password,
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

/** Current shared/temp passwords for PR Settings (requires estate-access-password-reminders.sql + per-heir invite migration). */
export async function getAccessPasswords(caseNumber) {
  const { data, error } = await supabase.rpc('estate_get_access_passwords', {
    p_case_number: resolveCaseArg(caseNumber)
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const heirs = Array.isArray(data?.heirs)
    ? data.heirs.map((h) => ({
        sibling_key: h?.sibling_key ?? '',
        display_name: h?.display_name ?? '',
        invite_password: h?.invite_password ?? null,
        invite_configured: Boolean(h?.invite_configured),
        has_personal_password: Boolean(h?.has_personal_password)
      }))
    : [];
  return ok({
    admin_password: data?.admin_password ?? null,
    admin_configured: Boolean(data?.admin_configured),
    admin_is_default: Boolean(data?.admin_is_default),
    helper_password: data?.helper_password ?? null,
    helper_configured: Boolean(data?.helper_configured),
    heir_invite_password: data?.heir_invite_password ?? null,
    heir_invite_configured: Boolean(data?.heir_invite_configured),
    heirs
  });
}

export function getStoredHelperSession() {
  try {
    const raw = localStorage.getItem(HELPER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(HELPER_SESSION_KEY);
      return null;
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

export async function helperLogin(caseNumber, password, displayName) {
  const name = (displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter your name so the Personal Representative knows who took each photo.');
  }
  const { data, error } = await supabase.rpc('estate_helper_login', {
    p_case_number: caseNumber || CASE_NUMBER,
    p_password: password,
    p_display_name: name
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  const session = {
    token: data.token,
    display_name: data.display_name,
    case_number: data.case_number,
    expires_at: data.expires_at
  };
  try {
    localStorage.setItem(HELPER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
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

  let meta = {
    photo_captured_at: null,
    photo_gps_lat: null,
    photo_gps_lng: null
  };
  if (input?.photoFile) {
    meta = await extractPhotoMetadata(input.photoFile);
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

  const item = data.item;
  const uploadPrefix = data.upload_prefix;

  if (input?.photoFile && item?.id && uploadPrefix) {
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
        const attached = await supabase.rpc('estate_helper_set_photo', {
          p_token: session.token,
          p_item_id: item.id,
          p_photo_url: photoUrl,
          p_device_captured_at: meta.photo_captured_at || null
        });
        if (attached.data?.success && attached.data?.item) {
          return ok(attached.data.item);
        }
        return { success: true, data: { ...item, photo_url: photoUrl }, warning: 'Item saved; photo link may need refresh.' };
      }
    }
    return { success: true, data: item, warning: 'Item saved for PR review, but the photo upload failed.' };
  }

  return ok(item);
}

const SCENE_SELECT =
  'id, owner_id, room_label, notes, photo_url, photo_urls, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, created_by_role, created_by_name, created_at, updated_at';

/** Admin-only: list as-found scene captures (not shown to heirs). */
export async function listSceneCaptures(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_scene_captures')
    .select(SCENE_SELECT)
    .eq('owner_id', estate.userId)
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;

  if (error) {
    if (/estate_scene_captures|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Scene documentation needs a database update. Run supabase-migrations/estate-scene-captures.sql in the Supabase SQL Editor.'
      );
    }
    return fail(error);
  }
  return ok(data || []);
}

/** Admin: capture a walk-in / room / box scene photo. */
export async function createSceneCapture(input) {
  const estate = await resolveOwnedEstate(input?.caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

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

  const { data: updated, error: updateError } = await supabase
    .from('estate_scene_captures')
    .update({
      photo_url: entry.url,
      photo_urls: [entry],
      photo_gps_lat: meta.photo_gps_lat,
      photo_gps_lng: meta.photo_gps_lng,
      updated_at: new Date().toISOString()
    })
    .eq('id', row.id)
    .eq('owner_id', estate.userId)
    .select(SCENE_SELECT)
    .single();

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

export async function addEstateExpense({ expenseName, amount, datePaid, receiptUrl, caseNumber } = {}) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  const name = String(expenseName || '').trim();
  const amt = Number(amount);
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
    .select('id, owner_id, estate_id, expense_name, amount, date_paid, receipt_url, created_at, updated_at')
    .single();

  if (error) return fail(error);
  return ok(data);
}

export async function deleteEstateExpense(expenseId) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  if (!expenseId) return fail('Expense id required.');

  const { error } = await supabase
    .from('estate_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('owner_id', auth.userId);

  if (error) return fail(error);
  return ok(true);
}

/**
 * Admin-only fiduciary snapshot: PR loans + expense sum + auction gross − expenses = net.
 */
export async function getFinanceSummary(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let itemsQuery = supabase
    .from('estate_items')
    .select('id, highest_bid, legal_status, approved_for_sale, auction_paid_at')
    .eq('owner_id', estate.userId);
  if (estate.estateId) itemsQuery = itemsQuery.eq('estate_id', estate.estateId);

  const [settingsResult, expensesResult, itemsResult] = await Promise.all([
    getSettings(caseNumber),
    listEstateExpenses(caseNumber),
    itemsQuery
  ]);

  if (!settingsResult.success) return settingsResult;
  if (!expensesResult.success) return expensesResult;
  if (itemsResult.error) return fail(itemsResult.error);

  const expenses = expensesResult.data || [];
  const items = itemsResult.data || [];
  const expensesTotal = sumExpenses(expenses);
  const outstandingBids = sumOutstandingBids(items);
  const paidAuctionSales = sumPaidAuctionSales(items);
  const snapshot = computeFinanceSnapshot({
    prLoansTotal: settingsResult.data?.pr_loans_total ?? 0,
    outstandingBids,
    expensesTotal,
    paidAuctionSales,
    otherCashOnHand: settingsResult.data?.estate_cash_on_hand ?? 0
  });

  return ok({
    ...snapshot,
    caseNumber: settingsResult.data?.case_number || resolveCaseArg(caseNumber),
    expenses
  });
}

/** Outstanding vs paid auction bid lines for finance card viewers. */
export async function listFinanceAuctionItems(caseNumber) {
  const estate = await resolveOwnedEstate(caseNumber);
  const scoped = assertEstateScoped(estate);
  if (!scoped.ok) return fail(scoped.error);

  let q = supabase
    .from('estate_items')
    .select('id, name, highest_bid, auction_paid_at, approved_for_sale, legal_status')
    .eq('owner_id', estate.userId)
    .not('highest_bid', 'is', null)
    .gt('highest_bid', 0)
    .order('highest_bid', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);

  const { data, error } = await q;

  if (error) return fail(error);

  const outstanding = [];
  const paid = [];
  (data || []).forEach((row) => {
    if (row.auction_paid_at) paid.push(row);
    else outstanding.push(row);
  });

  return ok({ outstanding, paid });
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
  archiveItem,
  deleteItemPermanently,
  getSettings,
  saveSettings,
  listPublicEstates,
  findPublicEstateByName,
  listPublicAuctionSummaries,
  loginWithEstateAccessCode,
  listEstateExpenses,
  addEstateExpense,
  deleteEstateExpense,
  getFinanceSummary,
  listFinanceAuctionItems,
  ensureCaseSettings,
  createReadOnlyShareLink,
  listSiblingAccounts,
  setSiblingPassword,
  setHeirInvitePassword,
  setHeirPersonInvitePassword,
  addHeir,
  setHeirAccessTier,
  renameHeir,
  listHeirNamesForCase,
  removeHeir,
  setHelperPassword,
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
  siblingLogin,
  setPreferredName,
  heirChangePassword,
  siblingListItems,
  siblingRequestItem,
  siblingCancelRequest,
  siblingReleaseForSale,
  siblingListMessages,
  siblingSendMessage,
  siblingMarkMessagesRead,
  listMessageThreads,
  listMessagesForHeir,
  sendAdminMessage,
  markAdminMessagesRead,
  getStoredHelperSession,
  clearHelperSession,
  helperLogin,
  helperListCollections,
  helperCreateItem,
  listSceneCaptures,
  createSceneCapture,
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
