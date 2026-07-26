import { supabase } from '../config/supabase.js';
import {
  CASE_NUMBER,
  LEGAL_STATUS
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
  'id, collection_id, owner_id, name, notes, photo_url, photo_urls, legal_status, value_tier, is_memorandum_asset, assigned_beneficiary, photo_captured_at, photo_received_at, photo_gps_lat, photo_gps_lng, disputed_at, distributed_at, sibling_claims, approved_for_sale, highest_bid, highest_bidder_name, highest_bidder_email, highest_bidder_phone, bid_updated_at, auction_paid_at, review_status, created_by_role, created_by_name, reviewed_at, is_approved_by_pr, change_history, created_at, updated_at';

const SIBLING_SESSION_KEY = 'estate-sibling-session';
const ADMIN_UNLOCK_KEY = 'estate-admin-unlocked';
const HELPER_SESSION_KEY = 'estate-helper-session';
const AUCTION_BIDDER_KEY = 'estate-auction-bidder';
const ADMIN_MUST_CHANGE_KEY = 'estate-admin-must-change-password';

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

export async function listCollections() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data: collections, error } = await supabase
    .from('estate_collections')
    .select('id, name, created_at, updated_at')
    .eq('owner_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return fail(error);

  const { data: items, error: itemsError } = await supabase
    .from('estate_items')
    .select('collection_id')
    .eq('owner_id', auth.userId);

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

export async function createCollection(name) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  const trimmed = (name || '').trim();
  if (!trimmed) return fail('Collection name is required.');

  const { data, error } = await supabase
    .from('estate_collections')
    .insert({ owner_id: auth.userId, name: trimmed })
    .select('id, name, created_at, updated_at')
    .single();

  if (error) return fail(error);
  return ok({ ...data, itemCount: 0 });
}

export async function getCollection(collectionId) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_collections')
    .select('id, name, created_at, updated_at')
    .eq('id', collectionId)
    .eq('owner_id', auth.userId)
    .maybeSingle();

  if (error) return fail(error);
  if (!data) return fail('Collection not found.');
  return ok(data);
}

export async function listItems(collectionId) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_items')
    .select(ITEM_SELECT)
    .eq('owner_id', auth.userId)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (error) return fail(error);
  return ok(data || []);
}

export async function listAllItemsWithRooms() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const collectionsResult = await listCollections();
  if (!collectionsResult.success) return collectionsResult;
  const roomById = Object.fromEntries((collectionsResult.data || []).map((c) => [c.id, c.name]));

  const { data, error } = await supabase
    .from('estate_items')
    .select(ITEM_SELECT)
    .eq('owner_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return fail(error);

  return ok(
    (data || []).map((item) => ({
      ...item,
      room: roomById[item.collection_id] || 'Unassigned'
    }))
  );
}

function buildItemInsertPayload(authUserId, collectionId, input, meta) {
  const legalStatus = input?.legalStatus || LEGAL_STATUS.secured;
  const now = new Date().toISOString();
  return {
    owner_id: authUserId,
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
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const itemName = (input?.name || '').trim();
  if (!itemName) return fail('Item name is required.');

  let collectionId = input?.collectionId || null;
  if (!collectionId) {
    const newName = (input?.newCollectionName || '').trim();
    if (!newName) return fail('Pick a room/collection or create a new one.');
    const created = await createCollection(newName);
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

  const { data: item, error } = await supabase
    .from('estate_items')
    .insert(buildItemInsertPayload(auth.userId, collectionId, { ...input, name: itemName }, meta))
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
    const uploaded = await uploadPhotoAtPath(auth.userId, `${item.id}_${i}.jpg`, files[i]);
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
    .eq('owner_id', auth.userId)
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

export async function ensureCaseSettings() {
  const existing = await getSettings();
  if (!existing.success) return existing;
  if (existing.data?.case_number && existing.data.owner_id) {
    // Persist row so sibling login can resolve the case
    const saved = await saveSettings({
      lettersIssuedAt: existing.data.letters_issued_at,
      caseNumber: existing.data.case_number || CASE_NUMBER
    });
    return saved;
  }
  return existing;
}

export async function listSiblingAccounts() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);
  const { data, error } = await supabase
    .from('estate_sibling_accounts')
    .select('sibling_key, display_name, updated_at')
    .eq('owner_id', auth.userId)
    .order('display_name', { ascending: true });
  if (error) return fail(error);
  return ok(data || []);
}

/** @deprecated Use setHeirInvitePassword + addHeir instead */
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

export async function setHeirInvitePassword(password) {
  const { data, error } = await supabase.rpc('estate_set_heir_invite_password', {
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function addHeir(displayName) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter the person’s name (at least 2 characters).');
  }
  const { data, error } = await supabase.rpc('estate_add_heir', {
    p_display_name: name
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
}

export async function renameHeir(siblingKey, displayName) {
  const name = String(displayName || '').trim();
  if (name.length < 2) {
    return fail('Enter a name (at least 2 characters).');
  }
  const { data, error } = await supabase.rpc('estate_rename_heir', {
    p_sibling_key: siblingKey,
    p_display_name: name
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

export async function removeHeir(siblingKey) {
  const { data, error } = await supabase.rpc('estate_remove_heir', {
    p_sibling_key: siblingKey
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

export async function setAdminPassword(currentPassword, newPassword) {
  const { data, error } = await supabase.rpc('estate_set_admin_password', {
    p_current: currentPassword,
    p_new: newPassword
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
  const session = {
    token: data.token,
    sibling_key: data.sibling_key,
    display_name: data.display_name,
    case_number: data.case_number,
    expires_at: data.expires_at,
    must_change_password: Boolean(data.must_change_password)
  };
  try {
    localStorage.setItem(SIBLING_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  return ok(session);
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
  return ok({
    sibling_key: data.sibling_key,
    display_name: data.display_name,
    letters_issued_at: data.letters_issued_at || null,
    case_number: data.case_number || CASE_NUMBER,
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

export async function listAuctionItems() {
  const { data, error } = await supabase
    .from('estate_items')
    .select(
      'id, name, notes, photo_url, photo_urls, value_tier, legal_status, highest_bid, highest_bidder_name, collection_id, approved_for_sale'
    )
    .eq('approved_for_sale', true)
    .eq('review_status', 'approved')
    .not('legal_status', 'in', '(claimed_memorandum,disputed,distributed,archived,unauthorized_removal)')
    .order('created_at', { ascending: false });

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
      room: rooms[item.collection_id] || 'Estate'
    }))
  );
}

export async function placeAuctionBid({ itemId, amount, sessionToken }) {
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
  const ownership = await isLoggedInEstateOwner();
  if (ownership.success && ownership.data === true) {
    return fail(
      'Your Hub account owns this estate inventory — you may not place public auction bids.'
    );
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

export async function getSettings() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_settings')
    .select(
      'owner_id, case_number, letters_issued_at, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, created_at, updated_at'
    )
    .eq('owner_id', auth.userId)
    .maybeSingle();

  if (error) return fail(error);
  if (!data) {
    return ok({
      owner_id: auth.userId,
      case_number: CASE_NUMBER,
      letters_issued_at: null,
      auction_pickup_window: null,
      pr_auction_block_emails: null,
      pr_loans_total: 0,
      estate_cash_on_hand: 0
    });
  }
  return ok(data);
}

export async function saveSettings({
  lettersIssuedAt,
  caseNumber,
  auctionPickupWindow,
  prAuctionBlockEmails,
  prLoansTotal,
  estateCashOnHand
} = {}) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const row = {
    owner_id: auth.userId,
    updated_at: new Date().toISOString()
  };

  if (caseNumber != null) {
    row.case_number = String(caseNumber).trim() || CASE_NUMBER;
  }
  if (lettersIssuedAt !== undefined) {
    row.letters_issued_at = lettersIssuedAt || null;
  }
  if (auctionPickupWindow != null) {
    row.auction_pickup_window = String(auctionPickupWindow).trim() || null;
  }
  if (prAuctionBlockEmails != null) {
    row.pr_auction_block_emails = String(prAuctionBlockEmails).trim() || null;
  }
  if (prLoansTotal != null && prLoansTotal !== '') {
    const n = Number(prLoansTotal);
    if (!Number.isNaN(n)) row.pr_loans_total = n;
  }
  if (estateCashOnHand != null && estateCashOnHand !== '') {
    const n = Number(estateCashOnHand);
    if (!Number.isNaN(n)) row.estate_cash_on_hand = n;
  }

  const { data, error } = await supabase
    .from('estate_settings')
    .upsert(row, { onConflict: 'owner_id' })
    .select(
      'owner_id, case_number, letters_issued_at, auction_pickup_window, pr_auction_block_emails, pr_loans_total, estate_cash_on_hand, created_at, updated_at'
    )
    .single();

  if (error) return fail(error);
  return ok(data);
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

export async function listPendingReviewItems() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_items')
    .select(ITEM_SELECT)
    .eq('owner_id', auth.userId)
    .eq('review_status', 'pending_pr_review')
    .order('created_at', { ascending: false });

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

export async function setHelperPassword(password) {
  const { data, error } = await supabase.rpc('estate_set_helper_password', {
    p_password: password
  });
  const failed = rpcFail(data, error);
  if (failed) return failed;
  return ok(data);
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
  if (failed) return failed;
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

/** Admin-only: list estate expense rows (RLS restricts to owner). */
export async function listEstateExpenses() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_expenses')
    .select('id, owner_id, expense_name, amount, date_paid, receipt_url, created_at, updated_at')
    .eq('owner_id', auth.userId)
    .order('date_paid', { ascending: false });

  if (error) return fail(error);
  return ok(data || []);
}

export async function addEstateExpense({ expenseName, amount, datePaid, receiptUrl } = {}) {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const name = String(expenseName || '').trim();
  const amt = Number(amount);
  if (name.length < 1) return fail('Expense name is required.');
  if (!Number.isFinite(amt) || amt < 0) return fail('Enter a valid expense amount.');

  const { data, error } = await supabase
    .from('estate_expenses')
    .insert({
      owner_id: auth.userId,
      expense_name: name,
      amount: amt,
      date_paid: datePaid || new Date().toISOString(),
      receipt_url: String(receiptUrl || '').trim() || null
    })
    .select('id, owner_id, expense_name, amount, date_paid, receipt_url, created_at, updated_at')
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
export async function getFinanceSummary() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const [settingsResult, expensesResult, itemsResult] = await Promise.all([
    getSettings(),
    listEstateExpenses(),
    supabase
      .from('estate_items')
      .select('id, highest_bid, legal_status, approved_for_sale, auction_paid_at')
      .eq('owner_id', auth.userId)
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
    caseNumber: settingsResult.data?.case_number || CASE_NUMBER,
    expenses
  });
}

/** Outstanding vs paid auction bid lines for finance card viewers. */
export async function listFinanceAuctionItems() {
  const auth = await requireUserId();
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await supabase
    .from('estate_items')
    .select('id, name, highest_bid, auction_paid_at, approved_for_sale, legal_status')
    .eq('owner_id', auth.userId)
    .not('highest_bid', 'is', null)
    .gt('highest_bid', 0)
    .order('highest_bid', { ascending: false });

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
  addHeir,
  renameHeir,
  listHeirNamesForCase,
  removeHeir,
  setHelperPassword,
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
  heirChangePassword,
  siblingListItems,
  siblingRequestItem,
  siblingCancelRequest,
  getStoredHelperSession,
  clearHelperSession,
  helperLogin,
  helperListCollections,
  helperCreateItem,
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
