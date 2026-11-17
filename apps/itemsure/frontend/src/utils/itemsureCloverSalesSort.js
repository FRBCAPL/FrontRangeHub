// Sort Clover sales rows. Missing numbers go last; "Needs fix" puts incomplete first by default.

export const CLOVER_SALES_SORT = [
  { key: 'sold', label: 'Sold' },
  { key: 'used', label: 'Stock used' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'needsFix', label: 'Needs fix' },
];

/** First tap: sold/used high first; names A–Z; needs-fix incomplete first. */
export const CLOVER_FIRST_DIR = {
  sold: 'desc',
  used: 'desc',
  name: 'asc',
  category: 'asc',
  needsFix: 'asc',
};

export function toggleCloverSalesSort(sort, key) {
  if (sort.key !== key) return { key, dir: CLOVER_FIRST_DIR[key] || 'asc' };
  return { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
}

function cmpNum(a, b, sign) {
  const na = a == null || Number.isNaN(Number(a));
  const nb = b == null || Number.isNaN(Number(b));
  if (na && nb) return 0;
  if (na) return 1;
  if (nb) return -1;
  return sign * (Number(a) - Number(b));
}

/** New array sorted by { key, dir }. Ties break by name, then itemId. */
export function sortCloverSalesRows(rows, sort) {
  const key = sort?.key || 'sold';
  const sign = sort?.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === 'name') cmp = sign * String(a.name || '').localeCompare(String(b.name || ''));
    else if (key === 'category') cmp = sign * String(a.categoryLabel || '').localeCompare(String(b.categoryLabel || ''));
    else if (key === 'needsFix') {
      const fa = a.complete ? 1 : 0;
      const fb = b.complete ? 1 : 0;
      cmp = sign * (fa - fb);
    } else if (key === 'used') cmp = cmpNum(a.used, b.used, sign);
    else cmp = cmpNum(a.sold, b.sold, sign);
    return cmp
      || String(a.name || '').localeCompare(String(b.name || ''))
      || String(a.itemId || '').localeCompare(String(b.itemId || ''));
  });
}
