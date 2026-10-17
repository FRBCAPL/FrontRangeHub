/**
 * The copy of an event that the public (phones, TV) may see: everything needed to show
 * standings, shootouts, bracket and money, but no audit log and nothing that identifies an operator.
 */
const PRIVATE_KEYS = new Set(['audit', 'by', 'ownerId', 'ownerEmail', 'operator', 'operatorEmail', 'email', 'submittedName']);

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  Object.entries(value).forEach(([key, v]) => {
    if (PRIVATE_KEYS.has(key) || /email/i.test(key)) return;
    if (v === undefined) return;
    out[key] = scrub(v);
  });
  return out;
}

export function publicShowdown(state) {
  if (!state) return null;
  const copy = scrub(state);
  copy.audit = [];
  return copy;
}

/** A public copy is safe if it has no audit entries and no email-looking text anywhere. */
export function publicCopyProblem(copy) {
  if (!copy) return 'missing';
  if (copy.audit?.length) return 'audit';
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(JSON.stringify(copy))) return 'email';
  return '';
}
