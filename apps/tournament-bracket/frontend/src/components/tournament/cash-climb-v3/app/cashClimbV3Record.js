/**
 * Saved Cash Climb (V3) tournament record: everything needed to restore the exact event.
 *
 *   type 'cash-climb-v3', schemaVersion, id, name, tournamentDate, status, createdAt, updatedAt
 *   players    [{ id, name }] in entry order (ids are the engine's entrant ids)
 *   placement  the bracket placement (a random draw, possibly adjusted by hand; official once started)
 *   draw       optional { method: 'random', adjusted }; absent for placements made entirely by hand
 *   payout     the locked payout: optimizer id, reference and optimized ladders, prize pool, reserves
 *   event      the engine event (configuration, matches with allocations, ledger, settlement)
 *   startedAt / completedAt  set when the tournament starts / is settled
 *
 * The payout ladder is calculated by the approved production optimizer when the record is created, and
 * again only if the operator changes the money settings before the start. A saved record is never
 * re-optimized otherwise: reloading keeps its ladder and optimizer id even after the optimizer changes.
 */
import { cashClimbV3ConfigProblems, CASH_CLIMB_V3_FORMAT } from '../cashClimbV3Config.js';
import { placementProblems } from '../cashClimbV3Bracket.js';
import { cashClimbV3Plan } from '../cashClimbV3Plan.js';
import { createCashClimbV3Event } from '../cashClimbV3Event.js';
import { startCashClimbV3Event } from '../cashClimbV3Progress.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { emptyPlacementPositions } from './cashClimbV3Placement.js';

export const CASH_CLIMB_V3_RECORD_TYPE = CASH_CLIMB_V3_FORMAT;
export const CASH_CLIMB_V3_RECORD_SCHEMA = 1;
export const CASH_CLIMB_V3_STATUSES = Object.freeze(['setup', 'in-progress', 'completed']);

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** Integer cents from a dollar form field; NaN when blank or not a number (validation reports it). */
export function centsFromDollarInput(value) {
  const s = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Engine settings from the setup form (money already in integer cents). */
export function settingsFromSetup(setup) {
  return {
    entrants: Array.isArray(setup?.players) ? setup.players.length : 0,
    entryFeeCents: setup?.entryFeeCents,
    addedMoneyCents: setup?.addedMoneyCents ?? 0,
    raceTo: setup?.raceTo,
    rules: { game: text(setup?.rules?.game), notes: text(setup?.rules?.notes) },
  };
}

/** Optional player details from the Add Player form. Only filled-in ones are saved; they never affect the money. */
export const CASH_CLIMB_V3_PLAYER_DETAILS = Object.freeze(['email', 'league', 'rank', 'fargorate']);

/** A player as saved: id, name and any filled-in details (trimmed, at most 200 characters each). */
export function cleanCashClimbV3Player(p) {
  const out = { id: text(p?.id), name: text(p?.name) };
  CASH_CLIMB_V3_PLAYER_DETAILS.forEach((k) => {
    const v = text(typeof p?.[k] === 'number' ? String(p[k]) : p?.[k]).slice(0, 200);
    if (v) out[k] = v;
  });
  return out;
}

export function playerProblems(players) {
  if (!Array.isArray(players)) return ['Players are missing.'];
  const problems = [];
  const ids = new Set();
  const names = new Set();
  players.forEach((p, i) => {
    const id = text(p?.id);
    const name = text(p?.name);
    if (!id || ids.has(id)) problems.push(`Player ${i + 1} needs a unique id.`);
    if (!name) problems.push(`Player ${i + 1} needs a name.`);
    else if (names.has(name.toLowerCase())) problems.push(`${name} is entered more than once.`);
    ids.add(id);
    names.add(name.toLowerCase());
  });
  return problems;
}

/**
 * The payout plan for the settings, from the production optimizer. Used for the setup preview and,
 * once, to lock a new record's payout. Never called for a saved record.
 */
export function cashClimbV3PayoutPreview(settings) {
  const configProblems = cashClimbV3ConfigProblems(settings);
  if (configProblems.length) return { status: 'invalid', problems: configProblems };
  const plan = cashClimbV3Plan(settings);
  if (plan.status !== 'valid' || plan.ladder.status !== 'valid') {
    return { status: 'invalid', problems: [...(plan.problems || []), ...(plan.ladder?.problems || [])] };
  }
  const { budget } = plan;
  return {
    status: 'valid',
    problems: [],
    optimizerId: plan.ladder.optimizer.id,
    reference: [...plan.ladder.reference],
    ladder: [...plan.ladder.ladder],
    prizePoolCents: budget.prizePool * 100,
    reserves: { mainDollars: budget.reserves.main.dollars, preliminaryDollars: budget.reserves.preliminary.dollars },
    shape: budget.shape,
    counts: [...budget.counts],
  };
}

/** Everything that blocks creating the record. Empty when it can be created. */
export function cashClimbV3SetupProblems(setup) {
  const problems = [];
  if (!text(setup?.name)) problems.push('Enter a tournament name.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(setup?.tournamentDate))) problems.push('Pick the tournament date.');
  problems.push(...playerProblems(setup?.players));
  problems.push(...cashClimbV3ConfigProblems(settingsFromSetup(setup)));
  if (problems.length) return problems;
  const empty = emptyPlacementPositions(setup.placement);
  if (empty === Infinity) return ['Place the players in the bracket.'];
  if (empty > 0) return [`Fill every bracket position (${empty} still empty).`];
  return placementProblems(setup.players.map((p) => text(p.id)), setup.placement);
}

const MONEY_SETTINGS = ['entrants', 'entryFeeCents', 'addedMoneyCents', 'raceTo'];

function buildRecord(setup, { id, now, createdAt = now, lockedPayout = null }) {
  if (!text(id)) return { status: 'invalid', problems: ['A new tournament needs an id.'] };
  const problems = cashClimbV3SetupProblems(setup);
  if (problems.length) return { status: 'invalid', problems };
  const settings = settingsFromSetup(setup);
  const payout = lockedPayout || cashClimbV3PayoutPreview(settings);
  if (payout.status && payout.status !== 'valid') return { status: 'invalid', problems: payout.problems };
  const players = setup.players.map(cleanCashClimbV3Player);
  const placement = structuredClone(setup.placement);
  let event;
  try {
    event = createCashClimbV3Event({ id: text(id), settings, entrantIds: players.map((p) => p.id), placement, ladder: payout.ladder });
  } catch (err) {
    return { status: 'invalid', problems: [err.message] };
  }
  const record = {
    type: CASH_CLIMB_V3_RECORD_TYPE,
    schemaVersion: CASH_CLIMB_V3_RECORD_SCHEMA,
    id: text(id),
    name: text(setup.name),
    tournamentDate: text(setup.tournamentDate),
    status: 'setup',
    createdAt,
    updatedAt: now,
    players,
    placement,
    ...(setup.draw ? { draw: { method: 'random', adjusted: Boolean(setup.draw.adjusted) } } : {}),
    payout: {
      optimizerId: payout.optimizerId,
      reference: [...payout.reference],
      ladder: [...payout.ladder],
      prizePoolCents: payout.prizePoolCents,
      reserves: { ...payout.reserves },
      lockedAt: lockedPayout ? lockedPayout.lockedAt : now,
    },
    event: JSON.parse(JSON.stringify(event)),
  };
  return { status: 'valid', record };
}

/**
 * @param setup { name, tournamentDate, players, entryFeeCents, addedMoneyCents, raceTo, rules, placement, draw? }
 *   `draw` { adjusted } marks a random draw (optionally adjusted by hand); without it the placement is manual.
 * @returns { status: 'valid', record } | { status: 'invalid', problems }
 */
export function createCashClimbV3Record(setup, { id, now = new Date().toISOString() } = {}) {
  return buildRecord(setup, { id, now });
}

/**
 * Replaces an unstarted tournament's setup (players, money, rules, draw). When the money settings are
 * unchanged the saved payout is kept exactly, never re-optimized; when they change, the operator has
 * reviewed a new preview and the production optimizer calculates the new payout.
 */
export function updateCashClimbV3Setup(record, setup, { now = new Date().toISOString() } = {}) {
  const locked = cashClimbV3SetupChangeProblems(record);
  if (locked.length) return { status: 'invalid', problems: locked };
  const settings = settingsFromSetup(setup);
  const unchanged = MONEY_SETTINGS.every((k) => settings[k] === record.event.config[k]);
  return buildRecord(setup, { id: record.id, now, createdAt: record.createdAt, lockedPayout: unchanged ? record.payout : null });
}

/** True when the money settings in `setup` would give a different payout than the saved one. */
export function cashClimbV3PayoutChanges(record, setup) {
  const settings = settingsFromSetup(setup);
  return !MONEY_SETTINGS.every((k) => settings[k] === record.event.config[k]);
}

/** True once the configuration, placement or payout can no longer change. */
export function cashClimbV3SetupLocked(record) {
  if (record.status !== 'setup') return true;
  return Object.keys(record.event.ledger.resolved).length > 0 || record.event.ledger.entries.length > 0 || record.event.settlement !== null;
}

/** Every setup change is refused once the event is locked; before the start, setup may be edited. */
export function cashClimbV3SetupChangeProblems(record) {
  return cashClimbV3SetupLocked(record) ? ['This tournament has started; its settings, placement and payouts are locked.'] : [];
}

/** Moves an unstarted record into play, keeping its locked payout. */
export function startCashClimbV3Record(record, { now = new Date().toISOString() } = {}) {
  if (record.status !== 'setup') throw new Error('Only a tournament in setup can be started.');
  return { ...record, status: 'in-progress', startedAt: now, updatedAt: now, event: startCashClimbV3Event(record.event) };
}

/** Hub list entry for the Current / Completed screens. */
export function cashClimbV3HubSummary(record) {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    type: CASH_CLIMB_V3_RECORD_TYPE,
    kind: CASH_CLIMB_V3_RECORD_TYPE,
    tournamentDate: record.tournamentDate,
    updatedAt: record.updatedAt,
    prizePoolCents: ledgerSummary(record.event.ledger).prizePoolCents,
    tournament: record,
  };
}
