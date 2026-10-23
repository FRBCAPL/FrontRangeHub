/**
 * Test-only helpers that drive a V3 event through the shared engine actions. Every context carries
 * `v3Preview`, the development-only flag that lets a V3 event start while operator starts are disabled.
 */
import * as E from '../showdownEngine.js';
import { operator, names, playOpen, randomRace, settleShootouts } from '../showdownTestKit.js';
import { RESET_CONFIRM_WORD } from '../showdownRules.js';
import { buildV3Plan } from './showdownV3Plan.js';
import { v3SettingsOf } from './showdownV3Event.js';

export const CONFIRM = RESET_CONFIRM_WORD;

export function v3Op(seed = 1) {
  const op = operator(seed);
  return () => ({ ...op(), v3Preview: true });
}

export function createV3(n, { fee = 20, games = 7, raceTo = 5, tables = 5 } = {}, op = v3Op()) {
  return E.createShowdown({
    name: `V3 ${n}`, payoutVersion: 3, entryFee: fee, qualifyingGames: games, playoffRaceTo: raceTo, tableCount: tables, players: names(n),
  }, op());
}

/**
 * The started event with the plan `formula` locks for its settings, as if it had started while the activation
 * switch chose that formula (e.g. a D10 event loaded by a build with D10 switched off for new events).
 */
export function withFormula(s, formula) {
  const payoutPlan = buildV3Plan(v3SettingsOf(s), formula);
  const detail = { formula: payoutPlan.formula, rates: payoutPlan.rates, championshipTierPct: payoutPlan.championshipTierPct, warnings: payoutPlan.guarantees.warnings };
  return { ...s, payoutPlan, audit: s.audit.map((a) => (a.action === 'start' ? { ...a, detail: { ...a.detail, ...detail } } : a)) };
}

/** `opts.formula` locks that formula instead of the one the activation switch picks for new events. */
export function startV3(n, opts = {}) {
  const op = v3Op(opts.seed || 1);
  const s = E.startShowdown(createV3(n, opts, op), op());
  return { s: opts.formula ? withFormula(s, opts.formula) : s, op };
}

/** Random fixed-length qualifying score: every game is played and a tie is possible when G is even. */
export const randomGames = (games) => (m, random) => {
  const a = Math.floor(random() * (games + 1));
  return [a, games - a];
};

export function playQualifyingV3(s, op, decide = randomGames(s.payoutPlan.qualifyingGames)) {
  return playOpen(s, op, 'qualifying', decide);
}

export function toBracketV3(n, opts = {}) {
  const { s, op } = startV3(n, opts);
  const played = playQualifyingV3(s, op, opts.decide);
  return { s: settleShootouts(E.lockQualifying(played, op()), op), op };
}

export function toPlayoffsV3(n, opts = {}) {
  const { s, op } = toBracketV3(n, opts);
  return { s: E.confirmPlayoff(E.drawPlayoff(s, op()), op()), op };
}

export function playPlayoffsV3(s, op) {
  return playOpen(s, op, 'playoff', randomRace(s.payoutPlan.playoffRaceTo));
}

export function runV3(n, opts = {}) {
  const { s, op } = toPlayoffsV3(n, opts);
  return { s: E.completeShowdown(playPlayoffsV3(s, op), op()), op };
}

/** Starts the next ready match of a phase on a free table and returns [state, match]. */
export function startNext(s, op, phase) {
  const ready = E.readyMatches(s.matches).filter((m) => m.phase === phase);
  const table = E.freeTables(s.matches, s.settings.tableCount)[0];
  if (!ready.length || !table) throw new Error(`No ${phase} match can start.`);
  const next = E.startOnTable(s, ready[0].id, table, op());
  return [next, next.matches.find((m) => m.id === ready[0].id)];
}

export function money(s) {
  return E.computeEarnings(s);
}

export function auditActions(s) {
  return s.audit.map((a) => a.action);
}
