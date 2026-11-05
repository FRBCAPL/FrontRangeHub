import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Clover modifiers ("Double", "Add Red Bull") and what each does for stock. Reports only:
// nothing here changes stock, and nothing is ever sent to Clover.

const PROVIDER = 'clover';
const PAGE = 1000;
const RULE = 'id, modifier_id, name, seen_at, action, extra_pours, item_id, uses_amount, uses_unit';

const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205'
  || /could not find the table|does not exist/i.test(error.message || ''));

/** Map modifier_id -> [{ item_id, uses_amount, uses_unit }], or null until the multi-item update is applied. */
async function listModifierLines(organizationId) {
  const { data, error } = await itemsure.from('pos_modifier_items').select('modifier_id, item_id, uses_amount, uses_unit')
    .eq('organization_id', organizationId).eq('provider', PROVIDER).order('created_at');
  if (missingTable(error)) return null;
  const byModifier = new Map();
  for (const r of assertOk({ data, error }, 'Clover modifier items') || []) {
    byModifier.set(r.modifier_id, [...(byModifier.get(r.modifier_id) || []), r]);
  }
  return byModifier;
}

/**
 * { missing } until the database update is applied, else { rows, multiReady } (every modifier seen
 * in sales, each with its `lines` when it uses several items). multiReady: several items can be saved.
 */
export async function listModifiers(organizationId) {
  const [{ data, error }, lines] = await Promise.all([
    itemsure.from('pos_modifiers').select(RULE).eq('organization_id', organizationId).eq('provider', PROVIDER).order('name'),
    listModifierLines(organizationId),
  ]);
  if (missingTable(error)) return { missing: true, rows: [], multiReady: false };
  const rows = (assertOk({ data, error }, 'Clover modifiers') || []).map((r) => ({ ...r, lines: lines?.get(r.modifier_id) || [] }));
  return { missing: false, rows, multiReady: lines !== null };
}

/**
 * Saves what a modifier does: { action: 'none' } | { action: 'extra', extraPours }
 * | { action: 'item', itemId, amount, unit } | { action: 'items', lines: [{ itemId, amount, unit }] }.
 * Several items are saved in one step (all or nothing).
 */
export async function saveModifier(id, rule) {
  if (rule.action === 'items') {
    const lines = rule.lines.map((l) => ({ item_id: l.itemId, amount: l.amount, unit: l.unit }));
    assertOk(await itemsure.rpc('set_pos_modifier_items', { p_modifier: id, p_lines: lines }), 'save the modifier');
    const row = assertOk(await itemsure.from('pos_modifiers').select(RULE).eq('id', id).single(), 'save the modifier');
    const saved = assertOk(await itemsure.from('pos_modifier_items').select('modifier_id, item_id, uses_amount, uses_unit')
      .eq('organization_id', rule.organizationId).eq('provider', PROVIDER).eq('modifier_id', row.modifier_id).order('created_at'), 'save the modifier');
    return { ...row, lines: saved || [] };
  }
  const row = { action: rule.action, extra_pours: null, item_id: null, uses_amount: null, uses_unit: null, updated_at: new Date().toISOString() };
  if (rule.action === 'extra') row.extra_pours = rule.extraPours;
  if (rule.action === 'item') Object.assign(row, { item_id: rule.itemId, uses_amount: rule.amount, uses_unit: rule.unit });
  return { ...assertOk(await itemsure.from('pos_modifiers').update(row).eq('id', id).select(RULE).single(), 'save the modifier'), lines: [] };
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