import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPastDivisions, restoreDivision } from '../../services/duezySessionService.js';
import { divisionTitle, seasonTerms } from '../../utils/duezyTerms.js';
import { seasonRange } from '../../utils/duezyBookkeeping.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/**
 * League page: past sessions (archived divisions), collapsed, each with Reports and (owner) Restore.
 * The owner also gets the "Start next session" link here.
 */
export default function DuezyPastSessions({ league, isOwner, onRestored }) {
  const [past, setPast] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const terms = seasonTerms(league);
  const base = `${DUEZY_PATH}/league/${league.id}`;

  useEffect(() => {
    let alive = true;
    listPastDivisions(league.id).then((rows) => { if (alive) setPast(rows); }).catch(() => {});
    return () => { alive = false; };
  }, [league.id]);

  if (!past.length && !isOwner) return null;

  const restore = async (d) => {
    if (!window.confirm(`Restore ${divisionTitle(d)}? It goes back on the league page as a current division and counts toward your plan again.`)) return;
    setBusyId(d.id);
    setError('');
    try {
      await restoreDivision(d.id);
      setPast((prev) => prev.filter((x) => x.id !== d.id));
      onRestored?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="dz-past-sessions">
      {past.length ? (
        <details className="dz-past-seasons">
          <summary>Past {terms.many} ({past.length})</summary>
          {error ? <p className="dz-error">{error}</p> : null}
          <ul>
            {past.map((d) => (
              <li key={d.id}>
                <Link to={`${base}/reports?div=${d.id}`} className="dz-link">{divisionTitle(d)}</Link>
                <small className="dz-muted">{seasonRange([d])}</small>
                <span className="dz-past-actions">
                  <Link to={`${base}/reports?div=${d.id}`} className="dz-link dz-small">Reports</Link>
                  {isOwner ? (
                    <button type="button" className="dz-link dz-small" onClick={() => restore(d)} disabled={busyId === d.id}>
                      {busyId === d.id ? 'Restoring…' : 'Restore'}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {isOwner ? (
        <Link to={`${base}/next-session`} className="dz-link dz-small dz-past-next">Start next {terms.one} ›</Link>
      ) : null}
    </div>
  );
}
