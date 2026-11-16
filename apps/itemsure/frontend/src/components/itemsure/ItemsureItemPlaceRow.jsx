import React, { useId } from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { isEmptySlot } from '../../utils/itemsureItemStock.js';
import { looseText } from '../../utils/itemsureLoose.js';
import { fillPercent } from '../../utils/itemsureItemLook.js';
import { daysLeft, describeDays, describeRate } from '../../utils/itemsureUsage.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import Tip from './ItemsureTip.jsx';

/** "Par 2 · warns at 1 btl". */
function levelsText(target, unit) {
  const par = target.par_text ?? null;
  const min = target.minimum_text ?? null;
  const parts = [par !== null ? `Par ${displayQuantity(par)}` : 'No par', min !== null ? `warns at ${displayQuantity(min)}` : 'no warning'];
  return `${parts.join(' \u00b7 ')} ${unit}`;
}

/**
 * One place for an item, as a compact row: name, on hand / par, a small bar, and the status.
 * Tapping it opens the buttons for that place.
 * `actionsOnly` (single-place modal): skip the amount/status header — the summary already shows it —
 * and keep the action buttons open.
 */
export default function ItemsureItemPlaceRow({ item, slot, label, can, perDay = null, open, onToggle, onAction, actionsOnly = false }) {
  const bodyId = useId();
  const rate = describeRate(perDay, item.unitSymbol);
  const left = slot.quantity !== null ? describeDays(daysLeft(slot.quantity, perDay)) : null;
  const status = slot.status ? TARGET_STATUS[slot.status] : null;
  const tone = status?.tone || 'muted';
  const hasAmount = slot.quantity !== null;
  // Only an empty place can go, and only when the person may undo every part of it.
  const canRemove = isEmptySlot(slot) && (slot.kept || slot.target) && (!slot.kept || can.items) && (!slot.target || can.levels);
  const par = slot.target?.par_text ?? null;
  const showBody = actionsOnly || open;

  return (
    <li className={`isu-card isu-place-row isu-place-row--${tone}${showBody ? ' is-open' : ''}${actionsOnly ? ' is-actions-only' : ''}`}>
      {actionsOnly ? (
        <div className="isu-place-row-place">
          <span className="isu-place-row-name">{label}</span>
        </div>
      ) : (
        <button type="button" className="isu-place-row-toggle" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
          <span className="isu-place-row-name">{label}</span>
          {hasAmount && item.loose ? (
            <span className="isu-place-row-amount">
              <strong>{looseText(slot.quantity, item.loose, item.unitName)}</strong>
              {par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(par)} {item.unitSymbol}</span> : null}
            </span>
          ) : (
            <span className="isu-place-row-amount">
              <strong>{hasAmount ? displayQuantity(slot.quantity) : '\u2013'}</strong>
              {par !== null ? <span className="isu-stockcard-par"> / {displayQuantity(par)}</span> : null}
              <span className="isu-stockcard-unit"> {item.unitSymbol}</span>
            </span>
          )}
          <span className="isu-place-row-status">
            {par !== null ? (
              <span className="isu-stockbar" aria-hidden="true">
                <span className={`isu-stockbar-fill isu-stockbar--${tone}`} style={{ width: `${fillPercent(slot.quantity, par)}%` }} />
              </span>
            ) : null}
            <span className={`isu-stockcard-label isu-stockcard-label--${status ? tone : 'muted'}`}>{status ? status.label : 'No par set'}</span>
          </span>
          <span className="isu-place-row-arrow" aria-hidden="true">{open ? '\u25b4' : '\u25be'}</span>
        </button>
      )}

      {showBody ? (
        <div className="isu-place-row-body" id={bodyId}>
          {slot.target || rate ? (
            <p className="isu-muted isu-small">
              {slot.target ? levelsText(slot.target, item.unitSymbol) : null}
              {slot.target && rate ? ` \u00b7 ` : null}
              {rate ? <>Uses {rate}{left ? <> {'\u00b7'} lasts <strong className="isu-place-left">{left}</strong></> : null}</> : null}
            </p>
          ) : null}
          <div className="isu-place-actions">
            {can.set ? (
              <Tip label={hasAmount ? 'Replace the on-hand amount here' : 'First count for this place'}>
                <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onAction('set', slot)}>
                  {hasAmount ? 'Set amount' : 'Set starting amount'}
                </button>
              </Tip>
            ) : null}
            {can.adjust && hasAmount ? (
              <>
                <Tip label="Add stock received or moved here">
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('add', slot)}>+ Add</button>
                </Tip>
                <Tip label="Take stock used or wasted">
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('remove', slot)}>{'\u2212'} Use</button>
                </Tip>
              </>
            ) : null}
            {can.levels ? (
              <Tip label="Warn-at and fill-up-to numbers for this place">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('levels', slot)}>
                  {slot.target ? 'Change levels' : 'Set levels'}
                </button>
              </Tip>
            ) : null}
            {canRemove ? (
              <Tip label="Stop keeping this item at this place">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('removePlace', slot)}>
                  Remove place
                </button>
              </Tip>
            ) : null}
          </div>
          {!hasAmount && !can.set ? (
            <p className="isu-muted isu-small">Count it on the Counts page to set a starting amount.</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
