// Unsaved count values, backed up on this device so a closed tab or dropped
// connection does not lose them. This is a safety net, not offline support:
// values only count once the server has saved them.

const PREFIX = 'itemsure-count-drafts';

function storageKey(userId, sessionId) {
  return `${PREFIX}:${userId}:${sessionId}`;
}

/** Restored drafts come back as pending so they are retried against the server. */
export function readDraftBackup(userId, sessionId) {
  if (!userId || !sessionId) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId, sessionId)) || '{}');
    const drafts = {};
    Object.entries(parsed).forEach(([key, d]) => {
      if (d && typeof d.text === 'string' && d.itemId) {
        drafts[key] = {
          text: d.text,
          itemId: d.itemId,
          storageAreaId: d.storageAreaId || null,
          entryId: d.entryId || null,
          baseRevision: Number.isInteger(d.baseRevision) ? d.baseRevision : null,
          status: 'pending',
          restored: true,
        };
      }
    });
    return drafts;
  } catch {
    return {};
  }
}

export function writeDraftBackup(userId, sessionId, drafts) {
  if (!userId || !sessionId) return;
  const keep = {};
  Object.entries(drafts).forEach(([key, d]) => {
    keep[key] = {
      text: d.text,
      itemId: d.itemId,
      storageAreaId: d.storageAreaId,
      entryId: d.entryId,
      baseRevision: d.baseRevision,
    };
  });
  try {
    if (Object.keys(keep).length) localStorage.setItem(storageKey(userId, sessionId), JSON.stringify(keep));
    else localStorage.removeItem(storageKey(userId, sessionId));
  } catch {
    // Storage can be full or blocked; the server save path still works.
  }
}

export function clearDraftBackup(userId, sessionId) {
  try {
    localStorage.removeItem(storageKey(userId, sessionId));
  } catch {
    // Ignore blocked storage.
  }
}
