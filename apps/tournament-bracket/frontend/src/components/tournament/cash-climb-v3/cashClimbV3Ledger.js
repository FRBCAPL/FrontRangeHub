/**
 * Cash Climb V3 ledger. Integer cents throughout; every payout is a whole number of dollars.
 *
 * Each bracket match owns an allocation (opening reserve, preliminary reserve, later-round award or the
 * combined championship allocation); allocations sum to the prize pool. A match pays its entries when it
 * is resolved, never more than its allocation, and whatever it leaves unpaid becomes unawarded money.
 * Settlement either pays unawarded money to the finalists or records it as operator-retained.
 *
 * Every entry has a unique entitlement key, so the same payout can never be posted twice.
 * Invariant at every state: prize pool = earned + unsettled + operator-retained, where unsettled is
 * independently the allocations of unresolved matches plus unawarded money not yet settled.
 */
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function entitlementKey(source, type, playerId) {
  return `${source}:${type}:${playerId}`;
}

export function createLedger({ prizePoolCents, allocations }) {
  const total = sum(Object.values(allocations).map((a) => a.cents));
  if (total !== prizePoolCents) throw new Error(`Match allocations ($${total / 100}) do not equal the prize pool ($${prizePoolCents / 100}).`);
  return { prizePoolCents, allocations: { ...allocations }, resolved: {}, entries: [], operatorRetainedCents: 0 };
}

const paidForMatch = (ledger, matchId) => sum(ledger.entries.filter((e) => e.matchId === matchId).map((e) => e.cents));
const settlementPaid = (ledger) => sum(ledger.entries.filter((e) => e.matchId === null).map((e) => e.cents));

/** Unpaid allocation of resolved matches, less what settlement already paid or retained. */
export function unawardedCents(ledger) {
  const released = sum(Object.keys(ledger.resolved).map((id) => ledger.allocations[id].cents - paidForMatch(ledger, id)));
  return released - settlementPaid(ledger) - ledger.operatorRetainedCents;
}

function checkEntry(e, keys) {
  if (!e.key || keys.has(e.key)) throw new Error(`Duplicate or missing entitlement: ${e.key}.`);
  if (!e.playerId) throw new Error(`Entitlement ${e.key} has no player.`);
  if (!Number.isSafeInteger(e.cents) || e.cents <= 0 || e.cents % 100 !== 0) throw new Error(`Entitlement ${e.key} must be a positive whole-dollar amount.`);
  keys.add(e.key);
}

/** Resolves a match and posts its entries atomically. */
export function resolveMatchInLedger(ledger, matchId, entries) {
  const alloc = ledger.allocations[matchId];
  if (!alloc) throw new Error(`Unknown match ${matchId}.`);
  if (ledger.resolved[matchId]) throw new Error(`Match ${matchId} is already settled in the ledger.`);
  const keys = new Set(ledger.entries.map((e) => e.key));
  entries.forEach((e) => checkEntry(e, keys));
  if (entries.some((e) => e.matchId !== matchId)) throw new Error(`Entries must belong to match ${matchId}.`);
  const paid = sum(entries.map((e) => e.cents));
  if (paid > alloc.cents) throw new Error(`Match ${matchId} would pay $${paid / 100}, more than its $${alloc.cents / 100} allocation.`);
  return { ...ledger, resolved: { ...ledger.resolved, [matchId]: true }, entries: [...ledger.entries, ...entries] };
}

/** Posts settlement entries (matchId null) and/or operator-retained money out of unawarded money. */
export function settleInLedger(ledger, entries, retainedCents = 0) {
  const keys = new Set(ledger.entries.map((e) => e.key));
  entries.forEach((e) => checkEntry(e, keys));
  if (entries.some((e) => e.matchId !== null)) throw new Error('Settlement entries cannot belong to a match.');
  if (!Number.isSafeInteger(retainedCents) || retainedCents < 0) throw new Error('Retained funds cannot be negative.');
  const out = sum(entries.map((e) => e.cents)) + retainedCents;
  if (out > unawardedCents(ledger)) throw new Error('Settlement would pay out more than the unawarded money.');
  return { ...ledger, entries: [...ledger.entries, ...entries], operatorRetainedCents: ledger.operatorRetainedCents + retainedCents };
}

export function ledgerSummary(ledger) {
  const allocs = Object.entries(ledger.allocations);
  const of = (kinds) => sum(allocs.filter(([, a]) => kinds.includes(a.kind)).map(([, a]) => a.cents));
  const earned = sum(ledger.entries.map((e) => e.cents));
  const pending = sum(allocs.filter(([id]) => !ledger.resolved[id]).map(([, a]) => a.cents));
  const unawarded = unawardedCents(ledger);
  const earnedByPlayer = {};
  ledger.entries.forEach((e) => { earnedByPlayer[e.playerId] = (earnedByPlayer[e.playerId] || 0) + e.cents; });
  return {
    prizePoolCents: ledger.prizePoolCents,
    openingReserveCents: of(['preliminary-reserve', 'opening-reserve']),
    laterScheduledCents: of(['later-award', 'championship']),
    earnedCents: earned,
    earnedByPlayer,
    pendingAllocationCents: pending,
    unawardedCents: unawarded,
    finalistBonusPoolCents: unawarded,
    operatorRetainedCents: ledger.operatorRetainedCents,
    unsettledCents: ledger.prizePoolCents - earned - ledger.operatorRetainedCents,
  };
}

/** Plain-English invariant failures. Empty when the ledger reconciles. */
export function ledgerProblems(ledger) {
  const s = ledgerSummary(ledger);
  const problems = [];
  if (s.openingReserveCents + s.laterScheduledCents !== s.prizePoolCents) problems.push('Allocations do not add up to the prize pool.');
  if (s.earnedCents + s.unsettledCents + s.operatorRetainedCents !== s.prizePoolCents) problems.push('Prize pool does not equal earned + unsettled + retained.');
  if (s.unsettledCents !== s.pendingAllocationCents + s.unawardedCents) problems.push('Unsettled balance does not equal pending allocations plus unawarded money.');
  if (s.unsettledCents < 0 || s.unawardedCents < 0 || s.operatorRetainedCents < 0) problems.push('A balance is negative.');
  if (new Set(ledger.entries.map((e) => e.key)).size !== ledger.entries.length) problems.push('Duplicate entitlement keys.');
  Object.entries(ledger.allocations).forEach(([id, a]) => {
    if (paidForMatch(ledger, id) > a.cents) problems.push(`Match ${id} paid more than its allocation.`);
    if (!ledger.resolved[id] && paidForMatch(ledger, id) > 0) problems.push(`Match ${id} paid before it was resolved.`);
  });
  return problems;
}
