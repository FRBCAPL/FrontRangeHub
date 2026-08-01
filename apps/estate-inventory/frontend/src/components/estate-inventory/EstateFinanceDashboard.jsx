import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney, sumExpenses } from '@shared/utils/estateFinance.js';
import EstateLedgerModal from './EstateLedgerModal.jsx';
import { useEstateCase } from './EstateCaseContext';

/**
 * Home Money card — plain language for a first-time PR.
 * Deep work happens in EstateLedgerModal.
 */
const EstateFinanceDashboard = ({
  refreshKey = 0,
  ledgerRequestKey = 0,
  ledgerRequestTab = 'summary',
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
  const loadSeqRef = useRef(0);
  const hasSummaryRef = useRef(false);
  hasSummaryRef.current = Boolean(summary);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    if (!hasSummaryRef.current) setLoading(true);
    setError('');
    const result = await estateInventoryService.getFinanceSummary(caseNumber);
    if (seq !== loadSeqRef.current) return;
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load money overview.');
      setSummary(null);
      return;
    }
    setSummary(result.data);
  }, [caseNumber]);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefresh]);

  useEffect(() => {
    if (ledgerRequestKey > 0) setLedgerTab(ledgerRequestTab || 'summary');
  }, [ledgerRequestKey, ledgerRequestTab]);

  const bump = () => {
    setLocalRefresh((n) => n + 1);
    onChanged?.();
  };

  const applyExpenseRow = (row, { editing = false } = {}) => {
    if (!row?.id) return;
    setSummary((prev) => {
      if (!prev) return prev;
      const expenses = editing
        ? (prev.expenses || []).map((e) => (e.id === row.id ? row : e))
        : [row, ...(prev.expenses || []).filter((e) => e.id !== row.id)];
      return {
        ...prev,
        expenses,
        expensesTotal: sumExpenses(expenses)
      };
    });
  };

  if (loading && !summary) {
    return <p className="ei-status">Loading money overview…</p>;
  }

  if (error && !summary) {
    return <div className="ei-error">{error}</div>;
  }

  if (!summary) return null;

  const cash =
    summary.fundsAvailable != null ? summary.fundsAvailable : summary.accountAssetsTotal;
  const propertyEstimates =
    summary.nonCashAssets != null
      ? summary.nonCashAssets
      : (summary.outstandingBids || 0) + (summary.unsoldInventoryValue || 0);
  const owes = summary.totalLiabilities || 0;
  const fundAccounts = (summary.accounts || []).filter((a) => a.kind !== 'debt');
  const hasFundAccount = fundAccounts.length > 0;
  const caseLabel =
    summary.displayCaseNumber || estateDisplayCaseNumber(settings, summary.caseNumber || '');

  return (
    <>
      <section className="ei-finance-snapshot ei-finance-snapshot-simple" aria-label="Estate money">
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Cash on hand</h2>
            <p className="ei-finance-case">Case {caseLabel}</p>
          </div>
        </div>

        <p className="ei-finance-plain">
          This is <strong>bank money</strong> the estate can use to pay bills.<br /> Furniture, cars, and
          house estimates are listed separately — they are not cash until sold and deposited.
        </p>

        {!hasFundAccount && !isClosed ? (
          <div className="ei-finance-empty-guide">
            <p>
              Start here: add the estate checking (or savings) account and its <em>opening</em>{' '}
              balance from the bank statement. After that, every change is a deposit or a payment —
              you never type a new balance.
            </p>
            <button
              type="button"
              className="ei-btn"
              onClick={() => setLedgerTab('accounts')}
            >
              Add bank account
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="ei-finance-balance-card"
              onClick={() => setLedgerTab(hasFundAccount ? 'transactions' : 'accounts')}
              title="See money in and out"
            >
              <span className="ei-finance-balance-label">Available</span>
              <span className="ei-finance-balance-amount">{formatMoney(cash)}</span>
              <span className="ei-finance-note">
                {isClosed
                  ? 'Closed record · view only'
                  : 'Amount available for Estate expenses'}
              </span>
            </button>

            {!isClosed ? (
              <div className="ei-finance-simple-actions" role="group" aria-label="Common money tasks">
                <button
                  type="button"
                  className="ei-btn ei-btn-small"
                  onClick={() => setLedgerTab('expenses')}
                >
                  Pay a bill
                </button>
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-secondary"
                  onClick={() => setLedgerTab('transactions')}
                >
                  Money came in
                </button>
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-secondary"
                  onClick={() => setLedgerTab('distributions')}
                >
                  Give to heirs
                </button>
                <button
                  type="button"
                  className="ei-link-btn"
                  onClick={() => setLedgerTab('summary')}
                >
                  See full overview
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ei-btn ei-btn-small ei-btn-secondary"
                onClick={() => setLedgerTab('summary')}
              >
                View money records
              </button>
            )}
          </>
        )}

        <dl className="ei-finance-side-facts">
          <div>
            <dt>Property &amp; other (not cash)</dt>
            <dd>{formatMoney(propertyEstimates)}</dd>
          </div>
          <div>
            <dt>Debts &amp; PR loans</dt>
            <dd className={owes > 0 ? 'ei-finance-net-neg-text' : undefined}>
              {formatMoney(owes)}
            </dd>
          </div>
        </dl>
      </section>

      <EstateLedgerModal
        open={Boolean(ledgerTab)}
        initialTab={ledgerTab || 'summary'}
        summary={summary}
        readOnly={isClosed}
        onClose={() => setLedgerTab(null)}
        onChanged={bump}
        onExpenseSaved={applyExpenseRow}
        onSettingsSaved={onSettingsSaved}
      />
    </>
  );
};

export default EstateFinanceDashboard;
