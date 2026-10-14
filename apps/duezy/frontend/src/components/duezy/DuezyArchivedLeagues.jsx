import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { restoreLeague } from '../../services/duezySeasonService.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

/** Dashboard: archived leagues, collapsed. Open one, see its reports, or restore it. */
export default function DuezyArchivedLeagues({ leagues, onRestored }) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  if (!leagues?.length) return null;

  const restore = async (league) => {
    if (!window.confirm(`Restore ${league.name}? It goes back on your dashboard and its divisions count toward your plan again.`)) return;
    setBusyId(league.id);
    setError('');
    try {
      await restoreLeague(league.id);
      onRestored?.();
    } catch (e) {
      setError(e.message);
      setBusyId('');
    }
  };

  return (
    <details className="dz-past-seasons">
      <summary>Archived leagues ({leagues.length})</summary>
      {error ? <p className="dz-error">{error}</p> : null}
      <ul>
        {leagues.map((l) => (
          <li key={l.id}>
            <Link to={`${DUEZY_PATH}/league/${l.id}`} className="dz-link">
              <span aria-hidden="true">{sportOf(l.sport).icon} </span>{l.name}
            </Link>
            <small className="dz-muted">since {shortDate(l.created_at)}</small>
            <span className="dz-past-actions">
              <Link to={`${DUEZY_PATH}/league/${l.id}/reports`} className="dz-link dz-small">Reports</Link>
              <button type="button" className="dz-link dz-small" onClick={() => restore(l)} disabled={busyId === l.id}>
                {busyId === l.id ? 'Restoring…' : 'Restore'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
