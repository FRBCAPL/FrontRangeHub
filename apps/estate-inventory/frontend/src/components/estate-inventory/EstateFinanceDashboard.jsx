import React, { useCallback, useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney, sumExpenses } from '@shared/utils/estateFinance.js';
import EstateLedgerModal from './EstateLedgerModal.jsx';
import CashOnHandHelp from './CashOnHandHelp.jsx';
import EstateInlineLoading from './EstateInlineLoading.jsx';
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
  isClosed = false,
  sharedSummary = undefined,
  sharedLoading = false,
  sharedError = ''
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
  const useShared = sharedSummary !== undefined;
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
    if (useShared) {
      if (sharedSummary) {
        setSummary((prev) => mergeFinanceSummary(prev, sharedSummary));
        setError('');
        setLoading(false);
        setRefreshing(false);
      } else if (sharedLoading) {
        if (!hasSummaryRef.current) setLoading(true);
      } else if (sharedError) {
        setError(sharedError);
        setLoading(false);
        setRefreshing(false);
      } else if (!sharedLoading && !sharedSummary) {
        // Shared path finished with no payload — keep spinner off but don't invent empty money.
        if (!hasSummaryRef.current) setLoading(false);
      }
      return;
    }
    if (skipNextExternalKeyRef.current) {
      skipNextExternalKeyRef.current = false;
      return;
    }
    load();
  }, [useShared, sharedSummary, sharedLoading, sharedError, load, refreshKey]);

  // When shared loading flips on (new estate / refresh), clear stale empty summary.
  useEffect(() => {
    if (!useShared) return;
    if (sharedLoading && !sharedSummary) {
      setSummary(null);
      setLoading(true);
      setError('');
    }
  }, [useShared, sharedLoading, sharedSummary]);

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

  if ((loading || sharedLoading) && !summary) {
    return (
      <section className="ei-finance-snapshot ei-finance-snapshot-simple" aria-label="Money overview">
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Money overview</h2>
          </div>
        </div>
        <EstateInlineLoading label="Loading money overview…" />
        {error ? (
          <div className="ei-error" style={{ marginTop: '0.65rem' }}>
            {error}
            <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="ei-btn ei-btn-small" onClick={() => load()}>
                Retry
              </button>
            </div>
          </div>
        ) : null}
      </section>
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

  // Shared bootstrap still pending — never flash an empty money card.
  if (!summary) {
    return (
      <section className="ei-finance-snapshot ei-finance-snapshot-simple" aria-label="Money overview">
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Money overview</h2>
          </div>
        </div>
        <EstateInlineLoading label="Loading money overview…" />
      </section>
    );
  }

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
      <section className="ei-finance-snapshot ei-finance-snapshot-simple" aria-label="Money overview">
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Money overview</h2>
            <p className="ei-finance-case">Case {caseLabel}</p>
          </div>
        </div>

        {refreshing ? (
          <EstateInlineLoading
            className="ei-finance-refreshing"
            label="Updating money lists…"
          />
        ) : null}

        <div className="ei-finance-balance-label-row ei-finance-balance-label-row--always">
          <CashOnHandHelp />
        </div>

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
            <div className="ei-finance-balance-block">
              <button
                type="button"
                className="ei-finance-balance-card"
                onClick={() => setLedgerTab('summary')}
                title="Open estate money overview"
              >
                <span className="ei-finance-balance-amount">{formatMoney(cash)}</span>
                <span className="ei-finance-note">
                  {isClosed
                    ? 'Closed record · view only'
                    : 'In estate accounts · for proper estate obligations'}
                </span>
              </button>
            </div>

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
