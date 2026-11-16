import React, { useState } from 'react';
import { copyFirstLevels } from '../../utils/itemsureItemWizard.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { FILL_DAYS, suggestLevels, WARN_DAYS } from '../../utils/itemsureUsage.js';
import ItemsureStepper from './ItemsureStepper.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';
import ItemsureTopOffField from './ItemsureTopOffField.jsx';
import Tip from './ItemsureTip.jsx';

const blank = (text) => String(text ?? '').trim() === '';

/** Step 3: "Warn me at" and "Fill up to" for each place, with suggestions from past use. */
export default function ItemsureWizardLevels({ form, setForm, entries, setEntries, labelFor, unitInfo, usage }) {
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
      <ItemsureWizardIntro title="Warn & restock">
        Add where it&apos;s kept in the On hand step first.
      </ItemsureWizardIntro>
    );
  }

  return (
    <div className="isu-stack isu-wizard-fit-step">
      <ItemsureWizardIntro title="Warn & restock">
        Optional. Running low uses Warn me at; the shopping list fills up to par.
      </ItemsureWizardIntro>
      {active.length > 1 ? (
        <label className="isu-check isu-check--tight">
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
              <div className="isu-wizard-place-head">
                <strong>{same ? 'Every place' : labelFor(e)}</strong>
                {!same ? <span className="isu-wizard-onhand">On hand: <strong>{onHand(e)}</strong></span> : null}
              </div>
              {suggestion ? (
                <div className="isu-level-suggest isu-level-suggest--compact">
                  <span>Suggest warn {suggestion.minimum}, fill {suggestion.par} {unit} (~{WARN_DAYS}/{FILL_DAYS} days).</span>
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onMouseDown={(ev) => ev.preventDefault()} onClick={() => update(e.key, { minimum: suggestion.minimum, par: suggestion.par })}>
                    Use
                  </button>
                </div>
              ) : null}
              <div className="isu-wizard-levels">
                <div className="isu-wizard-amount">
                  <Tip label={`Shows Running low when ${same ? 'a spot' : 'this spot'} is at or below this`}>
                    <span>Warn me at ({unit})</span>
                  </Tip>
                  <ItemsureStepper label="warn me at" value={e.minimum} onChange={(v) => update(e.key, { minimum: v })} aria-label={`Warn me at, ${labelFor(e)}`} />
                </div>
                <div className="isu-wizard-amount">
                  <Tip label="Shopping list tops this spot back up to this amount (par)">
                    <span>Fill up to ({unit})</span>
                  </Tip>
                  <ItemsureStepper label="fill up to" value={e.par} onChange={(v) => update(e.key, { par: v })} aria-label={`Fill up to, ${labelFor(e)}`} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {form && 'topoff_percent' in form ? (
        <ItemsureTopOffField
          value={form.topoff_percent}
          onChange={(v) => setForm((f) => ({ ...f, topoff_percent: v }))}
          example={active.find((e) => !blank(e.par)) || null}
          unit={unit}
          compact
        />
      ) : null}
    </div>
  );
}
