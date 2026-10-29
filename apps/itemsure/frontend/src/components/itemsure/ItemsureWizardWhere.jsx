import React from 'react';
import { canRemoveEntry, hasSavedStock, makeEntry } from '../../utils/itemsureItemWizard.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { parseSlotKey, slotOptions } from '../../utils/itemsureStock.js';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

/** Step 2: the places it's kept, and how many are on hand at each right now. */
export default function ItemsureWizardWhere({ entries, setEntries, labelFor, unitInfo, allowed, features, locations }) {
  const taken = new Set(entries.map((e) => e.key));
  const options = slotOptions(locations, { spots: features.spots }).filter((o) => !taken.has(o.key));
  const update = (key, patch) => setEntries((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const add = (key) => {
    if (!key) return;
    const { locationId, storageAreaId } = parseSlotKey(key);
    setEntries((list) => [...list, makeEntry({ locationId, storageAreaId, isNew: true })]);
  };
  const unit = unitInfo.unitSymbol || unitInfo.unitName;

  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="Where is it, and how many are on hand?">
        Add each place you keep it{allowed.amounts ? ', then enter how many are there right now' : ''}. You can skip this and do it later.
      </ItemsureWizardIntro>
      {!allowed.amounts ? <p className="isu-muted isu-small">Your role can&apos;t set on-hand amounts. Counts will fill them in.</p> : null}

      {entries.length ? (
        <ul className="isu-wizard-places">
          {entries.map((e) => (
            <li key={e.key} className={`isu-wizard-place${e.remove ? ' is-removing' : ''}`}>
              <div className="isu-wizard-place-head">
                <strong>{labelFor(e)}</strong>
                {e.isNew ? (
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setEntries((list) => list.filter((x) => x.key !== e.key))}>
                    Remove
                  </button>
                ) : e.remove ? (
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => update(e.key, { remove: false })}>
                    Keep it
                  </button>
                ) : canRemoveEntry(e, allowed) ? (
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => update(e.key, { remove: true, amount: e.quantity ?? '' })}>
                    Remove
                  </button>
                ) : null}
              </div>
              {e.remove ? (
                <p className="isu-wizard-removing">
                  This place will be taken off the item when you save
                  {hasSavedStock(e) ? `. Its ${displayQuantity(e.quantity)} ${unit} on hand will be set to 0, and that is recorded in history` : ''}
                  {e.target ? '. Its warning levels will be cleared' : ''}.
                  {hasSavedStock(e) ? ' If the stock moved to another spot, tap Keep it and use Move on the Stock page instead.' : ''}
                </p>
              ) : allowed.amounts ? (
                <div className="isu-wizard-amount">
                  <span>On hand now ({unit})</span>
                  <ItemsureStepper
                    label="on hand"
                    value={e.amount}
                    onChange={(v) => update(e.key, { amount: v })}
                    aria-label={`On hand now at ${labelFor(e)}`}
                    placeholder="Leave blank if you don't know yet"
                  />
                  {e.quantity !== null ? <span className="isu-muted isu-small">Saved amount: {displayQuantity(e.quantity)} {unit}</span> : null}
                </div>
              ) : (
                <p className="isu-wizard-onhand">On hand now: <strong>{e.quantity !== null ? `${displayQuantity(e.quantity)} ${unit}` : 'not set yet'}</strong></p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="isu-muted">No places yet.</p>
      )}

      {options.length ? (
        <select className="isu-other-place" value="" onChange={(ev) => add(ev.target.value)} aria-label="Add a place">
          <option value="">+ Add a place…</option>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      ) : null}
      {!locations.length ? <p className="isu-muted isu-small">Add a location first (More → Locations).</p> : null}
    </div>
  );
}
