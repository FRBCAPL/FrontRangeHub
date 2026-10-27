/**
 * Wording and rules for removing a Cash Climb (V3) tournament. Removing from this tablet never deletes the
 * cloud copy; deleting from the cloud is only for tournaments that have not started, and leaves a tombstone
 * that is never sent again.
 */
const inCloud = (meta) => Boolean(meta?.revision) && !['deleted', 'missing'].includes(meta.state);

export function removalPrompt(record, meta) {
  const name = `"${record.name}"`;
  if (inCloud(meta) && meta.dirty) {
    return `Remove ${name} from this tablet? This tablet has changes the cloud has not received yet; they will be lost. The cloud copy (without those changes) is kept.`;
  }
  if (inCloud(meta)) return `Remove ${name} from this tablet? The cloud copy is kept, and you can open it again from the tournament list.`;
  return `Remove ${name} from this tablet? It is not saved in the cloud, so this cannot be undone.`;
}

export function canDeleteFromCloud(record, meta) {
  return record.status === 'setup' && inCloud(meta) && meta.state !== 'conflict';
}

export function deletePrompt(record) {
  return `Delete "${record.name}" from the cloud? It has not started. Other devices will see it as removed, and it is also removed from this tablet. This cannot be undone.`;
}
