/**
 * "Use these settings": one final, fitting recommendation → a one-time prefill for the existing setup
 * screens. Only setting values cross over. Players, simulated runs, payouts and event ids never do,
 * and nothing is written anywhere: the operator still reviews, edits and starts through normal setup.
 */
import { eligibilityProblems } from './builderEligibility.js';
import { venuePreset, DEFAULT_PRESET_ID } from '../showdown/showdownVenuePresets.js';

const FITTING = new Set(['comfortable', 'tight']);
const INPUT_KEYS = ['entrants', 'tables', 'entryFee', 'targetMin'];

/** The "Other…" table input on CashClimbSetup has max="48", so the browser refuses more at submit. */
export const CASH_CLIMB_MAX_TABLES = 48;

const showdownTables = () => venuePreset(DEFAULT_PRESET_ID)?.tableRange || { min: 1, max: 12 };

/** Cards that may offer the action: best overall, the fuller event and the best of each other format. */
export function offeredOptions(rec) {
  if (!rec || rec.nothingFits) return [];
  return [rec.primary, rec.fullerEvent, ...(rec.alternatives || [])].filter(Boolean);
}

const sameInputs = (a, b) => INPUT_KEYS.every((k) => a?.[k] === b?.[k]);

/** Values the setup screens have no control for. */
function screenProblems(m, { tables, entryFee }) {
  if (m.family === 'cash-climb') {
    const problems = [];
    if (tables > CASH_CLIMB_MAX_TABLES) problems.push(`The Cash Climb King of the Hill setup screen takes up to ${CASH_CLIMB_MAX_TABLES} tables.`);
    if (!Number.isInteger(entryFee)) problems.push('The Cash Climb King of the Hill setup screen takes a whole-dollar entry fee.');
    return problems;
  }
  const range = showdownTables();
  return tables < range.min || tables > range.max ? [`The Showdown setup screen offers ${range.min} to ${range.max} tables.`] : [];
}

/**
 * '' when `m` can be handed to setup, otherwise the reason it cannot.
 * `currentInputs`: the form as it is now (a result for older inputs is stale).
 */
export function handoffProblem(m, result, { currentInputs = null } = {}) {
  if (!result || result.status !== 'final' || result.preliminary) return 'Wait for the final recommendations.';
  if (!m || !offeredOptions(result.recommendation).includes(m)) return 'Only a recommended option can be used.';
  if (m.refined !== true) return 'This option has not been fully checked yet.';
  if (!FITTING.has(m.fit)) return 'This option does not fit your time.';
  if (currentInputs && !sameInputs(result.inputs, currentInputs)) return 'Your inputs changed. Wait for the new recommendations.';
  return [...eligibilityProblems(m, result.inputs), ...screenProblems(m, result.inputs)][0] || '';
}

/** What happens next, for a card that can be used. A loaded Showdown goes through its usual confirmation first. */
export function handoffNote(m, { showdownOpen = false } = {}) {
  if (m?.family === 'showdown' && showdownOpen) {
    return 'A Showdown event is already open on this tablet. You will be asked to confirm setting it aside, then choose the format. Nothing starts until you start it.';
  }
  return 'Opens the normal setup screen with these settings filled in. Nothing starts until you start it there.';
}

function settingsFor(m, { tables, entryFee }) {
  if (m.family === 'cash-climb') return { raceTo: m.raceTo, kohRaceTo: m.kohRaceTo, tableCount: tables, entryFee };
  if (m.version === 3) return { entryFee, tableCount: tables, qualifyingGames: m.qualifyingGames, playoffRaceTo: m.playoffRaceTo };
  return { entryFee, tableCount: tables };
}

/** `{ handoff }` (frozen, settings only) or `{ problem }`. */
export function createHandoff(m, result, context = {}) {
  const problem = handoffProblem(m, result, context);
  if (problem) return { problem };
  const base = { family: m.family, plannedPlayers: result.inputs.entrants, settings: Object.freeze(settingsFor(m, result.inputs)) };
  return { handoff: Object.freeze(m.family === 'showdown' ? { ...base, version: m.version } : base) };
}
