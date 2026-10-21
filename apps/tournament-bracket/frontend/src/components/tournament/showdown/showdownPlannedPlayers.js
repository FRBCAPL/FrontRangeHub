/**
 * Expected players: an optional planning number for setup. It only sizes the setup money preview while
 * fewer players are entered; the start always locks the plan for the players actually entered.
 */
import { supportedFieldRange } from './showdownFieldRules.js';

/** A whole number in the supported field range, or null for "none". Throws on anything else. */
export function normalizePlannedPlayers(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  const { min, max } = supportedFieldRange();
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Expected players must be a whole number from ${min} to ${max}.`);
  return n;
}

/** Player count the setup money preview uses: the expected number until at least that many are entered. */
export function previewEntrants(state) {
  const entered = (state.players || []).length;
  const planned = state.status === 'setup' ? Number(state.plannedPlayers) || 0 : 0;
  return Math.max(entered, planned);
}

/** True while the preview is sized by the expected number rather than the players entered. */
export const usingPlannedPlayers = (state) => previewEntrants(state) > (state.players || []).length;
