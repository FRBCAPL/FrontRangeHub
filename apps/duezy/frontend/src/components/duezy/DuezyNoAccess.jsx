import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLeagues } from '../../services/duezyService.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/**
 * Shown when a league can't be loaded for this account: removed from it, archived, or a bad link.
 * Row-level security hides the league entirely, so these cases look the same from here.
 * Home sends accounts with no leagues straight to setup, so that case gets its own wording.
 */
export default function DuezyNoAccess({ detail = '' }) {
  const [hasLeagues, setHasLeagues] = useState(undefined);

  useEffect(() => {
    let alive = true;
    listLeagues()
      .then((list) => alive && setHasLeagues(list.length > 0))
      .catch(() => alive && setHasLeagues(true));
    return () => { alive = false; };
  }, []);

  return (
    <section className="dz-card dz-denied" role="alert">
      <span className="dz-denied-icon" aria-hidden="true">🔒</span>
      <h1 className="dz-h2">You don't have access to this league</h1>
      <p className="dz-small dz-muted">
        The owner may have removed you, the league may have been archived, or the link may be wrong.
        If you think this is a mistake, ask the league owner to invite you again.
      </p>
      {detail ? <p className="dz-small dz-muted">{detail}</p> : null}
      {hasLeagues === false ? (
        <>
          <p className="dz-small dz-muted">You're not on any other leagues right now.</p>
          <Link to={`${DUEZY_PATH}/new`} className="dz-btn dz-btn--ghost dz-btn--sm">Start a league of your own</Link>
        </>
      ) : hasLeagues ? (
        <Link to={DUEZY_PATH} className="dz-btn dz-btn--primary dz-btn--sm">Back to your leagues</Link>
      ) : null}
    </section>
  );
}
