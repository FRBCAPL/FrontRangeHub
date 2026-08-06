import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney, sumExpenses } from '@shared/utils/estateFinance.js';
import EstateLedgerModal from './EstateLedgerModal.jsx';
import CashAvailableHint from './CashAvailableHint.jsx';
import { useEstateCase } from './EstateCaseContext';

/** Keep prior list data when a soft-failed sub-query returns empty. */
function mergeFinanceSummary(prev, next) {
  if (!prev || !next) return next;
  const keep = (unavailable, prevList, nextList) =>
    unavailable && (prevList?.length || 0) > 0 && !(nextList?.length || 0) ? prevList : nextList;
  return {
    ...next,
    accounts: keep(next.accountsUnavailable, prev.accounts, next.accounts),
    fundTransactions: keep(
      next.fundTransactionsUnavailable,
      prev.fundTransactions,
      next.fundTransactions
    ),
    prLoans: keep(next.prLoansUnavailable, prev.prLoans, next.prLoans),
    creditorClaims: keep(
      next.creditorClaimsUnavailable,
      prev.creditorClaims,
      next.creditorClaims
    )
  };
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ledgerTab, setLedgerTab] = useState(null);
  const loadSeqRef = useRef(0);
  const hasSummaryRef = useRef(false);
  const skipNextExternalKeyRef = useRef(false);
  hasSummaryRef.current = Boolean(summary);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    if (!hasSummaryRef.current) setLoading(true);
    else setRefreshing(true);
    setError('');
    const result = await estateInventoryService.getFinanceSummary(caseNumber);
    if (seq !== loadSeqRef.current) return;
    setLoading(false);
    setRefreshing(false);
    if (!result.success) {
      setError(result.error || 'Could not load money overview.');
      if (!hasSummaryRef.current) setSummary(null);
      return;
    }
    setSummary((prev) => mergeFinanceSummary(prev, result.data));
  }, [caseNumber]);

  useEffect(() => {
    if (skipNextExternalKeyRef.current) {
      skipNextExternalKeyRef.current = false;
      return;
    }
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (ledgerRequestKey > 0) setLedgerTab(ledgerRequestTab || 'summary');
  }, [ledgerRequestKey, ledgerRequestTab]);

  /** Awaitable refresh so ledger saves can wait until lists show new rows. */
  const refresh = useCallback(async () => {
    await load();
    skipNextExternalKeyRef.current = true;
    try {
      await onChanged?.();
    } catch {
      /* parent notify should not break save UX */
    }
  }, [load, onChanged]);

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
    return (
      <div>
        <p className="ei-status">Loading money overview…</p>
        {error ? (
          <div className="ei-error" style={{ marginTop: '0.5rem' }}>
            {error}
            <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="ei-btn ei-btn-small" onClick={() => load()}>
                Retry
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="ei-error">
        {error}
        <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="ei-btn ei-btn-small" onClick={() => load()}>
            Retry
          </button>
        </div>
      </div>
    );
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

        {refreshing ? (
          <p className="ei-status ei-finance-refreshing" aria-live="polite">
            Updating money lists…
          </p>
        ) : null}

        <p className="ei-finance-plain">
          This is <strong>spendable estate money</strong> (accounts you mark as Cash on hand).<br />{' '}
          Retirement, Social Security, insurance, and furniture estimates stay in Accounts /
          inventory until that money is actually available.
        </p>

        {!hasFundAccount && !isClosed ? (
          <div className="ei-finance-empty-guide">
            <p>
              Start here: add checking or savings and turn on <em>Include in Cash on hand</em>. You
              can also record retirement, Social Security, life insurance, and debts on the same
              Accounts screen.
            </p>
            <button
              type="button"
              className="ei-btn"
              onClick={() => setLedgerTab('accounts')}
            >
              Add accounts
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="ei-finance-balance-card"
              onClick={() => setLedgerTab('summary')}
              title="Open estate money overview"
            >
              <span className="ei-finance-balance-label">Available</span>
              <span className="ei-finance-balance-amount">{formatMoney(cash)}</span>
              <span className="ei-finance-note">
                {isClosed
                  ? 'Closed record · view only'
                  : 'Amount available for Estate expenses'}
              </span>
            </button>
            <CashAvailableHint className="ei-settings-hint ei-finance-cash-hint" />

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
        refreshing={refreshing}
        onClose={() => setLedgerTab(null)}
        onChanged={refresh}
        onExpenseSaved={applyExpenseRow}
        onSettingsSaved={onSettingsSaved}
      />
    </>
  );
};

export default EstateFinanceDashboard;
