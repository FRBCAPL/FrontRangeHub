import React, { useMemo, useState } from 'react';
import { adjustStock } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { stockEntry, usablePackages } from '../../utils/itemsurePackages.js';
import { findBalance, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { sites } from '../../data/itemsureTerms.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsurePackageQuantity from './ItemsurePackageQuantity.jsx';
import ItemsureSpotCountNotice from './ItemsureSpotCountNotice.jsx';

const REASONS = ['Delivery received', 'Used', 'Damaged', 'Expired', 'Returned', 'Correction'];

/**
 * Adds to or removes from an established balance. Never sets one up.
 * `preset` ({ itemId, locationId, storageAreaId, direction }) fills it in when opened from a spot.
 */
export default function ItemsureStockAdjustForm({ data, defaultLocationId, preset = null, onDone }) {
  const { features } = useItemsureWorkspace();
  const options = useMemo(() => slotOptions(data.locations, { spots: features.spots }), [data.locations, features.spots]);
  const items = useMemo(() => data.items.filter((i) => i.isActive), [data.items]);
  const [slot, setSlot] = useState(() => {
    const wanted = preset ? slotKey(preset.locationId, preset.storageAreaId) : slotKey(defaultLocationId);
    if (options.some((o) => o.key === wanted)) return wanted;
    return options.some((o) => o.key === slotKey(defaultLocationId)) ? slotKey(defaultLocationId) : options[0]?.key || '';
  });
  const [itemId, setItemId] = useState(() => (preset && items.some((i) => i.id === preset.itemId) ? preset.itemId : items[0]?.id || ''));
  const [direction, setDirection] = useState(preset?.direction === 'remove' ? 'remove' : 'add');
  const [packageId, setPackageId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useItemsureAction();

  const { locationId, storageAreaId } = parseSlotKey(slot);
  const item = items.find((i) => i.id === itemId) || null;
  const balance = item ? findBalance(data.balances, item.id, locationId, storageAreaId) : null;
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

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      await adjustStock({ locationId, storageAreaId, item, direction, quantity, reason, pkg });
      await onDone();
    });
  };

  if (!items.length || !options.length) return <p className="isu-muted">Add items and {sites} first.</p>;

  return (
    <form className="isu-stack" onSubmit={submit}>
      <Field label="Where">
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Item">
        <select value={itemId} onChange={(e) => chooseItem(e.target.value)}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>

      <ItemsureSpotCountNotice itemId={item?.id} spots={[{ locationId, storageAreaId }]} />
      {balance ? (
        <p className="isu-muted isu-small">On hand here: {displayQuantity(balance.quantity_text)} {item.unitSymbol}</p>
      ) : (
        <p className="isu-notice isu-notice--warn">No starting balance here yet. Count it and approve the count to set it up.</p>
      )}

      <fieldset className="isu-fieldset">
        <legend>Change</legend>
        <div className="isu-chip-row">
          {[['add', 'Add'], ['remove', 'Remove']].map(([value, label]) => (
            <button key={value} type="button" className={`isu-chip isu-chip--choice${direction === value ? ' is-selected' : ''}`} aria-pressed={direction === value} onClick={() => setDirection(value)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

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
      <Field label="Reason" hint="Required. Shown in stock activity.">
        <input list="isu-adjust-reasons" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <datalist id="isu-adjust-reasons">
        {REASONS.map((r) => <option key={r} value={r} />)}
      </datalist>

      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !balance}>
        {busy ? 'Saving…' : direction === 'add' ? 'Add to stock' : 'Remove from stock'}
      </button>
    </form>
  );
}
