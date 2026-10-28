// Count-time anchor survives edits, offline drafts, reloads, and sync, and
// allows a margin for looking at the shelf before typing.
// Run: node --test apps/itemsure/frontend/tests
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { LOOK_MARGIN_MS, anchorBefore, anchorForDraft, latestServerTime, noteServerTime } =
  await import('../src/utils/itemsureServerTimes.js');
const { readDraftBackup, writeDraftBackup } = await import('../src/utils/itemsureCountDrafts.js');

// Server times, and when each arrived on the device's monotonic timer (ms).
const T1 = '2026-10-28T10:00:00.000001+00:00';
const T2 = '2026-10-28T10:00:20.000001+00:00';
const T3 = '2026-10-28T10:01:30.000001+00:00';
const T4 = '2026-10-28T10:05:00.000001+00:00';
const AT1 = 1000;
const AT2 = 21000;
const AT3 = 91000;

test('before any server reply there is no anchor (server falls back to the count start)', () => {
  assert.equal(latestServerTime(), null);
  assert.equal(anchorForDraft(undefined, 0), null);
});

test('a server time is not used until it is a full margin old', () => {
  noteServerTime(T1, AT1);
  assert.equal(anchorBefore(AT1 + LOOK_MARGIN_MS - 1), null);
  assert.equal(anchorBefore(AT1 + LOOK_MARGIN_MS), T1);
});

test('server time only moves forward', () => {
  noteServerTime(T2, AT2);
  noteServerTime(T1, AT2 + 5);
  noteServerTime('not a time', AT2 + 6);
  noteServerTime(null, AT2 + 7);
  assert.equal(latestServerTime(), T2);
});

test('a new draft takes the latest server time that is at least a margin old', () => {
  noteServerTime(T3, AT3);
  // At AT3 + 10 s: T3 is too recent, T2 arrived 80 s earlier, so T2 anchors.
  assert.equal(anchorForDraft(undefined, AT3 + 10000), T2);
  assert.equal(anchorForDraft(undefined, AT3 + LOOK_MARGIN_MS), T3);
});

test('many quick saves do not push out the margin-old anchor', () => {
  for (let i = 1; i <= 200; i += 1) {
    noteServerTime(new Date(Date.parse(T3) + i * 100).toISOString(), AT3 + LOOK_MARGIN_MS + i * 100);
  }
  assert.equal(anchorBefore(AT3 + LOOK_MARGIN_MS + 20000), T3);
});

test('later keystrokes keep the draft\'s first anchor', () => {
  const draft = { anchorAt: T2 };
  noteServerTime(T4, AT3 + 10 * LOOK_MARGIN_MS);
  assert.equal(anchorForDraft(draft, AT3 + 20 * LOOK_MARGIN_MS), T2);
});

test('a draft started with no anchor is never back-filled with a newer time', () => {
  assert.equal(anchorForDraft({ anchorAt: null }, AT3 + 20 * LOOK_MARGIN_MS), null);
  assert.equal(anchorForDraft({}, AT3 + 20 * LOOK_MARGIN_MS), null);
});

test('offline draft survives a reload with its original anchor', () => {
  const drafts = {
    'item-1:area-1': { itemId: 'item-1', storageAreaId: 'area-1', text: '4', anchorAt: T1, status: 'offline' },
  };
  writeDraftBackup('user-1', 'session-1', drafts);

  const restored = readDraftBackup('user-1', 'session-1');
  const draft = restored['item-1:area-1'];
  assert.equal(draft.anchorAt, T1);
  assert.equal(draft.status, 'pending');
  assert.equal(draft.restored, true);
  assert.equal(anchorForDraft(draft, AT3 + 30 * LOOK_MARGIN_MS), T1, 'editing a restored draft keeps the original anchor');
});

test('a damaged stored anchor becomes "no anchor", never a newer time', () => {
  store.set('itemsure-count-drafts:user-2:session-2', JSON.stringify({
    k: { itemId: 'item-1', text: '3', anchorAt: 12345 },
  }));
  const restored = readDraftBackup('user-2', 'session-2');
  assert.equal(restored.k.anchorAt, null);
});

test('clearing all drafts removes the backup', () => {
  writeDraftBackup('user-1', 'session-1', {});
  assert.equal(store.has('itemsure-count-drafts:user-1:session-1'), false);
});
