import React, { useState } from 'react';
import { submitSession } from '../../services/itemsureCountService.js';
import { approveIfClear } from '../../services/itemsureCountReviewService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Submitting locks the count. Items without a quantity need an explicit confirmation and stay recorded as not counted.
 * With `applyNow` (approvals switched off and the person can approve) the count is approved straight after submitting;
 * if that can't happen it simply waits for approval as usual.
 */
export default function ItemsureCountSubmitForm({ sessionId, omittedCount, applyNow = false, onSubmitted }) {
  const [confirmed, setConfirmed] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const needsConfirm = omittedCount > 0;

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await submitSession(sessionId, needsConfirm && confirmed);
      if (applyNow && (await approveIfClear(sessionId))) notifyInventoryChanged();
      await onSubmitted();
    });
  };

  return (
    <form onSubmit={submit} className="isu-stack">
      <p>
        After submitting, no one can change this count.
        {applyNow ? ' The amounts you counted will update your stock straight away.' : ''}
      </p>
      {needsConfirm ? (
        <label className="isu-check isu-count-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          {omittedCount === 1
            ? '1 item has no quantity. I confirm it was intentionally not counted.'
            : `${omittedCount} items have no quantity. I confirm they were intentionally not counted.`}
        </label>
      ) : null}
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || (needsConfirm && !confirmed)}>
        {busy ? 'Submitting…' : applyNow ? 'Submit and update stock' : 'Submit count'}
      </button>
    </form>
  );
}
