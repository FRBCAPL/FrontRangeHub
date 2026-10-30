import React, { useEffect, useMemo, useState } from 'react';
import { transferStock } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useTransferGuard from '../../hooks/useTransferGuard.js';
import ItemsureTransferWarning from './ItemsureTransferWarning.jsx';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { stockEntry, usablePackages } from '../../utils/itemsurePackages.js';
import { findBalance, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsurePackageQuantity from './ItemsurePackageQuantity.jsx';
import ItemsureSpotCountNotice from './ItemsureSpotCountNotice.jsx';

/**
 * Moves stock between two established balances in one step: both sides post or neither does.
 * `preset` ({ itemId, locationId, storageAreaId }) fills in the item and "From" when opened from a spot.
 */
export default function ItemsureStockTransferForm({ data, defaultLocationId, preset = null, onDone }) {
  const { features } = useItemsureWorkspace();
  const options = useMemo(() => slotOptions(data.locations, { spots: features.spots }), [data.locations, features.spots]);
  const items = useMemo(() => data.items.filter((i) => i.isActive), [data.items]);
  const presetKey = preset ? slotKey(preset.locationId, preset.storageAreaId) : null;
  const firstKey = presetKey && options.some((o) => o.key === presetKey)
    ? presetKey
    : options.some((o) => o.key === slotKey(defaultLocationId)) ? slotKey(defaultLocationId) : options[0]?.key || '';
  const [itemId, setItemId] = useState(() => (preset && items.some((i) => i.id === preset.itemId) ? preset.itemId : items[0]?.id || ''));
  const [fromKey, setFromKey] = useState(firstKey);
  const [toKey, setToKey] = useState(() => {
    const others = options.filter((o) => o.key !== firstKey);
    // From a spot, start "To" on another place that already holds this item.
    const held = preset
      ? others.find((o) => {
          const { locationId, storageAreaId } = parseSlotKey(o.key);
          return findBalance(data.balances, preset.itemId, locationId, storageAreaId);
        })
      : null;
    return (held || others[0])?.key || firstKey;
  });
  const [packageId, setPackageId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useItemsureAction();

  const item = items.find((i) => i.id === itemId) || null;
  const packages = useMemo(
    () => (features.packaging ? usablePackages((data.packages || []).filter((p) => p.item_id === itemId)) : []),
    [data.packages, itemId, features.packaging],
  );
  const pkg = packages.find((p) => p.id === packageId) || null;
  const entry = item ? stockEntry(quantity, pkg, item) : null;
  const chooseItem = (id) => {
    setItemId(id);
    if (packageId) {
      setPackageId('');
      setQuantity('');
    }
  };
  /** The base quantity the source check needs; a bad package amount stops here with its own message. */
  const baseQuantity = () => {
    if (entry?.error) throw new Error(entry.error);
    return entry?.base ?? quantity;
  };
  const from = parseSlotKey(fromKey);
  const to = parseSlotKey(toKey);
  const fromBalance = item ? findBalance(data.balances, item.id, from.locationId, from.storageAreaId) : null;
  const toBalance = item ? findBalance(data.balances, item.id, to.locationId, to.storageAreaId) : null;
  const sameSlot = fromKey === toKey;

  const { warning, guard, confirm, clear } = useTransferGuard();
  useEffect(clear, [itemId, fromKey, toKey, quantity, packageId, clear]);

  const transfer = async () => {
    await transferStock({ item, from, to, quantity, note, pkg });
    await onDone();
  };
  const submit = (event) => {
    event.preventDefault();
    run(async () => guard({ item, from, quantity: baseQuantity() }, transfer));
  };

  if (!items.length || options.length < 2) return <p className="isu-muted">Transfers need at least two places to hold stock.</p>;

  const onHand = (balance) =>
    balance ? `On hand: ${displayQuantity(balance.quantity_text)} ${item.unitSymbol}` : 'No amount here yet';

  return (
    <form className="isu-stack" onSubmit={submit}>
      <Field label="Item">
        <select value={itemId} onChange={(e) => chooseItem(e.target.value)}>
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

      {sameSlot ? <p className="isu-notice isu-notice--warn">Choose two different places.</p> : (
        <ItemsureSpotCountNotice
          itemId={item?.id}
          spots={[{ ...from, label: 'Moving from here' }, { ...to, label: 'Moving to here' }]}
        />
      )}
      {!sameSlot && item && (!fromBalance || !toBalance) ? (
        <p className="isu-notice isu-notice--warn">
          Both places need a starting balance for {item.name}. Count and approve the place that isn&apos;t set up first.
        </p>
      ) : null}

      {item ? (
        <ItemsurePackageQuantity
          item={item}
          packages={packages}
          packageId={packageId}
          onPackageChange={setPackageId}
          quantity={quantity}
          onQuantityChange={setQuantity}
          entry={entry}
        />
      ) : null}
      <Field label="Note" hint="Optional.">
        <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <ErrorNote message={error} />
      {warning ? (
        <ItemsureTransferWarning warning={warning} busy={busy} onCancel={clear} onConfirm={() => run(async () => confirm({ item, from, quantity: baseQuantity() }, transfer))} />
      ) : (
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || sameSlot || !fromBalance || !toBalance}>
          {busy ? 'Checking…' : 'Transfer'}
        </button>
      )}
    </form>
  );
}
