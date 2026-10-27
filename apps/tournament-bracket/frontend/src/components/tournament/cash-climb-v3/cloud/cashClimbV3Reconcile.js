/**
 * Deterministic comparison of the tablet copy and the cloud copy of one Cash Climb (V3) tournament.
 * Nothing here merges records or touches money: it only decides whether one copy already contains
 * everything the other has, and describes the differences for the operator.
 *
 *   'same'            identical apart from the updatedAt stamp
 *   'cloud-contains'  the cloud has every tablet result, ledger entry and locked setting (plus maybe more)
 *   'tablet-contains' the tablet has every cloud result, ledger entry and locked setting (plus more)
 *   'diverged'        each copy has something the other lacks, or they disagree
 */
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { sameJson, stableJson } from './cashClimbV3CloudRules.js';
import { matchTitle, resultText } from '../app/cashClimbV3View.js';

const LIVE = ['status', 'result', 'winner'];
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !keys.includes(k)));
const live = (m) => [m?.status ?? null, m?.result ?? null, m?.winner ?? null];

/** Everything fixed at the start: setup, payout, bracket and allocations (no results, no timestamps). */
function setupView(r) {
  const { event } = r;
  return {
    top: omit(r, ['status', 'updatedAt', 'startedAt', 'completedAt', 'event']),
    event: omit(event, ['matches', 'ledger', 'settlement']),
    ledger: omit(event.ledger, ['entries', 'resolved', 'operatorRetainedCents']),
    matches: Object.fromEntries(Object.entries(event.matches).map(([id, m]) => [id, omit(m, LIVE)])),
  };
}

const sameCopy = (a, b) => sameJson(omit(a, ['updatedAt']), omit(b, ['updatedAt']));

/** True when `a` holds every piece of progress in `b` without changing any of it. */
export function containsCopy(a, b) {
  if (sameCopy(a, b)) return true;
  if (b.status === 'completed' || a.status === 'setup') return false;
  if (!sameJson(setupView(a), setupView(b))) return false;
  if (b.status === 'setup') return true;
  if (a.startedAt !== b.startedAt) return false;
  const am = a.event.matches;
  const bm = b.event.matches;
  if (Object.keys(bm).some((id) => bm[id].status !== 'open' && !sameJson(live(bm[id]), live(am[id])))) return false;
  const aEntries = new Set(a.event.ledger.entries.map(stableJson));
  if (b.event.ledger.entries.some((e) => !aEntries.has(stableJson(e)))) return false;
  return Object.keys(b.event.ledger.resolved).every((k) => sameJson(b.event.ledger.resolved[k], a.event.ledger.resolved[k]));
}

export function compareCopies(tablet, cloud) {
  if (sameCopy(tablet, cloud)) return 'same';
  if (containsCopy(cloud, tablet)) return 'cloud-contains';
  if (containsCopy(tablet, cloud)) return 'tablet-contains';
  return 'diverged';
}

const nameOf = (record, id) => record.players.find((p) => p.id === id)?.name || id || '';

function describe(record, m) {
  if (!m || m.status === 'open') return { status: 'open', text: 'No result' };
  return { status: m.status, text: resultText(record, m) || m.status };
}

/**
 * What differs, for the conflict screen: match results (with who has them), each player's earnings, and
 * whether the tablet has results the cloud lacks (they would need to be re-entered after using the cloud copy).
 */
export function copyDifferences(tablet, cloud) {
  const setupOnly = tablet.status === 'setup' && cloud.status === 'setup';
  const matches = [];
  if (!setupOnly) {
    tablet.event.order.forEach((id) => {
      const t = tablet.event.matches[id];
      const c = cloud.event.matches[id];
      if (sameJson(live(t), live(c))) return;
      const side = t?.status === 'open' ? 'cloud-only' : (!c || c.status === 'open') ? 'tablet-only' : 'different';
      matches.push({ id, label: t ? matchTitle(t) : id, side, tablet: describe(tablet, t), cloud: describe(cloud, c) });
    });
  }
  const te = ledgerSummary(tablet.event.ledger).earnedByPlayer;
  const ce = ledgerSummary(cloud.event.ledger).earnedByPlayer;
  const ids = [...new Set([...Object.keys(te), ...Object.keys(ce)])];
  const earnings = ids
    .filter((id) => (te[id] || 0) !== (ce[id] || 0))
    .map((id) => ({ playerId: id, name: nameOf(tablet, id) || nameOf(cloud, id), tabletCents: te[id] || 0, cloudCents: ce[id] || 0 }));
  const tabletOnly = matches.filter((m) => m.side !== 'cloud-only').map((m) => m.id);
  const tabletSettlementOnly = Boolean(tablet.event.settlement) && !sameJson(tablet.event.settlement, cloud.event.settlement);
  return {
    setupOnly,
    setupDiffers: !sameJson(setupView(tablet), setupView(cloud)),
    matches,
    earnings,
    tabletOnly,
    tabletSettlementOnly,
    needsAcknowledgment: tabletOnly.length > 0 || tabletSettlementOnly,
  };
}
