import React, { useState } from 'react';
import { rejectCount } from '../../services/itemsureCountReviewService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

export default function ItemsureCountRejectForm({ sessionId, onRejected }) {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useItemsureAction();

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      await rejectCount(sessionId, reason);
      onRejected();
    });
  };

  return (
    <form className="isu-stack" onSubmit={submit}>
      <p>Rejecting leaves inventory unchanged. The count and its entries stay in history with your reason.</p>
      <Field label="Reason" hint="Required. The team will see this on the count.">
        <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <ErrorNote message={error} />
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block isu-btn--danger-solid" disabled={busy || !reason.trim()}>
        {busy ? 'Rejecting…' : 'Reject count'}
      </button>
    </form>
  );
}
