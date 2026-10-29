import React, { useState } from 'react';
import { saveTargets } from '../../services/itemsureTargetService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { validateTargetEdit } from '../../utils/itemsureTargets.js';
import { FILL_DAYS, WARN_DAYS } from '../../utils/itemsureUsage.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';

/** "Warn me at" (minimum) and "Fill up to" (par) for one item at one place. */
export default function ItemsureSlotLevelsForm({ organizationId, item, slot, placeName, suggestion = null, usageReady = null, onDone }) {
  const [minimum, setMinimum] = useState(slot.target?.minimum_text ?? '');
  const [par, setPar] = useState(slot.target?.par_text ?? '');
  const { busy, error, setError, run } = useItemsureAction();

  const save = (levels) =>
    run(async () => {
      const [result] = await saveTargets(organizationId, [{
        item_id: item.id,
        location_id: slot.locationId,
        storage_area_id: slot.storageAreaId || null,
        minimum: levels.minimum,
        par: levels.par,
        expected_updated_at: slot.target?.updated_at ?? null,
      }]);
      if (!result?.ok) throw new Error(result?.error || 'Could not save these levels.');
      notifyInventoryChanged();
      onDone();
    });

  const submit = (event) => {
    event.preventDefault();
    const checked = validateTargetEdit({ minimum, par }, item.precision, item.unitName);
    if (checked.error) {
      setError(checked.error);
      return;
    }
    save(checked);
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p className="isu-muted">For {item.name} at <strong>{placeName}</strong>. Leave either one blank if you don&apos;t need it.</p>
      {suggestion ? (
        <div className="isu-level-suggest">
          <p>
            <strong>Suggested from your last 4 weeks:</strong> warn me at {suggestion.minimum}, fill up to {suggestion.par} {item.unitSymbol}.
          </p>
          <p className="isu-muted isu-small">That warns you with about {WARN_DAYS} days left and fills up for about {FILL_DAYS} days.</p>
          <button
            type="button"
            className="isu-btn isu-btn--ghost isu-btn--sm"
            onClick={() => {
              setMinimum(suggestion.minimum);
              setPar(suggestion.par);
            }}
          >
            Use these
          </button>
        </div>
      ) : usageReady === null ? null : (
        <p className="isu-muted isu-small">
          {usageReady ? 'No suggestion yet: none has been used here in the last 4 weeks.' : 'Suggestions appear after about a week of history.'}
        </p>
      )}
      <Field label="Warn me at" hint="When the amount drops to this number or lower, it shows as Low stock.">
        <ItemsureStepper label="warn me at" value={minimum} onChange={setMinimum} inputMode="decimal" autoComplete="off" />
      </Field>
      <Field label="Fill up to" hint="How many you want after restocking. Restock suggestions top you up to this.">
        <ItemsureStepper label="fill up to" value={par} onChange={setPar} inputMode="decimal" autoComplete="off" />
      </Field>
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : 'Save levels'}
      </button>
      {slot.target ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--block" disabled={busy} onClick={() => save({ minimum: null, par: null })}>
          Remove levels from this place
        </button>
      ) : null}
    </form>
  );
}
