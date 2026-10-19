/**
 * Choosing and changing the tournament format. The format can change only during setup, and
 * only after the operator confirms; once qualifying starts it is locked with the event.
 */
import { createShowdown, context, requireStatus, withAudit } from './showdownState.js';
import { payoutVersionOf, requireSupportedFormat } from './showdownPayoutVersion.js';
import { formatFor, formatSettings, keptSettings, formatChangeResets } from './showdownFormats.js';
import { venuePreset } from './showdownVenuePresets.js';
import { minEngineFor } from './showdownRules.js';

/** Creates an event in the format the operator explicitly confirmed. A preselected format is not a confirmation. */
export function createShowdownWithFormat({ payoutVersion, confirmed = false, ...config } = {}, ctxIn = {}) {
  const fmt = formatFor(payoutVersion);
  if (!fmt) throw new Error('Choose a tournament format: V1, V2 or V3.');
  if (confirmed !== true) throw new Error(`Confirm that this tournament uses ${fmt.code} before creating it.`);
  const state = createShowdown({ ...config, payoutVersion: fmt.version }, ctxIn);
  const [created, ...rest] = state.audit;
  return { ...state, audit: [{ ...created, detail: { payoutVersion: fmt.version, formatConfirmed: true } }, ...rest] };
}

/** Settings after a change to `version`, and what the change resets. Shared settings are kept. */
export function formatChangePreview(state, version) {
  const settings = formatSettings(version, keptSettings(state.settings), venuePreset(state.presetId) || {});
  return { settings, resets: formatChangeResets(state.settings, settings) };
}

export function changeFormat(state, version, { confirmed = false } = {}, ctxIn) {
  const c = context(ctxIn);
  requireSupportedFormat(state);
  requireStatus(state, ['setup'], 'The format is locked once the event starts.');
  const target = formatFor(Number(version));
  if (!target) throw new Error('Choose a tournament format: V1, V2 or V3.');
  const from = payoutVersionOf(state);
  if (from === target.version) throw new Error(`This event already uses ${target.code}.`);
  if (confirmed !== true) throw new Error(`Confirm the change to ${target.code} first.`);
  const { settings, resets } = formatChangePreview(state, target.version);
  return withAudit({ ...state, payoutVersion: target.version, minEngine: minEngineFor(target.version), settings }, c, 'change-format', [], {
    from,
    to: target.version,
    reset: resets.map((r) => r.key),
  });
}
