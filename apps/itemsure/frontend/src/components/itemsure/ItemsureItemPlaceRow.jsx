import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { isEmptySlot } from '../../utils/itemsureItemStock.js';
import { daysLeft, describeDays, describeRate } from '../../utils/itemsureUsage.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';

const level = (text, unit) => (text === null || text === undefined ? 'not set' : `${displayQuantity(text)} ${unit}`);

/** One place for an item: how many, its levels, and what you can do there. */
export default function ItemsureItemPlaceRow({ item, slot, label, can, perDay = null, onAction }) {
  const rate = describeRate(perDay, item.unitSymbol);
  const left = slot.quantity !== null ? describeDays(daysLeft(slot.quantity, perDay)) : null;
  const status = slot.status && slot.status !== 'not_set_up' ? TARGET_STATUS[slot.status] : null;
  const hasAmount = slot.quantity !== null;
  // Only an empty place can go, and only when the person may undo every part of it.
  const canRemove = isEmptySlot(slot) && (slot.kept || slot.target) && (!slot.kept || can.items) && (!slot.target || can.levels);
  const par = slot.target?.par_text ?? null;
  const badges = (status ? 1 : 0) + (par !== null ? 1 : 0);

  return (
    <li className={`isu-card isu-place-row${slot.status === 'low' ? ' is-low' : ''}${badges ? ` has-badges-${badges}` : ''}`}>
      {badges ? (
        <div className="isu-place-badges">
          {status ? <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span> : null}
          {par !== null ? <span className="isu-badge isu-place-par">Fill up to {displayQuantity(par)} {item.unitSymbol}</span> : null}
        </div>
      ) : null}
      <div className="isu-place-row-head">
        <div>
          <strong>{label}</strong>
          {slot.target ? (
            <p className="isu-muted isu-small">Warn me at {level(slot.target.minimum_text, item.unitSymbol)}</p>
          ) : null}
        </div>
        <div className="isu-place-amount">
          {hasAmount ? (
            <span><strong>{displayQuantity(slot.quantity)}</strong> {item.unitSymbol}</span>
          ) : (
            <span className="isu-muted">No amount yet</span>
          )}
          {rate ? (
            <span className="isu-muted isu-small">
              Uses {rate}{left ? <> {'\u00b7'} lasts <strong className="isu-place-left">{left}</strong></> : null}
            </span>
          ) : null}
        </div>
      </div>
      <div className="isu-place-actions">
        {can.set ? (
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onAction('set', slot)}>
            {hasAmount ? 'Set amount' : 'Set starting amount'}
          </button>
        ) : null}
        {can.adjust && hasAmount ? (
          <>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('add', slot)}>+ Add</button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('remove', slot)}>{'\u2212'} Use</button>
          </>
        ) : null}
        {can.levels ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('levels', slot)}>
            {slot.target ? 'Change levels' : 'Set levels'}
          </button>
        ) : null}
        {canRemove ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('removePlace', slot)}>
            Remove place
          </button>
        ) : null}
      </div>
      {!hasAmount && !can.set ? (
        <p className="isu-muted isu-small">Count it on the Counts page to set a starting amount.</p>
      ) : null}
    </li>
  );
}
