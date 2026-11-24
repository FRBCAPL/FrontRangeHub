import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';

/**
 * Money tapped for a make-up week: was the match already played, or only the dues paid ahead?
 * Played is the usual answer, so it's the primary button.
 */
export default function DuezyPlayedAsk({ entry, onAnswer, onCancel }) {
  const what = [money(entry.amount), entry.method && methodFrom(entry.method, entry.paid_by)].filter(Boolean).join(' · ');
  return (
    <div className="dz-played-ask" role="group" aria-label="Was the make-up match played?">
      <p className="dz-played-ask-title">
        Recording <strong>{what}</strong> for a postponed night
      </p>
      <p className="dz-small dz-muted dz-played-ask-help">
        Dues can be collected before the make-up is played. Choose what happened:
      </p>
      <div className="dz-played-ask-actions">
        <button
          type="button"
          className="dz-btn dz-btn--primary dz-btn--sm"
          onClick={() => onAnswer(true)}
          title="Payment saved and this night leaves the make-up list"
        >
          ✓ Match already played
        </button>
        <button
          type="button"
          className="dz-btn dz-btn--ghost dz-btn--sm"
          onClick={() => onAnswer(false)}
          title="Keeps this night on the make-up list until you mark it played later"
        >
          ↻ Paid now · play later
        </button>
        <button type="button" className="dz-link dz-small" onClick={onCancel}>Cancel</button>
      </div>
      <p className="dz-tiny dz-muted dz-played-ask-tip">
        “Play later” keeps it on Make-ups until you tap Mark played after the match.
      </p>
    </div>
  );
}
