/** Operator wording for each Cash Climb (V3) sync state. Never says "backed up" unless the cloud accepted the copy. */
const LABELS = {
  idle: 'Checking the cloud…',
  'local-only': 'Saved on this tablet only',
  'needs-approval': 'Not uploaded \u2014 review needed',
  sending: 'Sending…',
  synced: 'Synced',
  offline: 'Offline \u2014 changes pending',
  conflict: 'Conflict',
  deleted: 'Removed in cloud',
  missing: 'Cloud copy missing',
  'update-required': 'Update required',
  error: 'Cloud error',
};

export function cashClimbV3SyncLabel(state) {
  return LABELS[state] || LABELS.error;
}

/** Hub label from the per-tournament bookkeeping: an accepted copy with newer tablet changes is not "Synced". */
export function cashClimbV3HubSyncLabel(meta) {
  if (!meta) return LABELS['local-only'];
  if (meta.state === 'synced' && meta.dirty) return 'Changes not sent yet';
  if (meta.state === 'sending' || meta.state === 'idle') return meta.revision ? (meta.dirty ? 'Changes not sent yet' : LABELS.synced) : LABELS['local-only'];
  return cashClimbV3SyncLabel(meta.state);
}

export const CLOUD_ONLY_LABEL = 'In the cloud (not on this tablet)';
