import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/**
 * Shown when a league can't be loaded for this account: removed from it, archived, or a bad link.
 * Row-level security hides the league entirely, so these cases look the same from here.
 */
export default function DuezyNoAccess({ detail = '' }) {
  return (
    <section className="dz-card dz-denied" role="alert">
      <span className="dz-denied-icon" aria-hidden="true">🔒</span>
      <h1 className="dz-h2">You don't have access to this league</h1>
      <p className="dz-small dz-muted">
        The owner may have removed you, the league may have been archived, or the link may be wrong.
        If you think this is a mistake, ask the league owner to invite you again.
      </p>
      {detail ? <p className="dz-small dz-muted">{detail}</p> : null}
      <Link to={DUEZY_PATH} className="dz-btn dz-btn--primary dz-btn--sm">Back to your leagues</Link>
    </section>
  );
}
