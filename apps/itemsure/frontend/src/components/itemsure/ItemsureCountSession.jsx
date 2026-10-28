import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { OPEN_STATUSES } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useCountSession from '../../hooks/useCountSession.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import ItemsureCountActive from './ItemsureCountActive.jsx';
import ItemsureCountReview from './ItemsureCountReview.jsx';

/**
 * /counts/:sessionId shows the counting screen while a count is open and the
 * read-only record once it is submitted or cancelled. /review shows the review step.
 */
export default function ItemsureCountSession({ review = false }) {
  const { sessionId } = useParams();
  const { organization, user, can } = useItemsureWorkspace();
  const { loading, data, error, reload } = useCountSession(organization.id, sessionId);

  if (loading) return <p className="isu-muted isu-center">Loading count…</p>;
  if (!data) {
    return (
      <div className="isu-card isu-empty isu-center-card">
        <h2>Count unavailable</h2>
        <p className="isu-muted">{error}</p>
        <Link to={`${ITEMSURE_PATH}/counts`} className="isu-btn isu-btn--ghost">Back to counts</Link>
      </div>
    );
  }

  const isOpen = OPEN_STATUSES.includes(data.session.status);
  if (isOpen && !review && can('counts.edit')) {
    return <ItemsureCountActive key={data.session.id} data={data} userId={user.id} onReload={reload} />;
  }
  return <ItemsureCountReview data={data} onReload={reload} />;
}
