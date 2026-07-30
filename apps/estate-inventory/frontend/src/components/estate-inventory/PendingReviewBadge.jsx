import React from 'react';
import { isPendingReview, submittedByLabel } from '@shared/utils/estateInventoryConstants.js';

/**
 * Marks a helper submission the PR has not classified yet. Without this the
 * item is indistinguishable from an approved one in the room lists, which reads
 * as "helpers publish straight to the inventory".
 */
const PendingReviewBadge = ({ item }) => {
  if (!isPendingReview(item)) return null;
  const by = submittedByLabel(item);
  return (
    <span
      className="ei-pill ei-pill-pending"
      title={
        by
          ? `${by}. Not yet reviewed — hidden from family and auction until you approve it.`
          : 'Not yet reviewed — hidden from family and auction until you approve it.'
      }
    >
      Pending your review
    </span>
  );
};

export default PendingReviewBadge;
