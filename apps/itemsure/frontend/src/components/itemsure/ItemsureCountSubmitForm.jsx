import React, { useState } from 'react';
import { submitSession } from '../../services/itemsureCountService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Submitting locks the count. Items without a quantity need an explicit confirmation and stay recorded as not counted. */
export default function ItemsureCountSubmitForm({ sessionId, omittedCount, onSubmitted }) {
  const [confirmed, setConfirmed] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const needsConfirm = omittedCount > 0;

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await submitSession(sessionId, needsConfirm && confirmed);
      await onSubmitted();
    });
  };

  return (
    <form onSubmit={submit} className="isu-stack">
      <p>After submitting, no one can change this count.</p>
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
        {busy ? 'Submitting…' : 'Submit count'}
      </button>
    </form>
  );
}
