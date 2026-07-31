import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildInventoryReconciliation,
  openInventoryReconciliation
} from '@shared/utils/estateInventoryReconciliation.js';

/**
 * PR inventory disposition board — every item in exactly one bucket.
 */
const LedgerInventoryReconPanel = ({ caseNumber, estateName }) => {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.listAllItemsWithRooms(caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not load inventory.');
      return;
    }
    setItems(result.data || []);
  };

  useEffect(() => {
    load();
  }, [caseNumber]);

  const reconciliation = useMemo(() => buildInventoryReconciliation(items), [items]);

  const printReport = () => {
    const opened = openInventoryReconciliation({
      reconciliation,
      estateName,
      caseNumber
    });
    if (!opened.success) setError(opened.error);
  };

  return (
    <>
      <p className="ei-settings-hint">
        Every inventory item has exactly one disposition. Use this to catch auction lot
        mismatches (approved vs listed vs sold) before family questions turn into conflict.
      </p>
      {error ? <div className="ei-error">{error}</div> : null}
      {busy && !items.length ? (
        <p className="ei-settings-hint">Loading inventory…</p>
      ) : null}

      <div className="ei-distribution-summary">
        <div>
          <span>Total items</span>
          <strong>{reconciliation.total}</strong>
        </div>
        <div>
          <span>On auction catalog</span>
          <strong>{reconciliation.auctionBreakdown?.listedCount || 0}</strong>
        </div>
        <div>
          <span>Approved, not listed</span>
          <strong>{reconciliation.auctionBreakdown?.notListedCount || 0}</strong>
        </div>
        <div>
          <span>Distributed</span>
          <strong>{reconciliation.distributedCount}</strong>
        </div>
      </div>

      <div className="ei-btn-row" style={{ margin: '0.75rem 0' }}>
        <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={printReport}>
          Print reconciliation
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={load}
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      <ul className="ei-recon-bucket-list">
        {reconciliation.allBuckets.map((bucket) => (
          <li key={bucket.key} className={bucket.count ? '' : 'is-empty'}>
            <span>{bucket.label || bucket.key}</span>
            <strong>{bucket.count}</strong>
          </li>
        ))}
      </ul>

      <p className="ei-settings-hint">
        Auction pipeline: {reconciliation.auctionLotCount} approved (
        {reconciliation.auctionApprovedOnlyCount} open ·{' '}
        {reconciliation.auctionPendingCount} pending payment ·{' '}
        {reconciliation.auctionPaidCount} paid). Catalog match:{' '}
        {reconciliation.auctionBreakdown?.listedCount || 0} on public catalog ·{' '}
        {reconciliation.auctionBreakdown?.notListedCount || 0} approved but not listed
        {reconciliation.auctionBreakdown?.notListedCount
          ? ` — ${(reconciliation.auctionBreakdown.notListed || [])
              .slice(0, 2)
              .map((item) => `${item.name} (${item.not_listed_reason})`)
              .join('; ')}${
              reconciliation.auctionBreakdown.notListedCount > 2
                ? ` +${reconciliation.auctionBreakdown.notListedCount - 2} more`
                : ''
            }`
          : ''}
        . Listed uses the same catalog gates as the public auction page.
      </p>
    </>
  );
};

export default LedgerInventoryReconPanel;
