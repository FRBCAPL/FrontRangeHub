import React, { useState } from 'react';
import { setStockAmount } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureLooseInput from './ItemsureLooseInput.jsx';
import useLoosePieces from '../../hooks/useLoosePieces.js';
import { looseText } from '../../utils/itemsureLoose.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';

/** "There are N here now." Starts from the current amount; saving records the difference. */
export default function ItemsureSetAmountForm({ item, slot, placeName, onDone }) {
  const [quantity, setQuantity] = useState(slot.quantity ?? '');
  const [note, setNote] = useState('');
  const { busy, error, run } = useItemsureAction();
  const pieces = useLoosePieces()(item.id);
  const amount = (text) => (pieces && looseText(text, pieces, item.unitName)) || `${displayQuantity(text)} ${item.unitSymbol}`;

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const place = { locationId: slot.locationId, storageAreaId: slot.storageAreaId, item };
      const result = await setStockAmount({ ...place, quantity, seen: slot.quantity, note });
      notifyInventoryChanged();
      if (!result?.changed) return onDone();
      const before = slot.quantity ?? '0';
      onDone({
        message: `${placeName}: set to ${amount(result.quantity)}.`,
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
        {slot.quantity === null ? ' This sets the starting amount.' : ` It was ${amount(slot.quantity)}.`}
      </p>
      {pieces ? (
        <div className="isu-field">
          <span>How many now ({pieces} in one {singularUnit(item.unitName).toLowerCase()})</span>
          <ItemsureLooseInput label={item.name} value={quantity} onChange={setQuantity} pieces={pieces} precision={item.precision} unitName={item.unitName} />
        </div>
      ) : (
        <Field label={`Amount (${item.unitName})`}>
          <ItemsureStepper label={item.unitName} value={quantity} onChange={setQuantity} inputMode="decimal" autoComplete="off" />
        </Field>
      )}
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
