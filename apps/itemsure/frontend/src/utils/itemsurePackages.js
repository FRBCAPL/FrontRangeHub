// Packaging math for previews. Exact decimal arithmetic on strings (BigInt), so
// the preview always matches what Postgres numeric will compute. The database
// converts again on save; this only tells the person what to expect.
import { canonicalQuantity, checkQuantity } from './itemsureQuantity.js';

function toScaled(text) {
  const [whole, fraction = ''] = text.split('.');
  return { digits: BigInt(whole + fraction), scale: fraction.length };
}

function fromScaled(digits, scale) {
  if (scale === 0) return digits.toString();
  const raw = digits.toString().padStart(scale + 1, '0');
  return canonicalQuantity(`${raw.slice(0, -scale)}.${raw.slice(-scale)}`);
}

/** Exact product of two non-negative decimal strings, trailing zeros trimmed. */
export function multiplyExact(a, b) {
  const x = toScaled(canonicalQuantity(a));
  const y = toScaled(canonicalQuantity(b));
  return fromScaled(x.digits * y.digits, x.scale + y.scale);
}

export function decimalPlaces(text) {
  const value = canonicalQuantity(text);
  return value.includes('.') ? value.split('.')[1].length : 0;
}

function placesRule(unitName, precision) {
  return precision === 0
    ? `${unitName} must be in whole numbers`
    : `${unitName} allows up to ${precision} decimal place${precision === 1 ? '' : 's'}`;
}

/** Checks a package size (base units in one package). Returns { value } or { error }. */
export function checkPackageSize(raw, unitName, precision) {
  const result = checkQuantity(raw, precision, unitName);
  if (result.empty) return { error: `Enter how many ${unitName} are in one package.` };
  if (result.error) {
    if (/decimal place|whole numbers/.test(result.error)) {
      return { error: `${placesRule(unitName, precision)}, so a package size must too.` };
    }
    return result;
  }
  if (result.value === '0') return { error: `A package must hold more than zero ${unitName}.` };
  return result;
}

/**
 * Converts a quantity typed in packages to the item's base unit.
 * Returns { empty }, { error }, or { packageQuantity, base }.
 */
export function convertPackageQuantity(raw, pkg, unitName, precision) {
  const typed = checkQuantity(raw, 6, pkg.name);
  if (typed.empty) return { empty: true };
  if (typed.error) {
    return { error: /decimal place/.test(typed.error) ? 'Package quantities allow up to 6 decimal places.' : typed.error };
  }
  if (typed.value === '0') return { error: 'Enter a quantity greater than zero.' };
  const base = multiplyExact(typed.value, pkg.size);
  if (decimalPlaces(base) > precision) {
    return { error: `${typed.value} \u00d7 ${pkg.name} is ${base} ${unitName}, but ${placesRule(unitName, precision)}.` };
  }
  return { packageQuantity: typed.value, base };
}

/**
 * What a stock form sends. Without a package the typed text is the base quantity
 * (checked later exactly as before). With one: { pkg, packageQuantity, base } or { pkg, error }.
 */
export function stockEntry(text, pkg, item) {
  if (!pkg) return { base: text };
  const result = convertPackageQuantity(text, pkg, item.unitName, item.precision);
  if (result.empty) return { pkg, empty: true, error: 'Enter a quantity.' };
  return { pkg, ...result };
}

/** "1 Case = 12 Each" */
export function describePackage(pkg, unitName) {
  return `1 ${pkg.name} = ${canonicalQuantity(pkg.size)} ${unitName}`;
}

/** Active packages, the default purchasing package first, then by name. */
export function usablePackages(list) {
  return (list || [])
    .filter((p) => p.is_active)
    .sort((a, b) => Number(b.is_purchase_unit) - Number(a.is_purchase_unit) || a.name.localeCompare(b.name));
}
