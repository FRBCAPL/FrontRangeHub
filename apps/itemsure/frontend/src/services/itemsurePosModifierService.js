import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Clover modifiers ("Double", "Add Red Bull") and what each does for stock. Reports only:
// nothing here changes stock, and nothing is ever sent to Clover.

const PROVIDER = 'clover';
const PAGE = 1000;
const RULE = 'id, modifier_id, name, seen_at, action, extra_pours, item_id, uses_amount, uses_unit';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205'
  || /could not find the table|does not exist/i.test(error.message || ''));

/** { missing } until the database update is applied, else { rows } (every modifier seen in sales). */
export async function listModifiers(organizationId) {
  const { data, error } = await itemsure.from('pos_modifiers').select(RULE)
    .eq('organization_id', organizationId).eq('provider', PROVIDER).order('name');
  if (missingTable(error)) return { missing: true, rows: [] };
  return { missing: false, rows: assertOk({ data, error }, 'Clover modifiers') || [] };
}

/**
 * Saves what a modifier does: { action: 'none' } | { action: 'extra', extraPours }
 * | { action: 'item', itemId, amount, unit }.
 */
export async function saveModifier(id, rule) {
  const row = { action: rule.action, extra_pours: null, item_id: null, uses_amount: null, uses_unit: null, updated_at: new Date().toISOString() };
  if (rule.action === 'extra') row.extra_pours = rule.extraPours;
  if (rule.action === 'item') Object.assign(row, { item_id: rule.itemId, uses_amount: rule.amount, uses_unit: rule.unit });
  return assertOk(await itemsure.from('pos_modifiers').update(row).eq('id', id).select(RULE).single(), 'save the modifier');
}

/** Hourly modifier use [{ external_id, modifier_id, hour_start, quantity }], or null until the update is applied. */
export async function modifierHours(organizationId, after, upTo) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await itemsure.from('pos_modifier_hourly')
      .select('external_id, modifier_id, hour_start, quantity')
      .eq('organization_id', organizationId).eq('provider', PROVIDER)
      .gt('hour_start', after).lte('hour_start', upTo)
      .order('hour_start').order('external_id').order('modifier_id').range(from, from + PAGE - 1);
    if (missingTable(error)) return null;
    const rows = assertOk({ data, error }, 'Clover modifiers') || [];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}
