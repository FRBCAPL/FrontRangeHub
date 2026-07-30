import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import EstateLedgerModal from './EstateLedgerModal.jsx';
import { useEstateCase } from './EstateCaseContext';

function MiniStat({ label, amount, note, onClick, negative = false }) {
  return (
    <button type="button" className="ei-finance-ministat" onClick={onClick} title={note}>
      <span className="ei-finance-ministat-label">{label}</span>
      <span className={`ei-finance-ministat-amount${negative ? ' ei-finance-net-neg-text' : ''}`}>
        {formatMoney(amount)}
      </span>
      <span className="ei-finance-ministat-note">{note}</span>
    </button>
  );
}

/**
 * Admin home snapshot. The balance and its two halves are always visible; the
 * full ledger opens in one tabbed dialog.
 */
const EstateFinanceDashboard = ({
  refreshKey = 0,
  ledgerRequestKey = 0,
  settings,
  onSettingsSaved,
  onChanged,
  isClosed = false
}) => {
  const { caseNumber } = useEstateCase();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localRefresh, setLocalRefresh] = useState(0);
  const [ledgerTab, setLedgerTab] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.getFinanceSummary(caseNumber);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load financial snapshot.');
      setSummary(null);
      return;
    }
    setSummary(result.data);
  }, [caseNumber]);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefresh]);

  useEffect(() => {
    if (ledgerRequestKey > 0) setLedgerTab('summary');
  }, [ledgerRequestKey]);

  const bump = () => {
    setLocalRefresh((n) => n + 1);
    onChanged?.();
  };

  if (loading && !summary) {
    return <p className="ei-status">Loading financial snapshot…</p>;
  }

  if (error && !summary) {
    return <div className="ei-error">{error}</div>;
  }

  if (!summary) return null;

  const estateNegative = summary.netDistributable < 0;
  const caseLabel =
    summary.displayCaseNumber || estateDisplayCaseNumber(settings, summary.caseNumber || '');

  return (
    <>
      <section
        className="ei-finance-snapshot ei-finance-snapshot-collapsed"
        aria-label={`Estate financial health · Case ${caseLabel}`}
      >
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Estate Financial Snapshot</h2>
            <p className="ei-finance-case">
              Case {caseLabel} · what the estate holds after debts and costs
            </p>
          </div>
          <div className="ei-btn-row ei-finance-toggle">
            <button
              type="button"
              className="ei-btn ei-btn-small"
              aria-haspopup="dialog"
              title="Open the full ledger: accounts, debts, expenses, PR loans, and auction money."
              onClick={() => setLedgerTab('summary')}
            >
              Open ledger
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`ei-finance-balance-card${estateNegative ? ' ei-finance-net-neg' : ''}`}
          onClick={() => setLedgerTab('summary')}
          title="Open the full ledger"
        >
          <span className="ei-finance-balance-label">Estate balance</span>
          <span
            className={`ei-finance-balance-amount${
              estateNegative ? ' ei-finance-net-neg-text' : ''
            }`}
          >
            {formatMoney(summary.netDistributable)}
          </span>
          <span className="ei-finance-note">
            {isClosed ? 'Closed record · view only' : 'Tap for the full breakdown'}
          </span>
        </button>

        <div className="ei-finance-ministats">
          <MiniStat
            label="Holds"
            amount={summary.grossEstateValue}
            note="Cash, accounts, bids, and unsold property estimates"
            onClick={() => setLedgerTab('accounts')}
          />
          <MiniStat
            label="Owes"
            amount={summary.totalLiabilities}
            note="Debts, paid expenses, and PR loans to reimburse"
            onClick={() => setLedgerTab('expenses')}
            negative={summary.totalLiabilities > 0}
          />
        </div>
      </section>

      <EstateLedgerModal
        open={Boolean(ledgerTab)}
        initialTab={ledgerTab || 'summary'}
        summary={summary}
        readOnly={isClosed}
        onClose={() => setLedgerTab(null)}
        onChanged={bump}
        onSettingsSaved={onSettingsSaved}
      />
    </>
  );
};

export default EstateFinanceDashboard;
