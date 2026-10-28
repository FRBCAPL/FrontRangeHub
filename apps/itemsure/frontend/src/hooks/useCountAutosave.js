import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { entryKey, persistEntry } from '../services/itemsureCountService.js';
import { checkQuantity, displayQuantity, sameQuantity } from '../utils/itemsureQuantity.js';
import { readDraftBackup, writeDraftBackup } from '../utils/itemsureCountDrafts.js';

const SAVE_DELAY_MS = 700;

function indexEntries(list) {
  return Object.fromEntries((list || []).map((e) => [entryKey(e.item_id, e.storage_area_id), e]));
}

function matchesServer(value, server) {
  return value === '' ? !server : Boolean(server) && sameQuantity(server.quantity_text, value);
}

/**
 * Local edits ("drafts") are kept apart from saved entries until the server
 * confirms them. Draft statuses: pending, saving, invalid, offline, error, conflict.
 */
export default function useCountAutosave({ sessionId, userId, initialEntries, itemsById }) {
  const [entries, setEntriesState] = useState(() => indexEntries(initialEntries));
  const [drafts, setDraftsState] = useState(() => readDraftBackup(userId, sessionId));
  const entriesRef = useRef(entries);
  const draftsRef = useRef(drafts);
  const itemsRef = useRef(itemsById);
  const timers = useRef({});
  const inFlight = useRef({});
  itemsRef.current = itemsById;

  const setEntries = useCallback((update) => {
    entriesRef.current = update(entriesRef.current);
    setEntriesState(entriesRef.current);
  }, []);

  const setDrafts = useCallback(
    (update) => {
      draftsRef.current = update(draftsRef.current);
      setDraftsState(draftsRef.current);
      writeDraftBackup(userId, sessionId, draftsRef.current);
    },
    [userId, sessionId],
  );

  const patchDraft = useCallback(
    (key, patch) => setDrafts((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], ...patch } } : prev)),
    [setDrafts],
  );

  const removeDraft = useCallback(
    (key) =>
      setDrafts((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }),
    [setDrafts],
  );

  const save = useCallback(
    async (key) => {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
      const draft = draftsRef.current[key];
      if (!draft || draft.status === 'conflict' || inFlight.current[key]) return;

      const item = itemsRef.current[draft.itemId];
      if (!item) {
        patchDraft(key, { status: 'error', message: 'This item is not part of the count.' });
        return;
      }
      const check = checkQuantity(draft.text, item.base_precision_scale, item.base_unit_name);
      if (check.error) {
        patchDraft(key, { status: 'invalid', message: check.error });
        return;
      }
      const value = check.empty ? '' : check.value;
      if (matchesServer(value, entriesRef.current[key])) {
        removeDraft(key);
        return;
      }

      inFlight.current[key] = true;
      patchDraft(key, { status: 'saving', message: '' });
      const result = await persistEntry({
        sessionId,
        itemId: draft.itemId,
        storageAreaId: draft.storageAreaId,
        unitId: item.base_unit_id,
        value,
        entryId: draft.entryId,
        baseRevision: draft.baseRevision,
      });
      delete inFlight.current[key];

      if (result.kind === 'saved') {
        setEntries((prev) => {
          const next = { ...prev };
          if (result.entry) next[key] = result.entry;
          else delete next[key];
          return next;
        });
        const latest = draftsRef.current[key];
        if (latest && latest.text === draft.text) {
          removeDraft(key);
        } else if (latest) {
          patchDraft(key, { status: 'pending', baseRevision: result.entry?.revision ?? null, entryId: result.entry?.id ?? null });
          timers.current[key] = setTimeout(() => save(key), 0);
        }
      } else if (result.kind === 'conflict') {
        setEntries((prev) => {
          const next = { ...prev };
          if (result.server) next[key] = result.server;
          else delete next[key];
          return next;
        });
        patchDraft(key, { status: 'conflict', message: '' });
      } else if (result.kind === 'offline') {
        patchDraft(key, { status: 'offline', message: '' });
      } else {
        patchDraft(key, { status: 'error', message: result.message });
      }
    },
    [sessionId, patchDraft, removeDraft, setEntries],
  );

  const setValue = useCallback(
    (itemId, storageAreaId, text) => {
      const key = entryKey(itemId, storageAreaId);
      const existing = draftsRef.current[key];
      const server = entriesRef.current[key];
      const item = itemsRef.current[itemId];
      const check = item ? checkQuantity(text, item.base_precision_scale, item.base_unit_name) : {};
      let status = check.error ? 'invalid' : 'pending';
      if (existing?.status === 'conflict') status = 'conflict';

      setDrafts((prev) => ({
        ...prev,
        [key]: {
          itemId,
          storageAreaId: storageAreaId || null,
          text,
          baseRevision: existing ? existing.baseRevision : server?.revision ?? null,
          entryId: existing ? existing.entryId : server?.id ?? null,
          status,
          message: check.error || '',
        },
      }));

      clearTimeout(timers.current[key]);
      if (status === 'pending') timers.current[key] = setTimeout(() => save(key), SAVE_DELAY_MS);
    },
    [save, setDrafts],
  );

  const flush = useCallback(
    (itemId, storageAreaId) => {
      const key = entryKey(itemId, storageAreaId);
      if (draftsRef.current[key]?.status === 'pending') save(key);
    },
    [save],
  );

  const retryAll = useCallback(() => {
    const keys = Object.keys(draftsRef.current).filter((key) =>
      ['pending', 'offline', 'error'].includes(draftsRef.current[key].status),
    );
    return Promise.all(keys.map(save));
  }, [save]);

  const resolveConflict = useCallback(
    (itemId, storageAreaId, choice) => {
      const key = entryKey(itemId, storageAreaId);
      if (choice === 'theirs') {
        removeDraft(key);
        return;
      }
      const server = entriesRef.current[key];
      patchDraft(key, { status: 'pending', baseRevision: server?.revision ?? null, entryId: server?.id ?? null });
      save(key);
    },
    [patchDraft, removeDraft, save],
  );

  const replaceEntries = useCallback((list) => setEntries(() => indexEntries(list)), [setEntries]);

  // Drafts restored from an earlier visit are retried right away.
  useEffect(() => {
    Object.keys(draftsRef.current).forEach((key) => save(key));
    const onOnline = () => retryAll();
    window.addEventListener('online', onOnline);
    const pendingTimers = timers.current;
    return () => {
      window.removeEventListener('online', onOnline);
      Object.keys(pendingTimers).forEach((key) => {
        clearTimeout(pendingTimers[key]);
        save(key);
      });
    };
  }, [save, retryAll]);

  const hasUnsaved = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!hasUnsaved) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  const summary = useMemo(() => {
    const totals = { pending: 0, saving: 0, invalid: 0, offline: 0, error: 0, conflict: 0, restored: 0 };
    Object.values(drafts).forEach((d) => {
      totals[d.status] = (totals[d.status] || 0) + 1;
      if (d.restored) totals.restored += 1;
    });
    totals.unsaved = Object.keys(drafts).length;
    return totals;
  }, [drafts]);

  const valueFor = useCallback(
    (itemId, storageAreaId) => {
      const key = entryKey(itemId, storageAreaId);
      if (drafts[key]) return drafts[key].text;
      return entries[key] ? displayQuantity(entries[key].quantity_text) : '';
    },
    [drafts, entries],
  );

  return { entries, drafts, summary, valueFor, setValue, flush, retryAll, resolveConflict, replaceEntries };
}
