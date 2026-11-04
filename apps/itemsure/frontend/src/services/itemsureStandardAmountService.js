import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// House standard amounts ("shot = 1.5 oz"), used to suggest point-of-sale amounts.

/** [{ id, keyword, amount, unit }] or null until the database update is applied. */
export async function listStandardAmounts(organizationId) {
  const { data, error } = await itemsure.from('standard_amounts').select('id, keyword, amount, unit')
    .eq('organization_id', organizationId).order('keyword');
  if (error) return null;
  return (data || []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

/**
 * Makes the saved list match `rows` ([{ keyword, amount, unit }]): removes words no longer
 * there, changes amounts that differ, adds new words.
 */
export async function saveStandardAmounts(organizationId, saved, rows) {
  const wanted = new Map(rows.map((r) => [r.keyword, r]));
  const have = new Map(saved.map((r) => [r.keyword, r]));
  for (const old of saved) {
    if (!wanted.has(old.keyword)) {
      assertOk(await itemsure.from('standard_amounts').delete().eq('id', old.id), 'remove an amount');
    }
  }
  for (const row of rows) {
    const old = have.get(row.keyword);
    if (old && (old.amount !== row.amount || old.unit !== row.unit)) {
      assertOk(
        await itemsure.from('standard_amounts').update({ amount: row.amount, unit: row.unit, updated_at: new Date().toISOString() }).eq('id', old.id),
        'change an amount',
      );
    } else if (!old) {
      assertOk(
        await itemsure.from('standard_amounts').insert({ organization_id: organizationId, keyword: row.keyword, amount: row.amount, unit: row.unit }),
        'add an amount',
      );
    }
  }
}
