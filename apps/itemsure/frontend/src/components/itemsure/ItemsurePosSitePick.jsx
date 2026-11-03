import React, { useEffect, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { setCloverLocation } from '../../services/itemsurePosService.js';
import { site } from '../../data/itemsureTerms.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Which site Clover's sales come out of. With one active site it is picked automatically;
 * with more, the owner chooses. onSaved() reloads the connection.
 */
export default function ItemsurePosSitePick({ organizationId, locationId, canEdit, onSaved }) {
  const [sites, setSites] = useState(null);
  const { busy, error, run } = useItemsureAction();

  useEffect(() => {
    let live = true;
    listLocations(organizationId).then((rows) => live && setSites(rows.filter((l) => l.is_active || l.id === locationId))).catch(() => live && setSites([]));
    return () => {
      live = false;
    };
  }, [organizationId, locationId]);

  useEffect(() => {
    if (!canEdit || locationId || !sites || sites.length !== 1) return;
    run(() => setCloverLocation(organizationId, sites[0].id)).then((ok) => ok && onSaved());
  }, [canEdit, locationId, sites, organizationId, run, onSaved]);

  if (!sites) return null;
  const current = sites.find((l) => l.id === locationId);
  if (sites.length <= 1 || !canEdit) {
    return current ? <p className="isu-muted isu-small">Sales come out of {current.name}.</p> : null;
  }

  const choose = (e) => run(() => setCloverLocation(organizationId, e.target.value)).then((ok) => ok && onSaved());
  return (
    <div className="isu-pos-site">
      <label>
        <span>Clover sells from this {site}</span>
        <select value={locationId || ''} onChange={choose} disabled={busy}>
          <option value="">Choose a {site}…</option>
          {sites.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <ErrorNote message={error} />
    </div>
  );
}
