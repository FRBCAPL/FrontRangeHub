import React, { useEffect, useState } from 'react';
import { transferStock } from '../../services/itemsureInventoryService.js';
import { completePlan, planTransfer } from '../../services/itemsureRestockService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useTransferGuard from '../../hooks/useTransferGuard.js';
import ItemsureTransferWarning from './ItemsureTransferWarning.jsx';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { slotLabel } from '../../utils/itemsureStock.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureSpotCountNotice from './ItemsureSpotCountNotice.jsx';

const COPY = {
  transfer: { button: 'Transfer now', busy: 'Transferring…', note: 'Stock moves right away. ItemSure re-checks what is on hand first.' },
  plan: { button: 'Save plan', busy: 'Saving…', note: 'A plan is a reminder. It does not hold stock or change any balance.' },
  complete: { button: 'Complete transfer', busy: 'Transferring…', note: 'Moves the stock now. ItemSure re-checks what is on hand first.' },
};

/**
 * Confirms a suggested transfer, a plan, or completing a plan. Transfers and
 * completions both go through the existing transfer operation.
 * action: { kind, item, from: { locationId, storageAreaId }, to, quantity, planId? }
 */
export default function ItemsureRestockAction({ action, locations, onDone }) {
  const [quantity, setQuantity] = useState(displayQuantity(action.quantity));
  const [note, setNote] = useState(action.kind === 'transfer' ? 'Restock' : '');
  const { busy, error, run } = useItemsureAction();
  const copy = COPY[action.kind];
  const { item } = action;

  const { warning, guard, confirm, clear } = useTransferGuard();
  useEffect(clear, [quantity, clear]);

  const execute = async () => {
    if (action.kind === 'transfer') await transferStock({ item, from: action.from, to: action.to, quantity, note });
    else if (action.kind === 'plan') await planTransfer({ item, from: action.from, to: action.to, quantity, note });
    else await completePlan(action.planId, quantity === displayQuantity(action.quantity) ? null : quantity, item);
    await onDone();
  };
  const submit = (event) => {
    event.preventDefault();
    run(() => (action.kind === 'plan' ? execute() : guard({ item, from: action.from, quantity }, execute)));
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p>
        <strong>{item.name}</strong>
        <br />
        <span className="isu-muted">
          From {slotLabel(locations, action.from.locationId, action.from.storageAreaId)}
          <br />
          To {slotLabel(locations, action.to.locationId, action.to.storageAreaId)}
        </span>
      </p>
      {action.kind !== 'plan' ? (
        <ItemsureSpotCountNotice
          itemId={item.id}
          spots={[{ ...action.from, label: 'Moving from here' }, { ...action.to, label: 'Moving to here' }]}
        />
      ) : null}
      <Field label={`Quantity (${item.unitName})`}>
        <ItemsureStepper label={item.unitName} value={quantity} onChange={setQuantity} />
      </Field>
      {action.kind !== 'complete' ? (
        <Field label="Note" hint="Optional.">
          <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      ) : null}
      <p className="isu-muted isu-small">{copy.note}</p>
      <ErrorNote message={error} />
      {warning ? (
        <ItemsureTransferWarning warning={warning} busy={busy} onCancel={clear} onConfirm={() => run(() => confirm({ item, from: action.from, quantity }, execute))} />
      ) : (
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
          {busy ? copy.busy : copy.button}
        </button>
      )}
    </form>
  );
}
