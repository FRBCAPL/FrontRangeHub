/**
 * Format picker state. The recommended format is preselected, but nothing is created or changed
 * until the operator ticks the confirmation, and any new selection clears that confirmation.
 */
import { RECOMMENDED_PAYOUT_VERSION } from '../showdownRules.js';
import { formatFor } from '../showdownFormats.js';

export function initialPick(current = null) {
  return { selected: current ?? RECOMMENDED_PAYOUT_VERSION, confirmed: false };
}

export function selectFormat(pick, version) {
  return pick.selected === version ? pick : { selected: version, confirmed: false };
}

export function confirmPick(pick, confirmed) {
  return { ...pick, confirmed: Boolean(confirmed) };
}

/** '' when the picker may create (or change to) the selected format, otherwise what is missing. */
export function pickProblem(pick, current = null) {
  const fmt = formatFor(pick.selected);
  if (!fmt) return 'Choose a format.';
  if (current !== null && fmt.version === current) return `This event already uses ${fmt.code}. Choose a different format.`;
  if (!pick.confirmed) return `Tick the box to confirm ${fmt.code}.`;
  return '';
}
