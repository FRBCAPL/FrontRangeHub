/**
 * Estate Vault — progress timeline.
 *
 * Derives a first-time executor's "where am I in the process?" checklist from
 * data the app already stores (settings dates + a couple of counts). Pure and
 * side-effect free so it can be unit tested and reused in exports later.
 */

import {
  resolveProbateWindow,
  resolveAuctionWindow,
  formatEstateLocalDate
} from './estateInventoryConstants.js';

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmt(value) {
  const d = toDate(value);
  return d ? formatEstateLocalDate(d) : null;
}

/**
 * @param {object} params
 * @param {object} params.settings estate_settings row
 * @param {number} [params.inventoryCount] rooms or items recorded (>0 = started)
 * @param {boolean} [params.hasAuctionActivity] any bids / paid sales recorded
 * @param {Date}   [params.now]
 * @returns {{ steps: Array, completedCount: number, totalCount: number, activeKey: string|null }}
 */
export function buildEstateTimeline({
  settings = {},
  inventoryCount = 0,
  hasAuctionActivity = false,
  now = new Date()
} = {}) {
  const probate = resolveProbateWindow(settings);
  const auction = resolveAuctionWindow(settings, now);
  const lettersDate = fmt(settings.letters_issued_at);
  const probateEnded = probate.end ? now > probate.end : false;
  const closedDate = fmt(settings.closed_at);

  // Each step decides only whether it is "done" from its own data.
  const defs = [
    {
      key: 'case_opened',
      title: 'Case opened',
      done: true,
      note: fmt(settings.created_at)
        ? `Started ${fmt(settings.created_at)}`
        : 'Estate record created'
    },
    {
      key: 'letters',
      title: 'Letters received',
      done: Boolean(settings.letters_issued_at),
      note: lettersDate
        ? `Issued ${lettersDate}`
        : 'Add the date the court issued your Letters'
    },
    {
      key: 'inventory',
      title: 'Inventory started',
      done: Number(inventoryCount) > 0,
      note:
        Number(inventoryCount) > 0
          ? `${inventoryCount} room/collection(s) recorded`
          : 'Add rooms and items to build the inventory'
    },
    {
      key: 'claims_window',
      title: 'Claims / probate window',
      done: probateEnded,
      note: probate.needsLetters
        ? 'Set the Letters date to start the countdown'
        : probate.needsEndDate
          ? 'Set a probate end date in Settings'
          : probate.end
            ? probateEnded
              ? `Window closed ${fmt(probate.end)}`
              : `Open until ${fmt(probate.end)}`
            : 'Probate window not configured'
    },
    {
      key: 'auction',
      title: 'Auction',
      done: auction.phase === 'ended',
      note:
        auction.phase === 'ended' ||
        auction.phase === 'open' ||
        auction.phase === 'upcoming'
          ? auction.label
          : hasAuctionActivity
            ? 'Bids recorded'
            : 'Optional \u2014 set auction dates if you will sell items'
    },
    {
      key: 'closed',
      title: 'Estate closed',
      done: Boolean(settings.closed_at),
      note: closedDate ? `Closed ${closedDate}` : 'Final step once everything is distributed'
    }
  ];

  // The active step is the first one that is not yet done.
  const firstOpen = defs.findIndex((s) => !s.done);
  const steps = defs.map((s, i) => ({
    key: s.key,
    title: s.title,
    note: s.note,
    status: s.done ? 'done' : i === firstOpen ? 'active' : 'upcoming'
  }));

  const completedCount = defs.filter((s) => s.done).length;
  return {
    steps,
    completedCount,
    totalCount: defs.length,
    activeKey: firstOpen >= 0 ? defs[firstOpen].key : null
  };
}
