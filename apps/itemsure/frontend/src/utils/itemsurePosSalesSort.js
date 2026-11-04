// Sort Sales vs counts rows by a column. Missing numbers (not counted, can't compare) go last.

export const SALES_SORT_COLUMNS = [
  { key: 'name', label: 'Item' },
  { key: 'sold', label: 'Clover sold' },
  { key: 'expected', label: 'Clover used' },
  { key: 'counted', label: 'Between counts' },
  { key: 'difference', label: 'Match?' },
];

/** First tap on a column: names A–Z, numbers biggest first (the gaps you care about). */
export const FIRST_DIR = { name: 'asc', sold: 'desc', expected: 'desc', counted: 'desc', difference: 'desc' };

export function toggleSalesSort(sort, key) {
  if (sort.key !== key) return { key, dir: FIRST_DIR[key] || 'asc' };
  return { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
}

const value = {
  name: (r) => r.name || '',
  sold: (r) => r.sold,
  expected: (r) => r.expected,
  counted: (r) => r.counted,
  difference: (r) => r.difference,
};

function cmpNum(a, b, sign) {
  const na = a == null || Number.isNaN(Number(a));
  const nb = b == null || Number.isNaN(Number(b));
  if (na && nb) return 0;
  if (na) return 1;
  if (nb) return -1;
  return sign * (Number(a) - Number(b));
}

/** New array, sorted by { key, dir: 'asc'|'desc' }. Ties break by name. */
export function sortSalesRows(rows, sort) {
  const key = sort?.key || 'name';
  const sign = sort?.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === 'name') return sign * value.name(a).localeCompare(value.name(b)) || a.itemId.localeCompare(b.itemId);
    return cmpNum(value[key]?.(a), value[key]?.(b), sign) || value.name(a).localeCompare(value.name(b));
  });
}
