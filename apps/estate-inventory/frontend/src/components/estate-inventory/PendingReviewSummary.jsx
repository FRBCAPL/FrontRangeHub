import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { useEstateCase } from './EstateCaseContext';

/**
 * Compact homepage teaser — does not list every pending item.
 */
const PendingReviewSummary = ({ onOpenQueue, refreshKey = 0 }) => {
  const { caseNumber } = useEstateCase();
  const [count, setCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listPendingReviewItems(caseNumber);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not check pending review.');
      setCount(null);
      return;
    }
    setCount((result.data || []).length);
  }, [caseNumber]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return <p className="ei-status">Checking pending review…</p>;
  }

  if (error) {
    return <div className="ei-error">{error}</div>;
  }

  if (!count) {
    return (
      <section className="ei-pending-summary ei-pending-summary-clear">
        <div>
          <h2 className="ei-pending-title">Pending PR review</h2>
          <p className="ei-status" style={{ margin: 0 }}>
            No helper submissions waiting.
          </p>
        </div>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onOpenQueue}>
          Open queue
        </button>
      </section>
    );
  }

  return (
    <section className="ei-pending-summary">
      <div>
        <h2 className="ei-pending-title">Pending PR review</h2>
        <p className="ei-settings-hint" style={{ margin: 0 }}>
          <strong>{count}</strong> item{count === 1 ? '' : 's'} waiting for legal classification.
          Open the queue so the homepage stays clear.
        </p>
      </div>
      <button type="button" className="ei-btn" onClick={onOpenQueue}>
        Review queue ({count})
      </button>
    </section>
  );
};

export default PendingReviewSummary;
