import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setSalesSpots } from '../../services/itemsurePosStockService.js';
import { moveSpot } from '../../utils/itemsurePosStock.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Inside the "Where sales come from" pop-up: reorder the spots, then save. onSaved(spots). */
export default function ItemsurePosSpotEdit({ locationId, spots: startSpots, canEdit, onSaved, onCancel }) {
  const [spots, setSpots] = useState(startSpots);
  const [dirty, setDirty] = useState(false);
  const { busy, error, run } = useItemsureAction();

  const move = (index, step) => {
    setSpots((list) => moveSpot(list, index, step));
    setDirty(true);
  };
  const save = async () => {
    if (await run(() => setSalesSpots(locationId, spots.map((s) => s.id)))) onSaved(spots);
  };

  return (
    <div className="isu-pos-spots">
      <p className="isu-muted isu-small">Put the spot you serve from first. If it runs out, the rest comes from the next one.</p>
      <ol className="isu-pos-spot-list">
        {spots.map((s, i) => (
          <li key={s.id} className="isu-pos-spot">
            <span className="isu-pos-spot-name">{i + 1}. {s.name}{i === 0 ? <span className="isu-muted isu-small"> · served from</span> : null}</span>
            {canEdit ? (
              <span className="isu-pos-spot-moves">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}>{'\u2191'}</button>
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || i === spots.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}>{'\u2193'}</button>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save order'}</button>
        ) : null}
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>{canEdit ? 'Cancel' : 'Close'}</button>
      </div>
    </div>
  );
}
