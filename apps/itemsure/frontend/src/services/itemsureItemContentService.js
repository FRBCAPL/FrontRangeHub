import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// How much one counted unit of an item holds ("one bottle holds 750 ml"), so pours in oz or
// ml can be turned into bottles. Stored in ml.

/** Map of item id -> ml in one counted unit. null until the database update is applied. */
export async function listItemContents(organizationId) {
  const { data, error } = await itemsure.from('item_contents').select('item_id, content_ml').eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).map((r) => [r.item_id, Number(r.content_ml)]));
}

/** Only content_ml can be updated, so this updates, else inserts (retrying the update if someone else just inserted). */
export async function saveItemContent(organizationId, itemId, contentMl) {
  const update = async () => assertOk(
    await itemsure.from('item_contents').update({ content_ml: contentMl, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId).eq('item_id', itemId).select('item_id'),
    'save the size',
  ) || [];
  if ((await update()).length) return;
  const { error } = await itemsure.from('item_contents').insert({ item_id: itemId, organization_id: organizationId, content_ml: contentMl });
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, 'save the size');
  await update();
}

export async function removeItemContent(organizationId, itemId) {
  assertOk(await itemsure.from('item_contents').delete().eq('organization_id', organizationId).eq('item_id', itemId), 'clear the size');
}

/** Saves answers from the size review: [{ item, ml } | { item, pieces, label? }]. */
export async function saveSizeAnswers(organizationId, list) {
  for (const a of list) {
    if (a.pieces != null) await saveItemPieces(organizationId, a.item.id, a.pieces, { label: a.label });
    else await saveItemContent(organizationId, a.item.id, Math.round(a.ml * 1000) / 1000);
  }
}

// How many singles one counted unit holds ("one case has 24"), for things counted in cases
// but sold one at a time. Optional piece_label: "portions", "wings", …

const labelMissing = (error) => /piece_label/i.test(error?.message || '') || error?.code === 'PGRST204';

/**
 * Map of item id -> count. Also `.labels` Map(itemId -> 'portions'|…); empty until the
 * piece_label database update is applied. null until sold-singly is applied.
 */
export async function listItemPieces(organizationId) {
  let result = await itemsure.from('item_piece_counts').select('item_id, pieces, piece_label').eq('organization_id', organizationId);
  let withLabels = true;
  if (result.error && labelMissing(result.error)) {
    withLabels = false;
    result = await itemsure.from('item_piece_counts').select('item_id, pieces').eq('organization_id', organizationId);
  }
  if (result.error) return null;
  const counts = new Map((result.data || []).map((r) => [r.item_id, Number(r.pieces)]));
  counts.labels = withLabels
    ? new Map((result.data || []).filter((r) => r.piece_label).map((r) => [r.item_id, r.piece_label]))
    : new Map();
  return counts;
}

export async function removeItemPieces(organizationId, itemId) {
  assertOk(await itemsure.from('item_piece_counts').delete().eq('organization_id', organizationId).eq('item_id', itemId), 'clear how many are in one');
}

/**
 * Updates, else inserts (retrying the update if someone else just inserted).
 * `label` (optional): many-form word like "portions"; '' clears a saved label.
 */
export async function saveItemPieces(organizationId, itemId, pieces, { label } = {}) {
  const setLabel = label !== undefined;
  const piece_label = setLabel ? String(label || '').trim().slice(0, 40) : undefined;
  const stamped = new Date().toISOString();

  const updateOnce = async (fields) => {
    const result = await itemsure.from('item_piece_counts').update(fields)
      .eq('organization_id', organizationId).eq('item_id', itemId).select('item_id');
    if (!result.error) return (result.data || []).length > 0 ? 'ok' : 'missing';
    if (setLabel && labelMissing(result.error)) return 'no-label';
    assertOk(result, 'save how many are in one');
    return 'ok';
  };

  const full = { pieces, updated_at: stamped, ...(setLabel ? { piece_label } : {}) };
  const bare = { pieces, updated_at: stamped };

  let status = await updateOnce(full);
  if (status === 'no-label') status = await updateOnce(bare);
  if (status === 'ok') return;

  const insertFull = { item_id: itemId, organization_id: organizationId, pieces, ...(setLabel ? { piece_label } : {}) };
  let { error } = await itemsure.from('item_piece_counts').insert(insertFull);
  if (error && setLabel && labelMissing(error)) {
    ({ error } = await itemsure.from('item_piece_counts').insert({ item_id: itemId, organization_id: organizationId, pieces }));
  }
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, 'save how many are in one');
  status = await updateOnce(full);
  if (status === 'no-label') await updateOnce(bare);
}
