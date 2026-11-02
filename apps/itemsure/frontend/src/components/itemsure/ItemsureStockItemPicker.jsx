import React from 'react';
import { Field } from './ItemsureUi.jsx';

const MORE = '__more';

/**
 * Item picker for Add / Use: the items kept at the chosen spot, then "+ Add an item not kept here…",
 * which switches to every other item. With nothing kept there it starts on the other items.
 */
export default function ItemsureStockItemPicker({ here, others, itemId, onChoose, listingOthers, onListOthers }) {
  if (!listingOthers) {
    return (
      <Field label="Item" hint={`${here.length} item${here.length === 1 ? '' : 's'} kept here.`}>
        <select value={itemId} onChange={(e) => (e.target.value === MORE ? onListOthers(true) : onChoose(e.target.value))}>
          {here.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          {others.length ? <option value={MORE}>+ Add an item not kept here…</option> : null}
        </select>
      </Field>
    );
  }
  return (
    <div className="isu-stack">
      <Field label="Item not kept here" hint={here.length ? null : 'Nothing is kept here yet, so every item is listed.'}>
        <select value={itemId} onChange={(e) => onChoose(e.target.value)}>
          {others.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      {here.length ? (
        <button type="button" className="isu-link isu-small isu-stock-pick-back" onClick={() => onListOthers(false)}>
          {'\u2039'} Back to the {here.length} item{here.length === 1 ? '' : 's'} kept here
        </button>
      ) : null}
    </div>
  );
}
