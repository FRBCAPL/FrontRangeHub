import React, { useState } from 'react';
import { adjustStock } from '../../services/itemsureInventoryService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';

const REASONS = {
  add: ['Delivery received', 'Returned', 'Correction'],
  remove: ['Used', 'Sold', 'Damaged', 'Expired', 'Correction'],
};

/** Add (a delivery) or Use (take some out) at one place, with a one-tap reason. */
export default function ItemsureQuickChangeForm({ item, slot, placeName, direction, onDone }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(REASONS[direction][0]);
  const { busy, error, run } = useItemsureAction();
  const adding = direction === 'add';

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const place = { locationId: slot.locationId, storageAreaId: slot.storageAreaId, item };
      await adjustStock({ ...place, direction, quantity, reason });
      notifyInventoryChanged();
      onDone({
        message: `${placeName}: ${adding ? 'added' : 'took out'} ${displayQuantity(quantity)} ${item.unitSymbol}.`,
        undo: async () => {
          await adjustStock({ ...place, direction: adding ? 'remove' : 'add', quantity, reason: 'Undo' });
          notifyInventoryChanged();
        },
      });
    });
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p className="isu-muted">
        {adding ? 'Add to' : 'Take out of'} <strong>{placeName}</strong>. Now: {displayQuantity(slot.quantity)} {item.unitSymbol}.
      </p>
      <Field label={`How many (${item.unitName})`}>
        <ItemsureStepper label={item.unitName} value={quantity} onChange={setQuantity} inputMode="decimal" autoComplete="off" />
      </Field>
      <fieldset className="isu-fieldset">
        <legend>Why</legend>
        <div className="isu-chip-row">
          {REASONS[direction].map((r) => (
            <button key={r} type="button" className={`isu-chip isu-chip--choice${reason === r ? ' is-selected' : ''}`} aria-pressed={reason === r} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : adding ? 'Add' : 'Take out'}
      </button>
    </form>
  );
}
