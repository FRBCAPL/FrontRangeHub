import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { approveCount, previewApproval } from '../../services/itemsureCountReviewService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { quantitySign } from '../../utils/itemsureQuantity.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureCountApprovalLines from './ItemsureCountApprovalLines.jsx';
import ItemsureCountRejectForm from './ItemsureCountRejectForm.jsx';

function groupLines(lines) {
  const groups = { blocked: [], opening: [], increase: [], decrease: [], unchanged: [] };
  lines.forEach((line) => {
    if (line.blocked_reason) groups.blocked.push(line);
    else if (line.outcome === 'opening') groups.opening.push(line);
    else if (line.outcome === 'no_change') groups.unchanged.push(line);
    else if (quantitySign(line.variance) > 0) groups.increase.push(line);
    else groups.decrease.push(line);
  });
  return groups;
}

/**
 * Shows exactly what approval will post, then posts it. The preview carries a
 * ledger watermark; if stock moved since, the server refuses and we reload.
 */
export default function ItemsureCountApproval({ session, areaName, onDecided }) {
  const { can } = useItemsureWorkspace();
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const { busy, error, setError, run } = useItemsureAction();

  const loadPreview = useCallback(async () => {
    try {
      const next = await previewApproval(session.id);
      setPreview(next);
      setLoadError('');
      if (next?.reviewed) onDecided();
    } catch (e) {
      setLoadError(e.message);
    }
  }, [session.id, onDecided]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const groups = useMemo(() => groupLines(preview?.lines || []), [preview]);
  const closeReject = useCallback(() => setRejecting(false), []);

  const approve = async () => {
    const ok = await run(async () => {
      await approveCount(session.id, preview.watermark);
    });
    if (ok) {
      onDecided();
      return;
    }
    setConfirmed(false);
    await loadPreview();
  };

  if (loadError) return <ErrorNote message={loadError} />;
  if (!preview) return <p className="isu-muted">Preparing approval…</p>;

  const blocked = groups.blocked.length > 0;
  const changes = groups.opening.length + groups.increase.length + groups.decrease.length;

  return (
    <section className="isu-card isu-stack isu-approval">
      <div>
        <p className="isu-eyebrow">Approval</p>
        <h2>Review before inventory changes</h2>
        <p className="isu-muted isu-small">
          Expected quantities come from inventory activity up to the moment each item was counted. Anything recorded after that is kept.
        </p>
      </div>

      <div className="isu-stats">
        <div className="isu-stat"><span className="isu-stat-value">{groups.opening.length}</span><span className="isu-stat-label">Opening balances</span></div>
        <div className="isu-stat"><span className="isu-stat-value">{groups.increase.length + groups.decrease.length}</span><span className="isu-stat-label">Count adjustments</span></div>
        <div className="isu-stat"><span className="isu-stat-value">{groups.unchanged.length}</span><span className="isu-stat-label">No change</span></div>
      </div>

      <ItemsureCountApprovalLines groups={groups} untouched={preview.untouched || []} omittedCount={session.omitted_item_count} areaName={areaName} />

      <ErrorNote message={error} />
      {blocked ? (
        <p className="isu-error">Some lines can&apos;t be approved as they stand. Reject this count, then count those items again.</p>
      ) : null}

      {can('counts.approve') && !blocked ? (
        <label className="isu-check isu-count-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>
            I&apos;ve reviewed these figures. Post {changes} change{changes === 1 ? '' : 's'} to inventory.
          </span>
        </label>
      ) : null}

      <div className="isu-card-actions isu-approval-actions">
        {can('counts.reject') ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--danger" disabled={busy} onClick={() => { setError(''); setRejecting(true); }}>
            Reject
          </button>
        ) : null}
        {can('counts.approve') ? (
          <button type="button" className="isu-btn isu-btn--primary" disabled={busy || blocked || !confirmed} onClick={approve}>
            {busy ? 'Approving…' : 'Approve count'}
          </button>
        ) : null}
      </div>

      <Modal open={rejecting} title="Reject count" onClose={closeReject}>
        <ItemsureCountRejectForm sessionId={session.id} onRejected={() => { setRejecting(false); onDecided(); }} />
      </Modal>
    </section>
  );
}
