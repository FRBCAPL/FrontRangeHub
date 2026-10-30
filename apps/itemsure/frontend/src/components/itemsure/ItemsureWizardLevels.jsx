import React, { useState } from 'react';
import { copyFirstLevels } from '../../utils/itemsureItemWizard.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { FILL_DAYS, suggestLevels, WARN_DAYS } from '../../utils/itemsureUsage.js';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

const blank = (text) => String(text ?? '').trim() === '';

/** Step 3: "Warn me at" and "Fill up to" for each place, with suggestions from past use. */
export default function ItemsureWizardLevels({ entries, setEntries, labelFor, unitInfo, usage }) {
  const [same, setSame] = useState(false);
  const active = entries.filter((e) => !e.remove);
  const shown = same ? active.slice(0, 1) : active;
  const update = (key, patch) =>
    setEntries((list) => {
      const next = list.map((e) => (e.key === key ? { ...e, ...patch } : e));
      return same ? copyFirstLevels(next) : next;
    });
  const unit = unitInfo.unitSymbol || unitInfo.unitName;
  const onHand = (e) => (blank(e.amount) ? 'not set yet' : `${displayQuantity(e.amount)} ${unit}`);

  if (!active.length) {
    return (
      <ItemsureWizardIntro title="Low-stock warning and restock target">
        Add where it&apos;s kept in the On hand step first. These are set for each place you keep the item.
      </ItemsureWizardIntro>
    );
  }

  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="Low-stock warning and restock target">
        These are not your count. They tell ItemSure when to warn you and how much to restock. Both are optional.
      </ItemsureWizardIntro>
      {active.length > 1 ? (
        <label className="isu-check">
          <input
            type="checkbox"
            checked={same}
            onChange={(ev) => {
              setSame(ev.target.checked);
              if (ev.target.checked) setEntries(copyFirstLevels);
            }}
          />
          <span>Same for every place</span>
        </label>
      ) : null}

      <ul className="isu-wizard-places">
        {shown.map((e) => {
          const suggestion = usage ? suggestLevels(usage.forSlot(e.locationId, e.storageAreaId), unitInfo.precision) : null;
          return (
            <li key={e.key} className="isu-wizard-place">
              <strong>{same ? 'Every place' : labelFor(e)}</strong>
              {!same ? <p className="isu-wizard-onhand">On hand now: <strong>{onHand(e)}</strong></p> : null}
              {suggestion ? (
                <div className="isu-level-suggest">
                  <p>Suggested from your last 4 weeks: warn at {suggestion.minimum}, fill up to {suggestion.par} {unit}.</p>
                  <p className="isu-muted isu-small">Warns with about {WARN_DAYS} days left; fills up for about {FILL_DAYS} days.</p>
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => update(e.key, { minimum: suggestion.minimum, par: suggestion.par })}>
                    Use these
                  </button>
                </div>
              ) : null}
              <div className="isu-wizard-levels">
                <div className="isu-wizard-amount">
                  <span>Warn me at ({unit})</span>
                  <ItemsureStepper label="warn me at" value={e.minimum} onChange={(v) => update(e.key, { minimum: v })} aria-label={`Warn me at, ${labelFor(e)}`} />
                  <span className="isu-muted isu-small">Shows as Running low when {same ? 'a spot' : 'this spot'} is at or below this.</span>
                </div>
                <div className="isu-wizard-amount">
                  <span>Fill up to ({unit})</span>
                  <ItemsureStepper label="fill up to" value={e.par} onChange={(v) => update(e.key, { par: v })} aria-label={`Fill up to, ${labelFor(e)}`} />
                  <span className="isu-muted isu-small">The shopping list tops it back up to this.</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
