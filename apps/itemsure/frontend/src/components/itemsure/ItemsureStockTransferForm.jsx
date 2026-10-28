import React, { useEffect, useMemo, useState } from 'react';
import { transferStock } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useTransferGuard from '../../hooks/useTransferGuard.js';
import ItemsureTransferWarning from './ItemsureTransferWarning.jsx';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { findBalance, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/** Moves stock between two established balances in one step: both sides post or neither does. */
export default function ItemsureStockTransferForm({ data, defaultLocationId, onDone }) {
  const options = useMemo(() => slotOptions(data.locations), [data.locations]);
  const items = useMemo(() => data.items.filter((i) => i.isActive), [data.items]);
  const firstKey = options.some((o) => o.key === slotKey(defaultLocationId)) ? slotKey(defaultLocationId) : options[0]?.key || '';
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [fromKey, setFromKey] = useState(firstKey);
  const [toKey, setToKey] = useState(() => options.find((o) => o.key !== firstKey)?.key || firstKey);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useItemsureAction();

  const item = items.find((i) => i.id === itemId) || null;
  const from = parseSlotKey(fromKey);
  const to = parseSlotKey(toKey);
  const fromBalance = item ? findBalance(data.balances, item.id, from.locationId, from.storageAreaId) : null;
  const toBalance = item ? findBalance(data.balances, item.id, to.locationId, to.storageAreaId) : null;
  const sameSlot = fromKey === toKey;

  const { warning, guard, confirm, clear } = useTransferGuard();
  useEffect(clear, [itemId, fromKey, toKey, quantity, clear]);

  const transfer = async () => {
    await transferStock({ item, from, to, quantity, note });
    await onDone();
  };
  const submit = (event) => {
    event.preventDefault();
    run(() => guard({ item, from, quantity }, transfer));
  };

  if (!items.length || options.length < 2) return <p className="isu-muted">Transfers need at least two places to hold stock.</p>;

  const onHand = (balance) =>
    balance ? `On hand: ${displayQuantity(balance.quantity_text)} ${item.unitSymbol}` : 'Not set up here yet';

  return (
    <form className="isu-stack" onSubmit={submit}>
      <Field label="Item">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="From" hint={item ? onHand(fromBalance) : undefined}>
        <select value={fromKey} onChange={(e) => setFromKey(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="To" hint={item ? onHand(toBalance) : undefined}>
        <select value={toKey} onChange={(e) => setToKey(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>

      {sameSlot ? <p className="isu-notice isu-notice--warn">Choose two different places.</p> : null}
      {!sameSlot && item && (!fromBalance || !toBalance) ? (
        <p className="isu-notice isu-notice--warn">
          Both places need a starting balance for {item.name}. Count and approve the place that isn&apos;t set up first.
        </p>
      ) : null}

      <Field label={`Quantity${item ? ` (${item.unitName})` : ''}`}>
        <input inputMode="decimal" autoComplete="off" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>
      <Field label="Note" hint="Optional.">
        <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <ErrorNote message={error} />
      {warning ? (
        <ItemsureTransferWarning warning={warning} busy={busy} onCancel={clear} onConfirm={() => run(() => confirm({ item, from, quantity }, transfer))} />
      ) : (
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || sameSlot || !fromBalance || !toBalance}>
          {busy ? 'Checking…' : 'Transfer'}
        </button>
      )}
    </form>
  );
}
