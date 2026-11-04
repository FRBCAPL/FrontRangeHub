import React, { useEffect, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { listSalesSpots, setSalesSpots } from '../../services/itemsurePosStockService.js';
import { moveSpot, orderedSpots } from '../../utils/itemsurePosStock.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Which spot sales come out of first (where drinks are served from), then next, and so on. */
export default function ItemsurePosSpotOrder({ organizationId, locationId, canEdit }) {
  const [spots, setSpots] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useItemsureAction();

  useEffect(() => {
    let live = true;
    Promise.all([listLocations(organizationId), listSalesSpots(locationId)])
      .then(([locations, savedIds]) => {
        const areas = locations.find((l) => l.id === locationId)?.storageAreas || [];
        if (live) setSpots(orderedSpots(areas, savedIds));
      })
      .catch(() => live && setSpots([]));
    return () => {
      live = false;
    };
  }, [organizationId, locationId]);

  if (!spots) return null;
  if (!spots.length) return <p className="isu-muted isu-small">Add spots to this site first, like Bar or Cooler.</p>;

  const move = (index, step) => {
    setSpots((list) => moveSpot(list, index, step));
    setDirty(true);
    setSaved(false);
  };
  const save = async () => {
    if (await run(() => setSalesSpots(locationId, spots.map((s) => s.id)))) {
      setDirty(false);
      setSaved(true);
    }
  };

  return (
    <div className="isu-pos-spots">
      <p className="isu-small"><strong>Take sales from these spots, in this order</strong></p>
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
      {saved ? <p className="isu-notice isu-small" role="status">Spot order saved.</p> : null}
      {canEdit && dirty ? (
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save order'}</button>
      ) : null}
    </div>
  );
}
