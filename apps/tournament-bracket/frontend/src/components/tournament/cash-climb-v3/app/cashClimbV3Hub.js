/** Cash Climb (V3) entries for the Tournament hub's Current / Completed lists: this tablet's tournaments plus cloud ones. */
import { cashClimbV3HubSummary, CASH_CLIMB_V3_RECORD_TYPE } from './cashClimbV3Record.js';
import { cashClimbV3HubSyncLabel, CLOUD_ONLY_LABEL } from '../cloud/cashClimbV3SyncLabels.js';

/**
 * Valid saved tournaments, unreadable ones (so they are visible; opening one shows why), and cloud
 * tournaments not on this tablet. `cloudRows`: cash_climb_v3_list summaries; `syncStore`: sync bookkeeping.
 * The tablet copy is listed when both exist; its label says whether the cloud has accepted it.
 */
export function listCashClimbV3HubEvents(store, { cloudRows = [], syncStore = null } = {}) {
  const { records, invalid } = store.list();
  const local = new Set([...records.map((r) => r.id), ...invalid.map((i) => i.id)]);
  const label = (id) => (syncStore ? cashClimbV3HubSyncLabel(syncStore.meta(id)) : '');
  return [
    ...records.map((r) => ({ ...cashClimbV3HubSummary(r), syncLabel: label(r.id) })),
    ...invalid.map(({ id }) => ({
      id, name: 'Unreadable Cash Climb event', status: 'setup', type: CASH_CLIMB_V3_RECORD_TYPE, kind: CASH_CLIMB_V3_RECORD_TYPE, updatedAt: '', invalid: true,
    })),
    ...(Array.isArray(cloudRows) ? cloudRows : []).filter((row) => row?.id && !local.has(row.id)).map((row) => ({
      id: row.id, name: row.name || 'Cash Climb', status: row.status, type: CASH_CLIMB_V3_RECORD_TYPE, kind: CASH_CLIMB_V3_RECORD_TYPE,
      tournamentDate: row.event_date || '', updatedAt: row.updated_at || '', cloudOnly: true, syncLabel: CLOUD_ONLY_LABEL,
    })),
  ];
}
