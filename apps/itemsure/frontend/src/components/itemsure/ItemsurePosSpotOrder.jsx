import React, { useEffect, useState } from 'react';
import { listLocations } from '../../services/itemsureLocationService.js';
import { listSalesSpots } from '../../services/itemsurePosStockService.js';
import { orderedSpots } from '../../utils/itemsurePosStock.js';
import { Modal } from './ItemsureUi.jsx';
import ItemsurePosSpotEdit from './ItemsurePosSpotEdit.jsx';

const SHOWN = 3;

const orderText = (spots) => {
  const names = spots.slice(0, SHOWN).map((s) => s.name);
  const more = spots.length - names.length;
  if (names.length === 1) return `${names[0]}.`;
  return `${names[0]} first, then ${names.slice(1).join(', ')}${more ? ` and ${more} more` : ''}.`;
};

/** Which spot sales come out of first (where drinks are served from): a short summary and a button that opens the pop-up. */
export default function ItemsurePosSpotOrder({ organizationId, locationId, canEdit }) {
  const [spots, setSpots] = useState(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const openEdit = () => {
    setSaved(false);
    setOpen(true);
  };
  const done = (next) => {
    setSpots(next);
    setOpen(false);
    setSaved(true);
  };

  return (
    <div className="isu-pos-spots">
      <p className="isu-small"><strong>Where sales come from</strong></p>
      <p className="isu-muted isu-small">{orderText(spots)}</p>
      {saved ? <p className="isu-notice isu-small" role="status">Spot order saved.</p> : null}
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={openEdit}>
        {canEdit ? 'Choose where sales come from' : 'See where sales come from'}
      </button>
      <Modal open={open} title="Where sales come from" onClose={() => setOpen(false)}>
        {open ? <ItemsurePosSpotEdit locationId={locationId} spots={spots} canEdit={canEdit} onSaved={done} onCancel={() => setOpen(false)} /> : null}
      </Modal>
    </div>
  );
}
