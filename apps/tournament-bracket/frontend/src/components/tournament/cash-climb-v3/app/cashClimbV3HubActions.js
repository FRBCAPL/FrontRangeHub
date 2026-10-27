/** Tournament hub actions for Cash Climb (V3): list this tablet's and the cloud's tournaments, remove from this tablet. */
import { listCashClimbV3HubEvents } from './cashClimbV3Hub.js';
import { removalPrompt } from './cashClimbV3Removal.js';

/** Cloud summaries are added only when the cloud answers; otherwise the tablet's tournaments are listed alone. */
export async function listCashClimbV3ForHub({ cloud, store, syncStore }) {
  let cloudRows = [];
  try {
    const res = await cloud.list();
    if (!res.error && Array.isArray(res.data)) cloudRows = res.data;
  } catch {
    cloudRows = [];
  }
  return listCashClimbV3HubEvents(store, { cloudRows, syncStore });
}

/** Removes the tablet copy only (the cloud copy is never deleted from here). Returns true when removed. */
export function removeCashClimbV3FromHub(item, { store, syncStore, confirm, alert }) {
  if (!item?.id) return false;
  if (item.cloudOnly) {
    alert(`"${item.name}" is in the cloud, not on this tablet, so there is nothing to remove here. To delete a tournament that has not started, open it and choose Delete from cloud.`);
    return false;
  }
  const loaded = store.load(item.id);
  const prompt = loaded.status === 'ok'
    ? removalPrompt(loaded.record, syncStore.meta(item.id))
    : `Remove "${item.name}" from this tablet? This cannot be undone.`;
  if (!confirm(prompt)) return false;
  const removed = store.remove(item.id);
  if (removed.error) { alert(removed.error); return false; }
  syncStore.forget(item.id);
  return true;
}
