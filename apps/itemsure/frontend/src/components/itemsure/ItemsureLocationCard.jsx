import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites } from '../../data/itemsureTerms.js';

function addressLine(location) {
  return [location.address_line1, location.city, location.region, location.postal_code, location.country]
    .filter(Boolean)
    .join(', ');
}

export default function ItemsureLocationCard({
  location, canManageLocation, canManageStorage, showSpots = true, busy, onToggle, onEdit, onAddArea, onEditArea, onToggleArea,
}) {
  const address = addressLine(location);
  const areas = location.storageAreas;
  const spotsSection = showSpots || areas.length > 0;

  return (
    <article className={`isu-card isu-location${location.is_active ? '' : ' is-archived'}`}>
      <div className="isu-card-head isu-location-head">
        <div className="isu-location-title">
          <h2>{location.name}</h2>
          <p className="isu-muted isu-small">
            {address || 'No address'} · {location.timezone.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="isu-item-actions">
          {!location.is_active ? <span className="isu-badge">Archived</span> : null}
          {canManageLocation ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy}
              onClick={() => onEdit(location)} aria-label={`Edit ${location.name}`}>
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {!showSpots && canManageStorage && location.is_active ? (
        <p className="isu-muted isu-small isu-spots-off">
          Spots (like a bar, walk-in, or shelf) are switched off. To track them here, turn on &ldquo;Spots inside {sites}&rdquo; in{' '}
          <Link to={`${ITEMSURE_PATH}/settings/features`}>Settings &rarr; Features</Link>.
        </p>
      ) : null}
      {spotsSection ? <h3 className="isu-subhead">Spots (optional)</h3> : null}
      {!spotsSection ? null : areas.length === 0 ? (
        <p className="isu-muted isu-small">No spots yet. You only need them if you want to track shelves or rooms separately.</p>
      ) : (
        <ul className="isu-list">
          {areas.map((area) => (
            <li key={area.id} className={area.is_active ? '' : 'is-archived'}>
              <div>
                <strong>{area.name}</strong>
                {area.description ? <p className="isu-muted isu-small">{area.description}</p> : null}
              </div>
              {canManageStorage ? (
                <div className="isu-item-actions">
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy}
                    onClick={() => onEditArea(location, area)} aria-label={`Edit ${area.name}`}>
                    Edit
                  </button>
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onToggleArea(area)}>
                    {area.is_active ? 'Archive' : 'Restore'}
                  </button>
                </div>
              ) : !area.is_active ? (
                <span className="isu-badge">Archived</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManageStorage || canManageLocation ? (
        <div className="isu-card-actions">
          {canManageStorage && showSpots && location.is_active ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAddArea(location)}>
              Add spot
            </button>
          ) : null}
          {canManageLocation ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onToggle(location)}>
              {location.is_active ? `Archive ${site}` : `Restore ${site}`}
            </button>
          ) : null}        </div>
      ) : null}
    </article>
  );
}
