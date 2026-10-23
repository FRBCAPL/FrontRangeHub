/**
 * Which payout formula NEW V3 events lock when they start.
 *
 * V3_D10_FOR_NEW_EVENTS
 *   false: new events lock the equal-rate plan (V3_EQUAL_RATE_FORMULA).
 *   true:  new events lock the escalating D10 plan (V3_ESCALATING_FORMULA).
 *
 * Only new plans follow this switch. Every plan already locked is loaded, checked, shown and settled by the
 * formula it carries, so turning the switch off again never changes or strands an event that started on D10.
 */
import { V3_EQUAL_RATE_FORMULA, V3_ESCALATING_FORMULA } from './showdownV3Rules.js';

export const V3_D10_FOR_NEW_EVENTS = false;

/** The formula marker new events lock. */
export function v3NewEventFormula(d10 = V3_D10_FOR_NEW_EVENTS) {
  return d10 ? V3_ESCALATING_FORMULA : V3_EQUAL_RATE_FORMULA;
}

export const v3NewEventsUseD10 = () => v3NewEventFormula() === V3_ESCALATING_FORMULA;
