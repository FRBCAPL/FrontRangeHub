import React from 'react';
import ItemsureChipScroller from './ItemsureChipScroller.jsx';

export const NO_SUPPLIER_ID = 'none';

/** True when the count item comes from `selected` ('' = any supplier, NO_SUPPLIER_ID = none set). */
export function countItemFromSupplier(suppliers, item, selected) {
  if (!selected || !suppliers?.available) return true;
  const id = suppliers.links.get(item.item_id) || null;
  return selected === NO_SUPPLIER_ID ? !id : id === selected;
}

/**
 * Supplier filter for a count: a swipe row like the category bar, listing only suppliers
 * with items in this count (with how many). Tapping the chosen supplier again goes back to all.
 * Hidden until suppliers are set up, or when fewer than two choices.
 */
export default function ItemsureCountSupplierFilter({ suppliers, items, selected, onSelect }) {
  if (!suppliers?.available) return null;
  const count = (id) => items.filter((i) => countItemFromSupplier(suppliers, i, id)).length;
  const choices = suppliers.suppliers.map((s) => ({ s, n: count(s.id) })).filter((c) => c.n);
  const none = count(NO_SUPPLIER_ID);
  if (choices.length + (none ? 1 : 0) < 2) return null;
  return (
    <ItemsureChipScroller
      label="Suppliers"
      options={[
        { value: '', label: 'All suppliers', count: items.length },
        ...choices.map(({ s, n }) => ({ value: s.id, label: s.icon ? `${s.icon} ${s.name}` : s.name, count: n })),
        ...(none ? [{ value: NO_SUPPLIER_ID, label: 'No supplier', count: none }] : []),
      ]}
      selected={selected}
      onSelect={(value) => onSelect(value === selected ? '' : value)}
    />
  );
}
