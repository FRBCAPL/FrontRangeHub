/**
 * Supabase returns at most 1,000 rows per request (the project's "Max rows" setting) and silently drops the rest.
 * fetchAllPages runs a query page by page until a short page comes back, so big leagues load every row.
 * `build` must return a fresh query each call, ordered by something unique (e.g. ending in .order('id')),
 * or pages can overlap / skip rows. Returns { data, error } like a normal Supabase call.
 */
export const PAGE_SIZE = 1000;

export async function fetchAllPages(build, { pageSize = PAGE_SIZE, max = Infinity } = {}) {
  const rows = [];
  for (let from = 0; from < max; from += pageSize) {
    const to = Math.min(from + pageSize, max) - 1;
    const { data, error } = await build().range(from, to);
    if (error) return { data: null, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return { data: rows, error: null };
}
