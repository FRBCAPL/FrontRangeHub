import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';

function ItemList({ title, note, rows, emptyText }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.highest_bid) || 0), 0);
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

/** Sale/auction money in two states: collected, and won but not yet collected. */
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
        setError(result.error || 'Could not load auction items.');
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
        Mark a sale paid from <strong>Edit asset profile</strong> once the money is actually in
        hand. Choose a Funds account to deposit it into the bank balance. Paid-but-not-deposited
        amounts still count in Cash available until you deposit them.
      </p>
      {loading ? <p className="ei-status">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {!loading && !error ? (
        <>
          <ItemList
            title="Collected (paid)"
            note="Marked paid. Deposit into Estate Funds so the bank account line matches the cash."
            rows={data.paid}
            emptyText="No auction sales marked paid yet."
          />
          <ItemList
            title="Outstanding bids"
            note="Won but not yet collected. Counted as property (not cash) until paid."
            rows={data.outstanding}
            emptyText="No outstanding bids right now."
          />
        </>
      ) : null}
    </>
  );
};

export default LedgerAuctionPanel;
