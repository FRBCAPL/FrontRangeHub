import { SHOWDOWN_TYPE, SHOWDOWN_FORMAT_VERSION, SHOWDOWN_NAME, DEFAULT_RULESET_ID, RESET_CONFIRM_WORD, rulesetFor } from './showdownRules.js';
import { fieldRuleFor, supportedFieldRange, unsupportedFieldMessage } from './showdownFieldRules.js';
import { venuePreset, DEFAULT_PRESET_ID } from './showdownVenuePresets.js';
import { entryFeeProblem } from './showdownPayout.js';
import { newId } from './showdownRandom.js';

export function context(ctx = {}) {
  return {
    now: ctx.now || new Date().toISOString(),
    by: ctx.by || '',
    random: ctx.random || Math.random,
    newId: ctx.newId || newId,
  };
}

export function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

export function withAudit(state, c, action, affected = [], detail = null) {
  return {
    ...state,
    audit: [...(state.audit || []), { at: c.now, by: c.by, action, affected, detail }],
  };
}

export function requireStatus(state, allowed, message) {
  if (!allowed.includes(state.status)) throw new Error(message || `Not allowed while the event is ${state.status}.`);
}

export function requireConfirm(confirmText) {
  if (String(confirmText || '').trim().toUpperCase() !== RESET_CONFIRM_WORD) {
    throw new Error(`Type ${RESET_CONFIRM_WORD} to confirm.`);
  }
}

export function playerIds(state) {
  return (state.players || []).map((p) => p.id);
}

export function withdrawnIds(state) {
  return (state.players || []).filter((p) => p.withdrawnAt).map((p) => p.id);
}

export function qualifyingMatches(state) {
  return (state.matches || []).filter((m) => m.phase === 'qualifying');
}

export function playoffMatches(state) {
  return (state.matches || []).filter((m) => m.phase === 'playoff');
}

export function findMatch(state, matchId) {
  const match = (state.matches || []).find((m) => m.id === matchId);
  if (!match) throw new Error('Match not found.');
  return match;
}

export function replaceMatches(state, phase, nextPhaseMatches) {
  const others = (state.matches || []).filter((m) => m.phase !== phase);
  return phase === 'qualifying' ? [...nextPhaseMatches, ...others] : [...others, ...nextPhaseMatches];
}

export function createShowdown(config = {}, ctxIn = {}) {
  const c = context(ctxIn);
  const preset = venuePreset(config.presetId || DEFAULT_PRESET_ID) || {};
  const rulesetId = config.rulesetId || preset.rulesetId || DEFAULT_RULESET_ID;
  const ruleset = rulesetFor(rulesetId);
  return {
    id: config.id || c.newId('showdown'),
    type: SHOWDOWN_TYPE,
    formatVersion: SHOWDOWN_FORMAT_VERSION,
    name: String(config.name || SHOWDOWN_NAME).trim() || SHOWDOWN_NAME,
    tournamentDate: config.tournamentDate || c.now.slice(0, 10),
    venue: config.venue ?? preset.venue ?? '',
    presetId: preset.id || null,
    status: 'setup',
    settings: {
      rulesetId,
      game: ruleset?.game || '9-Ball',
      entryFee: Number(config.entryFee ?? preset.entryFee ?? 20),
      minEntrants: Number(config.minEntrants ?? preset.minEntrants ?? supportedFieldRange().min),
      maxEntrants: Number(config.maxEntrants ?? preset.maxEntrants ?? supportedFieldRange().max),
      tableCount: Number(config.tableCount ?? preset.tableCount ?? 4),
      qualifyingRaceTo: Number(config.qualifyingRaceTo ?? preset.qualifyingRaceTo ?? ruleset?.qualifyingRaceTo ?? 3),
      playoffRaceTo: Number(config.playoffRaceTo ?? preset.playoffRaceTo ?? ruleset?.playoffRaceTo ?? 5),
    },
    players: (config.players || []).map((p) => ({ id: p.id || c.newId('p'), name: String(p.name || '').trim(), fargorate: p.fargorate || '', withdrawnAt: null, withdrawnPhase: null })),
    circle: [],
    payoutPlan: null,
    playoffPlan: null,
    matches: [],
    qualification: null,
    shootouts: [],
    playoff: null,
    championId: null,
    createdAt: c.now,
    startedAt: null,
    completedAt: null,
    audit: [{ at: c.now, by: c.by, action: 'create', affected: [], detail: null }],
  };
}

/** Events started under an earlier payout format cannot be continued by this engine. */
export function legacyFormatProblem(state) {
  if (!state || state.status === 'setup') return '';
  if ((state.formatVersion || 1) >= SHOWDOWN_FORMAT_VERSION) return '';
  return 'This is an obsolete test event. It was started before the current Showdown payout and tiebreaker rules, so its standings no longer match its locked results. Close and archive it, then start a new event.';
}

/** What phones and the TV show instead of an obsolete test event. */
export const LEGACY_PUBLIC_MESSAGE = 'This test event used earlier Showdown rules and is no longer shown.';

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1;
}

/** Everything that blocks starting. Empty list means the event can start. */
export function setupProblems(state) {
  const s = state.settings;
  const problems = [];
  const n = (state.players || []).length;
  const feeProblem = entryFeeProblem(s.entryFee);
  if (feeProblem) problems.push(feeProblem);
  if (!rulesetFor(s.rulesetId)) problems.push('Pick an approved game ruleset.');
  if (!positiveInt(s.tableCount)) problems.push('Table count must be at least 1.');
  if (!positiveInt(s.qualifyingRaceTo) || !positiveInt(s.playoffRaceTo)) problems.push('Race lengths must be whole numbers of at least 1.');
  const { min } = supportedFieldRange();
  if (!positiveInt(s.minEntrants) || s.minEntrants < min) problems.push(`Minimum entrants cannot be below ${min}.`);
  if (!positiveInt(s.maxEntrants) || s.maxEntrants < s.minEntrants) problems.push('Maximum entrants must be at least the minimum.');
  if (n < s.minEntrants) problems.push(`This event needs at least ${s.minEntrants} entrants (has ${n}).`);
  if (n > s.maxEntrants) problems.push(`This event allows at most ${s.maxEntrants} entrants (has ${n}).`);
  if (n >= min && !fieldRuleFor(n)) problems.push(unsupportedFieldMessage(n));
  const names = (state.players || []).map((p) => p.name.toLowerCase());
  if (names.some((name) => !name)) problems.push('Every player needs a name.');
  if (new Set(names).size !== names.length) problems.push('Two players have the same name.');
  return problems;
}
