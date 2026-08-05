import React, { useEffect, useState } from 'react';
import { formatMoney } from '@shared/utils/estateFinance.js';
import EstateModalShell from './EstateModalShell.jsx';
import { useEstateCase } from './EstateCaseContext';
import LedgerSummaryPanel from './ledger/LedgerSummaryPanel.jsx';
import LedgerAccountsPanel from './ledger/LedgerAccountsPanel.jsx';
import LedgerFundsTransactionsPanel from './ledger/LedgerFundsTransactionsPanel.jsx';
import LedgerPrLoansPanel from './ledger/LedgerPrLoansPanel.jsx';
import LedgerExpensesPanel from './ledger/LedgerExpensesPanel.jsx';
import LedgerAuctionPanel from './ledger/LedgerAuctionPanel.jsx';
import LedgerDistributionsPanel from './ledger/LedgerDistributionsPanel.jsx';
import LedgerInventoryReconPanel from './ledger/LedgerInventoryReconPanel.jsx';
import LedgerClaimsPanel from './ledger/LedgerClaimsPanel.jsx';
import CashAvailableHint from './CashAvailableHint.jsx';

/** Everyday tasks — shown first for a new PR. */
const PRIMARY_TABS = [
  { id: 'summary', label: 'Overview', hint: 'Simple picture of cash, property, and debts' },
  { id: 'accounts', label: 'Accounts', hint: 'Bank, retirement, SS, insurance, debts' },
  { id: 'claims', label: 'Creditor claims', hint: 'Who claimed money against the estate' },
  { id: 'expenses', label: 'Pay a bill', hint: 'Record a cost paid from estate cash' },
  { id: 'transactions', label: 'Money in & out', hint: 'Running list of deposits and payments' },
  { id: 'distributions', label: 'Give to heirs', hint: 'Cash or property delivered to beneficiaries' }
];

/** Less common — tucked under “More”. */
const MORE_TABS = [
  { id: 'loans', label: 'Money I advanced', hint: 'Personal money you paid for the estate' },
  { id: 'auction', label: 'Sale/auction sales', hint: 'Bids collected and still outstanding' },
  { id: 'inventory', label: 'Inventory check', hint: 'Make sure every item has one status' }
];

const ALL_TABS = [...PRIMARY_TABS, ...MORE_TABS];

function tabCount(id, summary) {
  if (id === 'accounts') return summary.accounts?.length || 0;
  if (id === 'claims') return summary.creditorClaims?.length || 0;
  if (id === 'transactions') return summary.fundTransactions?.length || 0;
  if (id === 'expenses') return summary.expenses?.length || 0;
  if (id === 'loans') return summary.prLoans?.length || 0;
  return 0;
}

/**
 * Estate money workspace — everyday words, primary tasks first.
 */
const EstateLedgerModal = ({
  open,
  summary,
  readOnly = false,
  initialTab = 'summary',
  onClose,
  onChanged,
  onExpenseSaved,
  onSettingsSaved
}) => {
  const { caseNumber } = useEstateCase();
  const [tab, setTab] = useState(initialTab);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setShowMore(MORE_TABS.some((t) => t.id === initialTab));
  }, [open, initialTab]);

  if (!open || !summary) return null;

  const cash =
    summary.fundsAvailable != null ? summary.fundsAvailable : summary.accountAssetsTotal;
  const activeHint = ALL_TABS.find((t) => t.id === tab)?.hint;

  const renderTab = (entry) => {
    const count = tabCount(entry.id, summary);
    return (
      <button
        key={entry.id}
        type="button"
        role="tab"
        aria-selected={tab === entry.id}
        title={entry.hint}
        className={`ei-ledger-tab${tab === entry.id ? ' is-active' : ''}`}
        onClick={() => setTab(entry.id)}
      >
        {entry.label}
        {count ? <span className="ei-ledger-tab-count">{count}</span> : null}
      </button>
    );
  };

  return (
    <EstateModalShell
      title="Estate money"
      subtitle={activeHint}
      onClose={onClose}
      className="ei-modal-ledger"
      foot={
        <div className="ei-accounts-foot">
          <div className="ei-accounts-foot-net">
            <span>Cash available</span>
            <strong>{formatMoney(cash)}</strong>
            <CashAvailableHint className="ei-settings-hint ei-accounts-foot-hint" />
          </div>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="ei-ledger-tabs" role="tablist" aria-label="Everyday money tasks">
        {PRIMARY_TABS.map(renderTab)}
      </div>

      <div className="ei-ledger-more-wrap">
        <button
          type="button"
          className="ei-link-btn ei-ledger-more-toggle"
          aria-expanded={showMore}
          onClick={() => setShowMore((on) => !on)}
        >
          {showMore ? 'Hide less-common tools' : 'More tools (loans, auction, inventory)'}
        </button>
        {showMore ? (
          <div className="ei-ledger-tabs ei-ledger-tabs-more" role="tablist" aria-label="More money tools">
            {MORE_TABS.map(renderTab)}
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <p className="ei-settings-hint">
          This estate is closed for records. Money records are view-only.
        </p>
      ) : null}

      <div className="ei-ledger-panel" role="tabpanel">
        {tab === 'summary' ? (
          <LedgerSummaryPanel
            summary={summary}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onGoTo={setTab}
            onChanged={onChanged}
            onSettingsSaved={onSettingsSaved}
          />
        ) : null}
        {tab === 'accounts' ? (
          <LedgerAccountsPanel
            rows={summary.accounts}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'claims' ? (
          <LedgerClaimsPanel
            rows={summary.creditorClaims}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'transactions' ? (
          <LedgerFundsTransactionsPanel
            rows={summary.fundTransactions}
            accounts={summary.accounts}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'expenses' ? (
          <LedgerExpensesPanel
            rows={summary.expenses}
            accounts={summary.accounts}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onChanged={onChanged}
            onExpenseSaved={onExpenseSaved}
          />
        ) : null}
        {tab === 'loans' ? (
          <LedgerPrLoansPanel
            rows={summary.prLoans}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'auction' ? (
          <LedgerAuctionPanel caseNumber={caseNumber} refreshKey={summary.netDistributable} />
        ) : null}
        {tab === 'distributions' ? (
          <LedgerDistributionsPanel
            caseNumber={caseNumber}
            estateName={summary.estateName}
            accounts={summary.accounts}
            financeSummary={summary}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'inventory' ? (
          <LedgerInventoryReconPanel
            caseNumber={caseNumber}
            estateName={summary.estateName}
          />
        ) : null}
      </div>
    </EstateModalShell>
  );
};

export default EstateLedgerModal;
