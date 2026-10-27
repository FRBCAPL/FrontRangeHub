import React from 'react';
import { cashClimbV3SyncLabel } from '../cloud/cashClimbV3SyncLabels.js';

const EXPLAIN = {
  'local-only': 'This tournament is kept on this tablet. It is not backed up to the cloud.',
  'needs-approval': 'Saved on this tablet before cloud saving was turned on. It is not sent until you review it and approve its first upload.',
  offline: 'Results are saved on this tablet and will be sent when the connection returns.',
  conflict: 'Another device changed this tournament. Sending is paused and both copies are kept until you choose.',
  deleted: 'This tournament was deleted from the cloud. This tablet still has its copy; it will not be sent again.',
  missing: 'The cloud no longer has this tournament. You can send this tablet\u2019s copy again.',
  'update-required': 'Update the app before this tournament can be saved to the cloud. This tablet keeps its copy.',
};

/** One-line cloud status for the open tournament, with the action that helps (retry, send again, review). */
export default function CashClimbV3SyncBanner({ status, mode, onRetry, onReupload, onReview, onReviewUpload }) {
  const state = status?.state || 'local-only';
  const detail = state === 'local-only' && !status?.message ? EXPLAIN['local-only'] : (status?.message || EXPLAIN[state] || '');
  return (
    <div className={`ccv3-sync ccv3-sync-${state}`} role="status" aria-live="polite">
      <strong>{cashClimbV3SyncLabel(state)}</strong>
      {detail ? <span>{detail}</span> : null}
      {mode === 'isolated' ? <span className="ccv3-sync-test">Isolated test cloud (this browser only)</span> : null}
      {state === 'offline' || state === 'error' ? <button type="button" className="ccv3-link" onClick={onRetry}>Try again now</button> : null}
      {state === 'missing' ? <button type="button" className="ccv3-link" onClick={onReupload}>Send this tablet&rsquo;s copy again</button> : null}
      {state === 'conflict' ? <button type="button" className="ccv3-link" onClick={onReview}>Review both copies</button> : null}
      {state === 'needs-approval' ? <button type="button" className="ccv3-link" onClick={onReviewUpload}>Review and upload</button> : null}
    </div>
  );
}
