// Clover modifiers in the reports: what each one does for stock, and how much stock the
// modifiers sold should have used. Reports only; nothing here changes stock.
import { pourInBase } from './itemsurePosUsage.js';

const NOTHING = /\b(neat|rocks|on the rocks|up|straight up|chilled|no ice|light ice|easy ice|extra ice|ice|lime|lemon|orange|salt|sugar|olive|olives|twist|cherry|tall|short|dirty|shaken|stirred|well done|medium|rare|no)\b/i;

/** A likely rule from the modifier's name, or null when there's no good guess. */
export function guessModifier(name) {
  const text = String(name || '');
  if (/\b(triple|trpl)\b/i.test(text)) return { action: 'extra', extraPours: 2 };
  if (/\b(double|dbl|dub)\b/i.test(text) || /\b(add|extra)\s+(a\s+)?shot\b/i.test(text)) return { action: 'extra', extraPours: 1 };
  if (/\b(add|with|w\/)\s/i.test(text) && !NOTHING.test(text.replace(/\b(add|with|w\/)\s/i, ''))) return null;
  if (NOTHING.test(text)) return { action: 'none' };
  return null;
}

/** The saved rule in app form, or null when not decided yet. */
export function ruleOf(row) {
  if (row?.action === 'none') return { action: 'none' };
  if (row?.action === 'extra') return { action: 'extra', extraPours: Number(row.extra_pours) };
  if (row?.action === 'item') return { action: 'item', itemId: row.item_id, amount: Number(row.uses_amount), unit: row.uses_unit };
  return null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Plain words for a rule, e.g. "1 more pour of the drink", "Uses 1 single of Red Bull". */
export function ruleText(rule, itemName = 'an item', unitLabel = '') {
  if (!rule) return 'Not set yet (counts as nothing)';
  if (rule.action === 'none') return 'Nothing extra';
  if (rule.action === 'extra') return `${plural(rule.extraPours, 'more pour', 'more pours')} of the drink`;
  const amount = `${rule.amount}${unitLabel ? ` ${unitLabel}` : ''}`;
  return `Uses ${amount} of ${itemName}`;
}

/** { rules, names } from listModifiers: rules holds only modifiers that use stock. */
export function modifierSetup(list) {
  const rules = new Map();
  const names = new Map();
  for (const row of list?.rows || []) {
    names.set(row.modifier_id, row.name);
    const rule = ruleOf(row);
    if (rule && rule.action !== 'none') rules.set(row.modifier_id, rule);
  }
  return { rules, names };
}

/** Map "cloverId|modifierId" -> quantity, from hourly rows. */
export function modifierTotals(hours) {
  const totals = new Map();
  for (const h of hours || []) {
    const key = `${h.external_id}|${h.modifier_id}`;
    totals.set(key, (totals.get(key) || 0) + Number(h.quantity || 0));
  }
  return totals;
}

/**
 * Extra stock the modifiers should have used, per item.
 * keys: ["cloverId|modifierId"]; qtyFor(cloverId, modifierId, itemId) -> how many (itemId is the
 * item the stock comes from, so reports can use that item's own dates); rules: Map modifierId -> rule;
 * names: Map modifierId -> name; links / pours / unitCodes / contents / pieces as in expectedUse.
 * "More of the drink" adds to the drink's first linked item at its own amount per sale.
 * Returns Map itemId -> { extra, notes: [{ name, qty }], incomplete }.
 */
export function modifierUse({ keys, qtyFor, rules, names, links, pours, unitCodes, contents, pieces }) {
  const out = new Map();
  const add = (itemId, modifierId, qty, per) => {
    const row = out.get(itemId) || { extra: 0, notes: new Map(), incomplete: false };
    const name = names?.get(modifierId) || 'Modifier';
    row.notes.set(name, (row.notes.get(name) || 0) + qty);
    if (per == null) row.incomplete = true;
    else row.extra += qty * per;
    out.set(itemId, row);
  };
  for (const key of keys) {
    const cut = key.indexOf('|');
    const cloverId = key.slice(0, cut);
    const modifierId = key.slice(cut + 1);
    const rule = rules.get(modifierId);
    if (!rule || rule.action === 'none') continue;
    if (rule.action === 'extra') {
      const main = (links.get(cloverId) || [])[0];
      if (!main) continue;
      const qty = qtyFor(cloverId, modifierId, main);
      if (!(qty > 0)) continue;
      const pour = pours?.get(`${cloverId}|${main}`);
      const one = pour ? pourInBase(pour, unitCodes.get(main), contents?.get(main), pieces?.get(main)) : null;
      add(main, modifierId, qty, one == null ? null : one * rule.extraPours);
    } else if (rule.action === 'item' && rule.itemId) {
      const qty = qtyFor(cloverId, modifierId, rule.itemId);
      if (!(qty > 0)) continue;
      const t = rule.itemId;
      add(t, modifierId, qty, pourInBase({ amount: rule.amount, unit: rule.unit }, unitCodes.get(t), contents?.get(t), pieces?.get(t)));
    }
  }
  for (const row of out.values()) {
    row.notes = [...row.notes].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  }
  return out;
}

/** Adds modifierUse results into an expectedUse map (in place): more expected, plus `modifiers` notes. */
export function addModifierUse(expected, mods) {
  for (const [itemId, m] of mods) {
    const e = expected.get(itemId) || { expected: 0, sold: 0, missingPour: [], missingContent: false };
    e.expected += m.extra;
    if (m.incomplete) e.missingContent = true;
    e.modifiers = m.notes;
    expected.set(itemId, e);
  }
  return expected;
}

/** Hourly modifier rows as sales rows keyed "cloverId|modifierId", for salesIndex / salesTotals. */
export const asSalesRows = (hours) => (hours || []).map((h) => ({ ...h, external_id: `${h.external_id}|${h.modifier_id}` }));

/** "6 Double, 2 Add Red Bull" */
export const modifierNotes = (notes) => (notes || []).map((n) => `${Math.round(n.qty * 100) / 100} ${n.name}`).join(', ');
