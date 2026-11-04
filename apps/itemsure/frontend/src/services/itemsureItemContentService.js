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

/** Saves answers from the size review: [{ item, ml } | { item, pieces }]. */
export async function saveSizeAnswers(organizationId, list) {
  for (const a of list) {
    if (a.pieces != null) await saveItemPieces(organizationId, a.item.id, a.pieces);
    else await saveItemContent(organizationId, a.item.id, Math.round(a.ml * 1000) / 1000);
  }
}

// How many singles one counted unit holds ("one case has 24"), for things counted in cases
// but sold one at a time.

/** Map of item id -> singles in one counted unit. null until the database update is applied. */
export async function listItemPieces(organizationId) {
  const { data, error } = await itemsure.from('item_piece_counts').select('item_id, pieces').eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).map((r) => [r.item_id, Number(r.pieces)]));
}

export async function removeItemPieces(organizationId, itemId) {
  assertOk(await itemsure.from('item_piece_counts').delete().eq('organization_id', organizationId).eq('item_id', itemId), 'clear how many are in one');
}

/** Updates, else inserts (retrying the update if someone else just inserted). */
export async function saveItemPieces(organizationId, itemId, pieces) {
  const update = async () => assertOk(
    await itemsure.from('item_piece_counts').update({ pieces, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId).eq('item_id', itemId).select('item_id'),
    'save how many are in one',
  ) || [];
  if ((await update()).length) return;
  const { error } = await itemsure.from('item_piece_counts').insert({ item_id: itemId, organization_id: organizationId, pieces });
  if (!error) return;
  if (error.code !== '23505') assertOk({ error }, 'save how many are in one');
  await update();
}
