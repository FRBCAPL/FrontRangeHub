// "2 cases + 7 loose": for things counted in cases but sold one at a time, when the business
// counts loose ones too. Stock is still kept in cases (2 + 7/24 = 2.291667); this only turns
// that into what people type and read, and back. Exact integer math, no floats.

import { checkQuantity } from './itemsureQuantity.js';
import { pluralUnit, singularUnit } from './itemsureItemLook.js';

const MICRO = 1000000n;

const toMicro = (n) => BigInt(Math.round(Number(n) * 1000000));

function scaledText(scaled, places) {
  const s = scaled.toString().padStart(places + 1, '0');
  const whole = places ? s.slice(0, -places) : s;
  const fraction = places ? s.slice(-places).replace(/0+$/, '') : '';
  return fraction ? `${whole}.${fraction}` : whole;
}

/** pieces per case for loose counting, or 0 when loose counting doesn't apply. */
export const loosePieces = (on, pieces) => (on && Number(pieces) > 0 ? Number(pieces) : 0);

/**
 * Typed cases + loose -> the stored amount in cases, rounded to the unit's decimals.
 * Returns { empty: true }, { value: '2.291667' }, or { error }.
 */
export function joinLoose(casesText, looseText, pieces, precision, unitName = 'Case') {
  const cases = checkQuantity(casesText, 0, `Full ${pluralUnit(singularUnit(unitName)).toLowerCase()}`);
  const loose = checkQuantity(looseText, 0, 'Loose');
  if (cases.error) return { error: `${cases.error.replace(' must be counted in whole numbers.', ' are whole numbers here. Put the rest in loose.')}` };
  if (loose.error) return { error: loose.error.replace('must be counted in whole numbers', 'are counted one at a time (whole numbers)') };
  if (cases.empty && loose.empty) return { empty: true };
  const p = Math.max(0, Math.min(6, precision ?? 0));
  const scale = 10n ** BigInt(p);
  const perCase = toMicro(pieces);
  if (perCase <= 0n) return { error: 'Set how many you sell out of one case first.' };
  const w = BigInt(cases.value ?? '0');
  const l = BigInt(loose.value ?? '0');
  const part = (l * scale * MICRO * 2n + perCase) / (2n * perCase);
  return { value: scaledText(w * scale + part, p) };
}

/**
 * A stored amount in cases -> { negative, cases, loose } as whole numbers (2.291667 of 24 ->
 * 2 cases, 7 loose). A full case of loose rolls into cases. null for text that isn't a number.
 */
export function splitLoose(text, pieces) {
  const raw = String(text ?? '').trim();
  const negative = raw.startsWith('-');
  const checked = checkQuantity(negative ? raw.slice(1) : raw, 6);
  const perCase = toMicro(pieces);
  if (checked.value === undefined || perCase <= 0n) return null;
  const [wholeText, fractionText = ''] = checked.value.split('.');
  let cases = BigInt(wholeText);
  const fraction = BigInt(fractionText.padEnd(6, '0') || '0');
  let loose = (fraction * perCase * 2n + MICRO * MICRO) / (2n * MICRO * MICRO);
  const full = (perCase + MICRO / 2n) / MICRO;
  if (full > 0n && loose >= full) {
    cases += 1n;
    loose -= full;
  }
  return { negative: negative && (cases > 0n || loose > 0n), cases: cases.toString(), loose: loose.toString() };
}

/** Just the full cases ("2" for 2 cases + 7 loose, "−1" below zero); null when it can't be split. */
export function fullCases(text, pieces) {
  const split = splitLoose(text, pieces);
  if (!split) return null;
  return `${split.negative && split.cases !== '0' ? '−' : ''}${split.cases}`;
}

/** "2 cases + 7 loose", "7 loose", "1 case"; null when it can't be split. */
export function looseText(text, pieces, unitName) {
  const split = splitLoose(text, pieces);
  if (!split) return null;
  const one = singularUnit(unitName || 'case').toLowerCase();
  const parts = [];
  if (split.cases !== '0' || split.loose === '0') parts.push(`${split.cases} ${split.cases === '1' ? one : pluralUnit(one)}`);
  if (split.loose !== '0') parts.push(`${split.loose} loose`);
  return `${split.negative ? '−' : ''}${parts.join(' + ')}`;
}
