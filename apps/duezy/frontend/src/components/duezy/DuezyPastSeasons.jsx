import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { restoreLeague } from '../../services/duezySeasonService.js';
import { leagueTitle, seasonLabel, seasonTerms } from '../../utils/duezyTerms.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

/**
 * Archived seasons, collapsed: open one, see its reports, or restore it.
 * `nested` = inside a league card (rows show the season label); otherwise rows show the full league title.
 */
export default function DuezyPastSeasons({ seasons, title, nested = false, onRestored }) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  if (!seasons?.length) return null;

  const restore = async (league) => {
    const terms = seasonTerms(league);
    if (!window.confirm(`Restore ${leagueTitle(league)}? It goes back on your dashboard as a current ${terms.one} and its divisions count toward your plan again.`)) return;
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
    <details className={`dz-past-seasons${nested ? ' is-nested' : ''}`}>
      <summary>{title} ({seasons.length})</summary>
      {error ? <p className="dz-error">{error}</p> : null}
      <ul>
        {seasons.map((l) => (
          <li key={l.id}>
            <Link to={`${DUEZY_PATH}/league/${l.id}`} className="dz-link">
              {nested ? null : <span aria-hidden="true">{sportOf(l.sport).icon} </span>}
              {nested ? seasonLabel(l) || l.name : leagueTitle(l)}
            </Link>
            <small className="dz-muted">started {shortDate(l.created_at)}</small>
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
