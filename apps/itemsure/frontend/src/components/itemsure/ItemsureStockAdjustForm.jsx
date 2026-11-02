import React, { useMemo, useState } from 'react';
import { adjustStock } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { amountProblem } from '../../utils/itemsureAmountCheck.js';
import { stockEntry, usablePackages } from '../../utils/itemsurePackages.js';
import { findBalance, itemsAtSlot, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { sites } from '../../data/itemsureTerms.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsurePackageQuantity from './ItemsurePackageQuantity.jsx';
import ItemsureSpotCountNotice from './ItemsureSpotCountNotice.jsx';
import ItemsureStockItemPicker from './ItemsureStockItemPicker.jsx';
import ItemsureSetAmountForm from './ItemsureSetAmountForm.jsx';

const REASONS = ['Delivery received', 'Used', 'Damaged', 'Expired', 'Returned', 'Correction'];

/**
 * Adds to or removes from an established balance. Never sets one up itself: a missing balance
 * goes through Set amount (people who may approve counts) or a count.
 * `preset` ({ itemId, locationId, storageAreaId, direction }) fills it in when opened from a spot.
 */
export default function ItemsureStockAdjustForm({ data, defaultLocationId, preset = null, onDone }) {
  const { features, can } = useItemsureWorkspace();
  const options = useMemo(() => slotOptions(data.locations, { spots: features.spots }), [data.locations, features.spots]);
  const items = useMemo(() => data.items.filter((i) => i.isActive), [data.items]);
  const splitAt = (key) => {
    const at = parseSlotKey(key);
    return itemsAtSlot(items, data, at.locationId, at.storageAreaId);
  };
  const [slot, setSlot] = useState(() => {
    const wanted = preset?.locationId ? slotKey(preset.locationId, preset.storageAreaId) : null;
    if (options.some((o) => o.key === wanted)) return wanted;
    // The site's first spot (Loose is listed last), else the first place anywhere.
    return options.find((o) => o.key.startsWith(`${defaultLocationId}|`))?.key || options[0]?.key || '';
  });
  const [itemId, setItemId] = useState(() => {
    if (preset && items.some((i) => i.id === preset.itemId)) return preset.itemId;
    const { here, others } = splitAt(slot);
    return here[0]?.id || others[0]?.id || '';
  });
  const [showOthers, setShowOthers] = useState(() => !splitAt(slot).here.some((i) => i.id === itemId));
  const [settingStart, setSettingStart] = useState(false);
  const [direction, setDirection] = useState(preset?.direction === 'remove' ? 'remove' : 'add');
  const [packageId, setPackageId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useItemsureAction();

  const { locationId, storageAreaId } = parseSlotKey(slot);
  const split = useMemo(() => itemsAtSlot(items, data, locationId, storageAreaId), [items, data, locationId, storageAreaId]);
  const listingOthers = showOthers || !split.here.length;
  const canSetStart = can('inventory.adjust') && can('counts.approve');
  const item = items.find((i) => i.id === itemId) || null;
  const balance = item ? findBalance(data.balances, item.id, locationId, storageAreaId) : null;
  const packages = useMemo(
    () => (features.packaging ? usablePackages((data.packages || []).filter((p) => p.item_id === itemId)) : []),
    [data.packages, itemId, features.packaging],
  );
  const pkg = packages.find((p) => p.id === packageId) || null;
  const entry = item ? stockEntry(quantity, pkg, item) : null;
  const amount = amountProblem({ entry, item, onHand: balance?.quantity_text ?? null, removing: direction === 'remove' });

  const chooseItem = (id) => {
    setItemId(id);
    if (packageId) {
      setPackageId('');
      setQuantity('');
    }
  };

  // A new spot lists its own items; keep the chosen item only if it is kept there too.
  const chooseSlot = (key) => {
    setSlot(key);
    setShowOthers(false);
    const next = splitAt(key);
    if (!next.here.some((i) => i.id === itemId)) chooseItem(next.here[0]?.id || next.others[0]?.id || '');
  };
  const listOthers = (on) => {
    setShowOthers(on);
    const list = on ? split.others : split.here;
    if (!list.some((i) => i.id === itemId)) chooseItem(list[0]?.id || '');
  };

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      await adjustStock({ locationId, storageAreaId, item, direction, quantity, reason, pkg });
      await onDone();
    });
  };

  if (!items.length || !options.length) return <p className="isu-muted">Add items and {sites} first.</p>;

  const placeName = options.find((o) => o.key === slot)?.label || '';
  if (settingStart && item && !balance) {
    return (
      <div className="isu-stack">
        <ItemsureSetAmountForm item={item} slot={{ locationId, storageAreaId, quantity: null }} placeName={placeName} onDone={() => onDone()} />
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setSettingStart(false)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <form className="isu-stack" onSubmit={submit}>
      <Field label="Where">
        <select value={slot} onChange={(e) => chooseSlot(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <ItemsureStockItemPicker
        here={split.here}
        others={split.others}
        itemId={itemId}
        onChoose={chooseItem}
        listingOthers={listingOthers}
        onListOthers={listOthers}
      />

      <ItemsureSpotCountNotice itemId={item?.id} spots={[{ locationId, storageAreaId }]} />
      {balance ? (
        <p className="isu-muted isu-small">On hand here: {displayQuantity(balance.quantity_text)} {item.unitSymbol}</p>
      ) : canSetStart && item ? (
        <div className="isu-notice isu-notice--warn">
          <p>{item.name} has no amount here yet. Set how many are here now, then you can add or use from it.</p>
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => setSettingStart(true)}>
            Set the starting amount
          </button>
        </div>
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
      {amount.message ? <p className="isu-hint isu-package-problem" aria-live="polite">{amount.message}</p> : null}
      <Field label="Reason" hint="Required. Shown in stock activity.">
        <input list="isu-adjust-reasons" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <datalist id="isu-adjust-reasons">
        {REASONS.map((r) => <option key={r} value={r} />)}
      </datalist>

      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !balance || !amount.ready}>
        {busy ? 'Saving…' : direction === 'add' ? 'Add to stock' : 'Remove from stock'}
      </button>
    </form>
  );
}
