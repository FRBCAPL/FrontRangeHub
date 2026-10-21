/**
 * A one-time Smart Builder prefill for a new Showdown. It only preselects a format in the picker; the
 * operator still ticks the confirmation and creates the event. Its settings are used only for the
 * format it was made for, and only the keys below: anything else in the prefill is ignored. Its planned
 * player count becomes the event's expected players, which only sizes the setup money preview.
 */
import { formatFor } from '../showdownFormats.js';
import { fieldRuleFor } from '../showdownFieldRules.js';

const SETTING_KEYS = {
  1: ['entryFee', 'tableCount'],
  2: ['entryFee', 'tableCount'],
  3: ['entryFee', 'tableCount', 'qualifyingGames', 'playoffRaceTo'],
};

export function isShowdownPrefill(prefill) {
  return prefill?.family === 'showdown' && Boolean(formatFor(prefill.version)) && Boolean(prefill.settings);
}

/** Creation settings when the confirmed `version` is the prefill's own format, otherwise {}. */
export function prefillConfig(prefill, version) {
  if (!isShowdownPrefill(prefill) || prefill.version !== version) return {};
  return Object.fromEntries((SETTING_KEYS[version] || [])
    .map((k) => [k, Number(prefill.settings[k])])
    .filter(([, v]) => Number.isFinite(v)));
}

/** `{ plannedPlayers }` from the prefill for its own format when it is in the supported field range, otherwise {}. */
export function prefillPlanned(prefill, version) {
  if (!isShowdownPrefill(prefill) || prefill.version !== version) return {};
  const n = Number(prefill.plannedPlayers);
  return fieldRuleFor(n) ? { plannedPlayers: n } : {};
}

/** Shown in the format picker while a prefill is waiting. */
export function prefillPickerNote(prefill) {
  if (!isShowdownPrefill(prefill)) return '';
  const code = formatFor(prefill.version).code;
  return `Help me choose suggested ${code}. Confirm ${code} to create the event with its settings, or pick another format to start from that format's normal settings.`;
}

/** Shown on the setup screen of the event created from a prefill. */
export function prefillSetupNote(prefill) {
  const players = Number(prefill?.plannedPlayers);
  const planned = Number.isInteger(players) && players > 0 ? `, planned for ${players} players` : '';
  const what = prefill?.version === 3 ? 'Entry fee, tables and match lengths were' : 'Entry fee and tables were';
  return `${what} filled in from Help me choose${planned}. The money preview uses the expected players until you enter them. Review and change anything, add your players, then start.`;
}
