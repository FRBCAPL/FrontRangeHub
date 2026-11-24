import React from 'react';
import { markPlayedEntry } from '../../utils/duezyMakeup.js';

/**
 * Status banner when dues are paid for a make-up that hasn't been played yet.
 * One action: clear it from the make-up list once the match happens.
 */
export default function DuezyPrepaidNote({ payment, onSetPayment }) {
  return (
    <div className="dz-prepaid-note">
      <div className="dz-prepaid-note-copy">
        <strong>↻ Paid · match not played yet</strong>
        <p className="dz-small">
          Dues are collected. When they play this make-up, tap Mark played so it leaves the make-up list.
        </p>
      </div>
      <button
        type="button"
        className="dz-btn dz-btn--primary dz-btn--sm"
        onClick={() => onSetPayment(markPlayedEntry(payment))}
        title="Match happened — clear this night from make-ups"
      >
        ✓ Mark played
      </button>
    </div>
  );
}
