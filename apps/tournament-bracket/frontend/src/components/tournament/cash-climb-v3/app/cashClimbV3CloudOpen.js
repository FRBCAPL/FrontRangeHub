/**
 * Opens a Cash Climb (V3) tournament that is in the cloud but not on this tablet: the cloud copy must
 * restore exactly (record checks and engine replay) before it is saved on the tablet; it is never repaired.
 */
import { cloudMessage } from '../cloud/cashClimbV3CloudApi.js';
import { restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';

/** @returns { status: 'ok' } | { status: 'missing' } | { status: 'invalid', problems } | { status: 'error', message } */
export async function openCashClimbV3FromCloud({ cloud, store, syncStore, id, now = () => new Date().toISOString() }) {
  const res = await cloud.load(id);
  if (res.error) return { status: 'error', message: cloudMessage(res.code) };
  const row = res.data;
  if (!row) return { status: 'missing' };
  if (row.deleted) return { status: 'error', message: cloudMessage('deleted') };
  const restored = restoreCashClimbV3Record(row.payload);
  if (restored.status !== 'ok') return { status: 'invalid', problems: restored.problems };
  const saved = store.save(row.payload);
  if (saved.error) return { status: 'error', message: saved.error };
  syncStore.saveMeta(id, { revision: row.revision, dirty: false, syncedAt: now(), state: 'synced', error: '' });
  return { status: 'ok' };
}
