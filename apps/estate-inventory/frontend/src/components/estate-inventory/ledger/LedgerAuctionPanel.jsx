import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney, sumOutstandingBids, sumPaidAuctionSales } from '@shared/utils/estateFinance.js';
import { saleAuctionCopy } from '@shared/utils/estateSaleAuctionCopy.js';

function ItemList({ title, note, rows, emptyText, total }) {
  return (
    <section className="ei-pr-loan-ledger">
      <div className="ei-accounts-section-head">
        <h4>{title}</h4>
        <span className="ei-accounts-total">{formatMoney(total)}</span>
      </div>
      <p className="ei-settings-hint">{note}</p>
      {rows.length ? (
        <ul className="ei-pr-loan-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.name}</strong>
              </div>
              <div className="ei-pr-loan-row-side">
                <strong>{formatMoney(row.highest_bid)}</strong>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ei-settings-hint">{emptyText}</p>
      )}
    </section>
  );
}

/** Sale inventory money in two states: collected, and sold but not yet collected. */
const LedgerAuctionPanel = ({ caseNumber, refreshKey }) => {
  const [data, setData] = useState({ paid: [], outstanding: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await estateInventoryService.listFinanceAuctionItems(caseNumber);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Could not load sale inventory items.');
        setData({ paid: [], outstanding: [] });
        return;
      }
      setData({ paid: result.data.paid || [], outstanding: result.data.outstanding || [] });
    })();
    return () => {
      cancelled = true;
    };
  }, [caseNumber, refreshKey]);

  return (
    <>
      <p className="ei-settings-hint">
        {saleAuctionCopy.ledgerHint}. Mark a sale paid from <strong>Edit asset profile</strong> once
        the money is actually in hand. Choose a Funds account to deposit it into the bank balance.
        Paid-but-not-deposited amounts still count in Cash available until you deposit them.
      </p>
      {loading ? <p className="ei-status">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {!loading && !error ? (
        <>
          <ItemList
            title="Collected (paid)"
            note="Marked paid. Deposit into Estate Funds so the bank account line matches the cash."
            rows={data.paid}
            total={sumPaidAuctionSales(data.paid)}
            emptyText="No sale proceeds marked paid yet."
          />
          <ItemList
            title={saleAuctionCopy.outstandingBids}
            note="Sold or offered but not yet collected. Counted as property (not cash) until paid."
            rows={data.outstanding}
            total={sumOutstandingBids(data.outstanding)}
            emptyText="No outstanding sale amounts right now."
          />
        </>
      ) : null}
    </>
  );
};

export default LedgerAuctionPanel;
