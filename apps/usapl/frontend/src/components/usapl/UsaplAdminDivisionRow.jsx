import React from 'react';
import { Link } from 'react-router-dom';
import { usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';

export default function UsaplAdminDivisionRow({
  division,
  index,
  total,
  busy,
  fromDatabase,
  archivedList = false,
  onToggleSignup,
  onEdit,
  onMove,
  onDelete,
  onRestore,
}) {
  return (
    <article className="usapl-admin-division">
      <div className="usapl-night-copy">
        <h2>
          {division.shortName}
          <UsaplInHouseTag division={division} />
        </h2>
        <p className="usapl-meta">
          {usaplNightLabel(division.night)} · {usaplFormatWithoutInHouse(division.format) || 'format TBD'}
          <br />
          {archivedList
            ? 'Archived'
            : (division.signupOpen ? 'Open for signup' : 'Signup closed')}
        </p>
        <Link className="usapl-btn usapl-admin-view-page" to={`/usapl/divisions/${division.id}`}>
          View division page
        </Link>
      </div>
      <div className="usapl-actions usapl-admin-division-actions">
        {archivedList ? (
          <button type="button" className="usapl-btn-secondary" disabled={busy} onClick={() => onRestore(division)}>
            Restore
          </button>
        ) : (
          <button type="button" className="usapl-btn-secondary" disabled={busy} onClick={() => onToggleSignup(division)}>
            {division.signupOpen ? 'Close signup' : 'Open signup'}
          </button>
        )}
        <button type="button" className="usapl-btn-secondary" onClick={() => onEdit(division)}>
          Edit
        </button>
        {archivedList ? null : (
          <>
            <button type="button" className="usapl-btn-secondary" disabled={index === 0 || busy} onClick={() => onMove(index, -1)}>
              Up
            </button>
            <button type="button" className="usapl-btn-secondary" disabled={index === total - 1 || busy} onClick={() => onMove(index, 1)}>
              Down
            </button>
          </>
        )}
        {fromDatabase ? (
          <button type="button" className="usapl-btn-secondary" disabled={busy} onClick={() => onDelete(division)}>
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}
