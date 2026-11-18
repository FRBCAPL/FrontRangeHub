// Quantities stay strings end to end. Postgres numeric does the math; the
// browser never parses a count into a float, so nothing is silently rounded.

const MAX_WHOLE_DIGITS = 12;

/**
 * Checks typed text against a unit's decimal places.
 * Returns { empty: true }, { value: '2.5' }, or { error: 'message' }.
 */
export function checkQuantity(raw, precision, unitName = 'This unit') {
  let text = String(raw ?? '').trim().replace(/\s+/g, '');
  if (text === '') return { empty: true };
  if (!text.includes('.') && /^\d*,\d+$/.test(text)) text = text.replace(',', '.');
  if (text.startsWith('-')) return { error: 'Quantities cannot be negative.' };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return { error: 'Enter a number, like 3 or 2.5.' };

  const [wholeRaw, fractionRaw = ''] = text.split('.');
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.replace(/0+$/, '');

  if (whole.length > MAX_WHOLE_DIGITS) return { error: 'That quantity is too large.' };
  if (fraction.length > precision) {
    if (precision === 0) return { error: `${unitName} must be counted in whole numbers.` };
    return { error: `${unitName} allows up to ${precision} decimal place${precision === 1 ? '' : 's'}.` };
  }
  return { value: fraction ? `${whole}.${fraction}` : whole };
}

/** Canonical form for comparing two quantity strings ("2.50" equals "2.5"). */
export function canonicalQuantity(text) {
  if (text === null || text === undefined || text === '') return '';
  const result = checkQuantity(text, 6);
  return result.value ?? String(text);
}

export function sameQuantity(a, b) {
  return canonicalQuantity(a) === canonicalQuantity(b);
}

/**
 * Round a quantity string to `places` decimals (half up), without floats.
 * Trailing zeros are trimmed. Used for what people read on screen — stored values stay exact.
 */
export function roundQuantity(text, places = 1) {
  const canon = canonicalQuantity(text);
  if (!canon) return '0';
  const p = Math.max(0, Math.min(6, places | 0));
  const [whole, fraction = ''] = canon.split('.');
  if (p === 0) {
    const bump = (fraction[0] || '0') >= '5';
    return (BigInt(whole) + (bump ? 1n : 0n)).toString();
  }
  const padded = fraction.padEnd(p + 1, '0');
  let scaled = BigInt(whole + padded.slice(0, p));
  if (padded[p] >= '5') scaled += 1n;
  const digits = scaled.toString().padStart(p + 1, '0');
  const w = digits.slice(0, -p);
  const f = digits.slice(-p).replace(/0+$/, '');
  return f ? `${w}.${f}` : w;
}

/** Display form: one decimal place (2.9087643 → 2.9). Comparisons/saves still use the exact value. */
export function displayQuantity(text) {
  return roundQuantity(text, 1);
}

/** An amount to buy, rounded up to a whole number: "2.5" → "3", "4" stays "4". You can't buy half a case. */
export function wholeToBuy(text) {
  const shown = displayQuantity(text);
  const [whole, fraction] = shown.split('.');
  if (!fraction) return shown;
  return (BigInt(whole || '0') + 1n).toString();
}

/**
 * Adds `delta` whole units to a typed quantity, exactly, never below zero.
 * Blank plus one is "1"; blank minus one stays blank. Text that isn't a valid
 * quantity is returned unchanged so the person can see and fix it.
 */
export function stepQuantity(text, delta) {
  const raw = String(text ?? '').trim();
  if (raw === '') return delta > 0 ? String(delta) : '';
  const checked = checkQuantity(raw, 6);
  if (!checked.value) return raw;
  const [whole, fraction = ''] = checked.value.split('.');
  const scale = fraction.length;
  let scaled = BigInt(whole + fraction) + BigInt(delta) * 10n ** BigInt(scale);
  if (scaled < 0n) scaled = 0n;
  if (scale === 0) return scaled.toString();
  const digits = scaled.toString().padStart(scale + 1, '0');
  return canonicalQuantity(`${digits.slice(0, -scale)}.${digits.slice(-scale)}`);
}

/** -1 / 0 / 1 for a numeric string, read from its text alone. */
export function quantitySign(text) {
  const raw = String(text ?? '').trim();
  const negative = raw.startsWith('-');
  const magnitude = canonicalQuantity(negative || raw.startsWith('+') ? raw.slice(1) : raw) || '0';
  if (magnitude === '0') return 0;
  return negative ? -1 : 1;
}

/** "+2", "\u22122.5", or "0" for a signed change. */
export function displaySigned(text) {
  const raw = String(text ?? '').trim();
  const sign = quantitySign(raw);
  if (sign === 0) return '0';
  const magnitude = displayQuantity(raw.replace(/^[-+]/, ''));
  return `${sign < 0 ? '\u2212' : '+'}${magnitude}`;
}
