/**
 * Exact value equality that ignores object key order. A record that went through the cloud (Postgres jsonb
 * reorders keys) must compare equal to the copy the app saved; every value must still match exactly.
 */
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Canonical JSON (sorted keys; undefined members dropped, as JSON.stringify does). */
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableJson(v))).join(',')}]`;
  if (isObj(value)) {
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export const sameValue = (a, b) => stableJson(a) === stableJson(b);
