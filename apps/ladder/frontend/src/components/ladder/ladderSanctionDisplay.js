/**
 * Normalize BCA sanction fields from ladder_profiles / API (mixed types from PostgREST, JSON, forms).
 * Postgres can surface booleans as true/false or occasionally as 't'/'f' strings — never use Boolean('f').
 */

export function coerceSanctionedFlag(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (t === 't' || t === 'true' || t === 'yes' || t === '1') return true;
    if (t === 'f' || t === 'false' || t === 'no' || t === '0' || t === '') return false;
    return false;
  }
  return Boolean(value);
}

export function parseSanctionYear(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Read sanction fields from a ladder_profiles row (snake_case and rare camelCase). */
export function ladderSanctionFieldsFromProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return { sanctioned: false, sanctionYear: null };
  }
  const rawFlag = profile.sanctioned ?? profile.bca_sanctioned;
  const rawYear = profile.sanction_year ?? profile.sanctionYear ?? null;
  return {
    sanctioned: coerceSanctionedFlag(rawFlag),
    sanctionYear: parseSanctionYear(rawYear)
  };
}

/**
 * Ladder column + status card: show ✓ when player is sanctioned for ladder purposes.
 * - Missing year + sanctioned flag → ✓ (legacy rows).
 * - Year = current calendar year → ✓.
 * - Year = previous calendar year → ✓ (BCA sticker / admin entry often lags into the new year).
 */
export function isSanctionedForCurrentSeason(sanctioned, sanctionYear, referenceYear = new Date().getFullYear()) {
  if (!coerceSanctionedFlag(sanctioned)) return false;
  const y = parseSanctionYear(sanctionYear);
  if (y === null) return true;
  if (y === referenceYear) return true;
  if (y === referenceYear - 1) return true;
  return false;
}
