import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { receiveEntries, receivePayload } from '../../utils/itemsureShoppingReceive.js';
import { buyLabel } from '../../utils/itemsureShoppingList.js';
import { ErrorNote } from './ItemsureUi.jsx';

const newReceiptId = () =>
  globalThis.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });

function Entry({ entry, unit, onChange }) {
  const { row, take, places, amounts } = entry;
  const listed = row.extra ? row.amount : buyLabel(row);
  const setAmount = (i, value) => onChange({ amounts: amounts.map((a, j) => (j === i ? value : a)) });
  return (
    <li className={`isu-receive-entry${take ? '' : ' is-skipped'}`}>
      <label className="isu-receive-take">
        <input type="checkbox" checked={take} onChange={(e) => onChange({ take: e.target.checked })} />
        <span className="isu-receive-name">{row.name}</span>
      </label>
      <p className={`isu-small ${entry.differs ? 'isu-receive-differs' : 'isu-muted'}`}>
        {entry.differs ? `Shopper got ${entry.bought}${row.extra ? '' : ` ${unit}`} \u00b7 list said ${listed || 'no amount'}` : listed ? `List: ${listed}` : 'No amount on the list'}
      </p>
      {take && !places.length ? (
        <p className="isu-muted isu-small">{row.itemId ? 'Not set up anywhere yet, so no stock is added. It comes off the list.' : 'Not an item, so no stock is added. It comes off the list.'}</p>
      ) : null}
      {take && places.length ? (
        <div className="isu-receive-places">
          {row.extra ? (
            <div className="isu-receive-place">
              <select value={entry.placeIndex} onChange={(e) => onChange({ placeIndex: Number(e.target.value) })} aria-label={`Where ${row.name} goes`}>
                {places.map((p, i) => <option key={`${p.locationId}|${p.storageAreaId || ''}`} value={i}>{p.label}</option>)}
              </select>
              <input inputMode="decimal" value={amounts[0]} onChange={(e) => setAmount(0, e.target.value)} aria-label={`How many ${row.name}`} placeholder="0" />
            </div>
          ) : (
            places.map((p, i) => (
              <label key={`${p.locationId}|${p.storageAreaId || ''}`} className="isu-receive-place">
                <span>{p.label}</span>
                <input inputMode="decimal" value={amounts[i]} onChange={(e) => setAmount(i, e.target.value)} aria-label={`How many ${row.name} to ${p.label}`} placeholder="0" />
                <span className="isu-muted isu-small">{unit}</span>
              </label>
            ))
          )}
        </div>
      ) : null}
    </li>
  );
}

/**
 * "Receive bought items": every ticked row with the amount going to each place, filled in
 * from what the shopper got and editable. Unchecked rows stay ticked on the list.
 * `onReceive(payload)` adds the stock in one step; then `onDone(count)`.
 */
export default function ItemsureShoppingReceive({ groups, ticked, itemsById, placesFor, supplierNameOf, withLocation, onReceive, onDone, onCancel }) {
  const [receiptId] = useState(newReceiptId);
  const [entries, setEntries] = useState(() =>
    groups.map((g) => ({ label: g.label, entries: receiveEntries(g.rows, ticked, { placesFor, withLocation }) })).filter((g) => g.entries.length),
  );
  const { busy, error, setError, run } = useItemsureAction();
  const all = entries.flatMap((g) => g.entries);
  const changed = all.filter((e) => e.differs).length;

  const update = (key, patch) =>
    setEntries((gs) => gs.map((g) => ({ ...g, entries: g.entries.map((e) => (e.key === key ? { ...e, ...patch } : e)) })));

  const submit = async () => {
    const payload = receivePayload(all, { itemsById, supplierNameOf });
    if (payload.error) return setError(payload.error);
    const done = await run(() => onReceive({ receiptId, ...payload }));
    if (done) onDone(payload.lines.length);
  };

  return (
    <div className="isu-receive">
      <p className="isu-muted isu-small">
        Check the amounts, then tap Receive. Stock is added to each place and these lines come off the list for everyone.
      </p>
      {changed ? <p className="isu-receive-warn isu-small" role="status">{changed === 1 ? '1 item differs' : `${changed} items differ`} from the list. Check those first.</p> : null}
      <ErrorNote message={error} />
      {entries.map((g) => (
        <section key={g.label} className="isu-receive-group">
          <h3 className="isu-shop-group-title">{g.label}</h3>
          <ul className="isu-receive-list">
            {g.entries.map((e) => (
              <Entry key={e.key} entry={e} unit={itemsById.get(e.row.itemId)?.unitSymbol || e.row.unit || ''} onChange={(patch) => update(e.key, patch)} />
            ))}
          </ul>
        </section>
      ))}
      <div className="isu-quickcount-actions">
        <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="isu-btn isu-btn--primary" onClick={submit} disabled={busy || !all.some((e) => e.take)}>
          {busy ? 'Receiving…' : 'Receive'}
        </button>
      </div>
    </div>
  );
}
