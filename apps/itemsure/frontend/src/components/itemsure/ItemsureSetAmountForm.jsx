import React, { useState } from 'react';
import { setStockAmount } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';

/** "There are N here now." Starts from the current amount; saving records the difference. */
export default function ItemsureSetAmountForm({ item, slot, placeName, onDone }) {
  const [quantity, setQuantity] = useState(slot.quantity ?? '');
  const [note, setNote] = useState('');
  const { busy, error, run } = useItemsureAction();

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const place = { locationId: slot.locationId, storageAreaId: slot.storageAreaId, item };
      const result = await setStockAmount({ ...place, quantity, seen: slot.quantity, note });
      notifyInventoryChanged();
      if (!result?.changed) return onDone();
      const before = slot.quantity ?? '0';
      onDone({
        message: `${placeName}: set to ${displayQuantity(result.quantity)} ${item.unitSymbol}.`,
        undo: async () => {
          await setStockAmount({ ...place, quantity: before, seen: result.quantity, note: 'Undo' });
          notifyInventoryChanged();
        },
      });
    });
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p className="isu-muted">
        How many {item.name} are at <strong>{placeName}</strong> right now?
        {slot.quantity === null ? ' This sets the starting amount.' : ` It was ${displayQuantity(slot.quantity)} ${item.unitSymbol}.`}
      </p>
      <Field label={`Amount (${item.unitName})`}>
        <ItemsureStepper label={item.unitName} value={quantity} onChange={setQuantity} inputMode="decimal" autoComplete="off" />
      </Field>
      <Field label="Note (optional)" hint="Shown in the item's history.">
        <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: shelf count" />
      </Field>
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : 'Save amount'}
      </button>
    </form>
  );
}
