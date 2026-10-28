import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReview } from '../../services/itemsureCountReviewService.js';
import { loadPeopleNames } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsureCountApproval from './ItemsureCountApproval.jsx';

/** For a submitted count: the recorded decision, the approval step, or a waiting note. */
export default function ItemsureCountDecision({ session, areaName }) {
  const { can } = useItemsureWorkspace();
  const [review, setReview] = useState(undefined);
  const [decider, setDecider] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const row = await getReview(session.id);
      setReview(row);
      if (row?.decided_by) {
        const names = await loadPeopleNames([row.decided_by]);
        setDecider(names[row.decided_by] || '');
      }
    } catch (e) {
      setError(e.message);
      setReview(null);
    }
  }, [session.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (review === undefined) return <p className="isu-muted">Checking approval…</p>;
  if (review) {
    const who = decider || 'a manager';
    if (review.decision === 'approved') {
      return (
        <div className="isu-notice isu-decision">
          <strong>Approved</strong> {formatWhen(review.decided_at)} by {who}.{' '}
          {review.opening_count} opening balance{review.opening_count === 1 ? '' : 's'}, {review.adjustment_count} count adjustment
          {review.adjustment_count === 1 ? '' : 's'}, {review.unchanged_count} unchanged.{' '}
          {can('inventory.view') ? <Link to={`${ITEMSURE_PATH}/stock`} className="isu-link">View stock</Link> : null}
        </div>
      );
    }
    return (
      <div className="isu-error isu-decision" role="status">
        <strong>Rejected</strong> {formatWhen(review.decided_at)} by {who}. Inventory was not changed.
        <p className="isu-decision-reason">Reason: {review.reason}</p>
      </div>
    );
  }

  if (!can('counts.approve') && !can('counts.reject')) {
    return (
      <>
        <ErrorNote message={error} />
        <p className="isu-notice">Awaiting approval. Inventory doesn&apos;t change until a manager approves this count.</p>
      </>
    );
  }
  const decided = async () => {
    notifyInventoryChanged();
    await load();
  };
  return <ItemsureCountApproval session={session} areaName={areaName} onDecided={decided} />;
}
