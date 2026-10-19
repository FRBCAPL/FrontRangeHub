import { buildCircle, circleMatches } from './showdownQualifying.js';
import { buildPayoutPlan } from './showdownPayout.js';
import { SHOWDOWN_FORMAT_VERSION } from './showdownRules.js';
import { isPayoutV2, isPayoutV3, v2RaceProblem, payoutVersionOf, noEngineError } from './showdownPayoutVersion.js';
import { v3StartFields } from './v3/showdownV3Event.js';
import { formatFor } from './showdownFormats.js';
import { context, requireStatus, setupProblems, withAudit } from './showdownState.js';

const EDITABLE_ANYTIME = ['tableCount'];
const SETTING_KEYS = ['entryFee', 'minEntrants', 'maxEntrants', 'tableCount', 'qualifyingRaceTo', 'qualifyingGames', 'playoffRaceTo'];

export function addPlayer(state, { name, fargorate = '' }, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['setup'], 'Entrants are locked once qualifying begins.');
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Enter a player name.');
  if (state.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) throw new Error(`${clean} is already entered.`);
  const player = { id: c.newId('p'), name: clean, fargorate, withdrawnAt: null, withdrawnPhase: null };
  return withAudit({ ...state, players: [...state.players, player] }, c, 'add-player', [player.id]);
}

export function removePlayer(state, playerId, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['setup'], 'Entrants are locked once qualifying begins. Use withdraw instead.');
  if (!state.players.some((p) => p.id === playerId)) throw new Error('Player not found.');
  return withAudit({ ...state, players: state.players.filter((p) => p.id !== playerId) }, c, 'remove-player', [playerId]);
}

/** Name and Fargo corrections are allowed anytime; ids drive all logic. */
export function updatePlayer(state, playerId, patch, ctxIn) {
  const c = context(ctxIn);
  const name = patch.name !== undefined ? String(patch.name).trim() : undefined;
  if (name !== undefined && !name) throw new Error('Enter a player name.');
  if (name && state.players.some((p) => p.id !== playerId && p.name.toLowerCase() === name.toLowerCase())) throw new Error(`${name} is already entered.`);
  const players = state.players.map((p) => (p.id === playerId
    ? { ...p, ...(name !== undefined ? { name } : {}), ...(patch.fargorate !== undefined ? { fargorate: patch.fargorate } : {}) }
    : p));
  return withAudit({ ...state, players }, c, 'edit-player', [playerId]);
}

export function updateSettings(state, patch, ctxIn) {
  const c = context(ctxIn);
  const keys = Object.keys(patch).filter((k) => SETTING_KEYS.includes(k));
  const fmt = formatFor(payoutVersionOf(state));
  if (!fmt) throw noEngineError(state);
  if (keys.some((k) => !fmt.settingKeys.includes(k))) throw new Error(`${fmt.code} events do not use that setting.`);
  if (state.status !== 'setup' && keys.some((k) => !EDITABLE_ANYTIME.includes(k))) {
    throw new Error('Only the table count can change once qualifying begins.');
  }
  const settings = { ...state.settings };
  keys.forEach((k) => { settings[k] = Number(patch[k]); });
  if (isPayoutV2(state) && v2RaceProblem(settings)) throw new Error(v2RaceProblem(settings));
  if (state.status !== 'setup') {
    const busy = (state.matches || []).filter((m) => m.status === 'on-table' && m.table > settings.tableCount);
    if (busy.length) throw new Error('A match is still on a table you are removing.');
    if (!Number.isInteger(settings.tableCount) || settings.tableCount < 1) throw new Error('Table count must be at least 1.');
  }
  return withAudit({ ...state, settings }, c, 'settings', [], patch);
}

export function updateDetails(state, { name, tournamentDate, venue }, ctxIn) {
  const c = context(ctxIn);
  return withAudit({
    ...state,
    ...(name !== undefined ? { name: String(name).trim() || state.name } : {}),
    ...(tournamentDate !== undefined ? { tournamentDate } : {}),
    ...(venue !== undefined ? { venue } : {}),
  }, c, 'details');
}

/**
 * Draws the qualifying circle, locks entrants and the payout plan. A V3 event locks its whole payout plan
 * (rates, reserves, ladder, trace) here and stores each qualifying match's Round 1 / Round 2 labels.
 */
export function startShowdown(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['setup'], 'This event has already started.');
  const fmt = formatFor(payoutVersionOf(state));
  const preview = c.v3Preview && isPayoutV3(state);
  const problems = setupProblems(state).filter((p) => !(preview && p === fmt?.notReady));
  if (problems.length) throw new Error(problems[0]);
  if (!fmt?.startable && !preview) throw noEngineError(state);
  const ids = state.players.map((p) => p.id);
  const circle = buildCircle(ids, c.random);
  const v3 = isPayoutV3(state) ? v3StartFields(state, circleMatches(circle)) : null;
  const payoutPlan = v3 ? v3.payoutPlan : buildPayoutPlan({ entrants: ids.length, entryFee: state.settings.entryFee });
  return withAudit({
    ...state,
    formatVersion: SHOWDOWN_FORMAT_VERSION,
    status: 'qualifying',
    circle,
    payoutPlan,
    playoffPlan: null,
    matches: v3 ? v3.matches : circleMatches(circle),
    startedAt: c.now,
  }, c, 'start', ids, v3 ? {
    payoutVersion: 3, formula: payoutPlan.formula, rates: payoutPlan.rates, championshipTierPct: payoutPlan.championshipTierPct, warnings: payoutPlan.guarantees.warnings,
  } : null);
}
