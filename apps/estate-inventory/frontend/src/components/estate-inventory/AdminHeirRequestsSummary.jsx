import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { normalizeSiblingClaims } from '@shared/utils/estateInventoryConstants.js';

/**
 * Homepage teaser for items with at least one heir request.
 */
const AdminHeirRequestsSummary = ({ onOpenList, refreshKey = 0 }) => {
  const [count, setCount] = useState(null);
  const [claimCount, setClaimCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listAllItemsWithRooms();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not check heir requests.');
      setCount(null);
      return;
    }
    const requested = (result.data || []).filter(
      (item) => normalizeSiblingClaims(item.sibling_claims).length > 0
    );
    setCount(requested.length);
    setClaimCount(
      requested.reduce((n, item) => n + normalizeSiblingClaims(item.sibling_claims).length, 0)
    );
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return <p className="ei-status">Checking heir requests…</p>;
  }

  if (error) {
    return <div className="ei-error">{error}</div>;
  }

  if (!count) {
    return (
      <section className="ei-pending-summary ei-pending-summary-clear">
        <div>
          <h2 className="ei-pending-title">Heir requests</h2>
          <p className="ei-status" style={{ margin: 0 }}>
            No items have been requested yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ei-pending-summary">
      <div>
        <h2 className="ei-pending-title">Heir requests</h2>
        <p className="ei-settings-hint" style={{ margin: 0 }}>
          <strong>{count}</strong> item{count === 1 ? '' : 's'} with{' '}
          <strong>{claimCount}</strong> request{claimCount === 1 ? '' : 's'} on file.
        </p>
      </div>
      <button type="button" className="ei-btn" onClick={onOpenList}>
        View requests ({count})
      </button>
    </section>
  );
};

export default AdminHeirRequestsSummary;
