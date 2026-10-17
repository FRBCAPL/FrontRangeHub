/** Opening and removing a Showdown from the Tournament hub lists. */
import { loadShowdown, saveShowdown, archiveShowdown, removeArchivedShowdown } from '../operator/showdownStore.js';
import { loadSyncMeta, saveSyncMeta } from './showdownSyncStore.js';
import { cloudMessage } from './showdownCloudApi.js';
import { showdownSummaryFromRow } from './showdownHub.js';

export async function listShowdownsForHub(api) {
  const res = await api.list();
  return Array.isArray(res.data) ? res.data.map(showdownSummaryFromRow).filter(Boolean) : [];
}

/**
 * Puts the chosen event on this tablet. The event already here is kept in Past events
 * (and stays in the cloud if it was saved), so switching never loses it.
 * Returns true when the Showdown screen should open.
 */
export async function openShowdownFromHub(api, item, { confirm = (m) => window.confirm(m), alert = (m) => window.alert(m) } = {}) {
  const local = loadShowdown();
  if (local && String(local.id) === String(item.id)) return true;
  if (local && local.status !== 'completed') {
    const unsent = loadSyncMeta(local.id).dirty ? ' It has changes not yet saved to the cloud; they stay on this tablet in Past events.' : '';
    if (!confirm(`Switch this tablet to "${item.name}"? "${local.name}" is kept in Past events on this tablet.${unsent}`)) return false;
  }
  const res = await api.load(item.id);
  if (!res.data?.payload) {
    alert(`Could not open "${item.name}" from the cloud. ${res.error ? cloudMessage(res.code) : 'It is no longer saved.'}`);
    return false;
  }
  if (local) archiveShowdown(local);
  saveShowdown(res.data.payload);
  saveSyncMeta(item.id, { version: res.data.version, dirty: false, syncedAt: new Date().toISOString() });
  return true;
}

/**
 * Closes an obsolete test event: its cloud copy is deleted so phones and the TV stop listing it,
 * and the tablet copy moves to Past events. Returns '' on success or a message to show.
 */
export async function closeObsoleteShowdown(api, state) {
  const res = await api.remove(state.id);
  if (res.error && res.code !== 'unavailable') return `The cloud copy was not removed. ${cloudMessage(res.code)}`;
  archiveShowdown(state);
  const local = loadShowdown();
  if (local && String(local.id) === String(state.id)) saveShowdown(null);
  return '';
}

/** Removes the event from the cloud and this tablet after the operator confirms. */
export async function removeShowdownFromHub(api, item, { confirm = (m) => window.confirm(m), alert = (m) => window.alert(m) } = {}) {
  if (!confirm(`Remove "${item.name}" from the database and this tablet? This cannot be undone.`)) return false;
  const res = await api.remove(item.id);
  if (res.error && res.code !== 'unavailable') {
    alert(`"${item.name}" was not removed. ${cloudMessage(res.code)}`);
    return false;
  }
  const local = loadShowdown();
  if (local && String(local.id) === String(item.id)) saveShowdown(null);
  removeArchivedShowdown(item.id);
  return true;
}
