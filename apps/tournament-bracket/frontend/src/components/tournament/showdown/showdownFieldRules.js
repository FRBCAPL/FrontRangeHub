/**
 * Approved field sizes. Add a row here (plus a playoff template and payout fixtures)
 * once rules for larger fields are approved — the engine reads only this table.
 */

export const FIELD_RULES = [
  { min: 8, max: 11, qualifiers: 4, templateId: 'p4' },
  { min: 12, max: 13, qualifiers: 5, templateId: 'p5' },
  { min: 14, max: 15, qualifiers: 6, templateId: 'p6' },
  { min: 16, max: 17, qualifiers: 7, templateId: 'p7' },
  { min: 18, max: 24, qualifiers: 8, templateId: 'p8' },
];

export function fieldRuleFor(entrants) {
  const n = Number(entrants);
  if (!Number.isInteger(n)) return null;
  return FIELD_RULES.find((r) => n >= r.min && n <= r.max) || null;
}

export function supportedFieldRange() {
  return {
    min: Math.min(...FIELD_RULES.map((r) => r.min)),
    max: Math.max(...FIELD_RULES.map((r) => r.max)),
  };
}

export function unsupportedFieldMessage(entrants) {
  const { min, max } = supportedFieldRange();
  if (entrants < min) return `Cash Climb Showdown needs at least ${min} entrants.`;
  return `No approved Showdown rules for ${entrants} entrants yet (approved: ${min}\u2013${max}).`;
}
