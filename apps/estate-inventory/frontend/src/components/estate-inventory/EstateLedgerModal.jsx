import React, { useEffect, useState } from 'react';
import { formatMoney } from '@shared/utils/estateFinance.js';
import EstateModalShell from './EstateModalShell.jsx';
import { useEstateCase } from './EstateCaseContext';
import LedgerSummaryPanel from './ledger/LedgerSummaryPanel.jsx';
import LedgerAccountsPanel from './ledger/LedgerAccountsPanel.jsx';
import LedgerPrLoansPanel from './ledger/LedgerPrLoansPanel.jsx';
import LedgerExpensesPanel from './ledger/LedgerExpensesPanel.jsx';
import LedgerAuctionPanel from './ledger/LedgerAuctionPanel.jsx';
import LedgerDistributionsPanel from './ledger/LedgerDistributionsPanel.jsx';
import LedgerInventoryReconPanel from './ledger/LedgerInventoryReconPanel.jsx';

const TABS = [
  { id: 'summary', label: 'Summary', hint: 'What the estate holds, owes, and is worth today' },
  { id: 'accounts', label: 'Accounts & debts', hint: 'Bank accounts and money the estate owes' },
  { id: 'expenses', label: 'Expenses', hint: 'Costs the estate has paid' },
  { id: 'loans', label: 'PR loans', hint: 'Money you advanced personally' },
  { id: 'auction', label: 'Auction', hint: 'Sales collected and bids still outstanding' },
  {
    id: 'distributions',
    label: 'Distributions',
    hint: 'Cash, property transfers, acknowledgements, and receipts'
  },
  {
    id: 'inventory',
    label: 'Inventory status',
    hint: 'Every item in exactly one disposition — catch auction lot mismatches'
  }
];

function tabCount(id, summary) {
  if (id === 'accounts') return summary.accounts?.length || 0;
  if (id === 'expenses') return summary.expenses?.length || 0;
  if (id === 'loans') return summary.prLoans?.length || 0;
  return 0;
}

/**
 * The estate's single financial record. Every tab reads from one snapshot, so
 * the tabs and the balance can never disagree.
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

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open || !summary) return null;

  const negative = summary.netDistributable < 0;

  return (
    <EstateModalShell
      title="Estate ledger"
      subtitle={TABS.find((t) => t.id === tab)?.hint}
      onClose={onClose}
      className="ei-modal-ledger"
      foot={
        <div className="ei-accounts-foot">
          <div className="ei-accounts-foot-net">
            <span>Estate balance</span>
            <strong className={negative ? 'ei-finance-net-neg-text' : ''}>
              {formatMoney(summary.netDistributable)}
            </strong>
          </div>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="ei-ledger-tabs" role="tablist" aria-label="Estate ledger sections">
        {TABS.map((entry) => {
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
        })}
      </div>

      {readOnly ? (
        <p className="ei-settings-hint">
          This estate is closed for records. The ledger is complete and view-only.
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
        {tab === 'expenses' ? (
          <LedgerExpensesPanel
            rows={summary.expenses}
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
