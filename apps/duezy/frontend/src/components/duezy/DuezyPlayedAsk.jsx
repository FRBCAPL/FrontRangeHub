import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';

/**
 * Money tapped for a make-up week: was the match played (settled) or paid ahead (stays on the make-up list)?
 * Played is the usual answer, so it's the primary button.
 */
export default function DuezyPlayedAsk({ entry, onAnswer, onCancel }) {
  const what = [money(entry.amount), entry.method && methodFrom(entry.method, entry.paid_by)].filter(Boolean).join(' · ');
  return (
    <div className="dz-played-ask" role="group" aria-label="Was the make-up match played?">
      <p>
        <strong>{what}</strong> for a make-up — was the match played?
      </p>
      <div className="dz-played-ask-actions">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={() => onAnswer(true)}>
          ✓ Played
        </button>
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => onAnswer(false)}>
          ↻ Paid ahead · not played yet
        </button>
        <button type="button" className="dz-link dz-small" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
