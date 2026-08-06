import React, { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  hasSeenMoneyGuide,
  markMoneyGuideSeen
} from '@shared/utils/estateMoneyGuide.js';
import EstateModalShell from './EstateModalShell.jsx';
import { useEstateCase } from './EstateCaseContext';
import GlossaryTerm from './GlossaryTerm.jsx';
import LedgerSummaryPanel from './ledger/LedgerSummaryPanel.jsx';
import LedgerAccountsPanel from './ledger/LedgerAccountsPanel.jsx';
import LedgerFundsTransactionsPanel from './ledger/LedgerFundsTransactionsPanel.jsx';
import LedgerPrLoansPanel from './ledger/LedgerPrLoansPanel.jsx';
import LedgerExpensesPanel from './ledger/LedgerExpensesPanel.jsx';
import LedgerAuctionPanel from './ledger/LedgerAuctionPanel.jsx';
import LedgerDistributionsPanel from './ledger/LedgerDistributionsPanel.jsx';
import LedgerInventoryReconPanel from './ledger/LedgerInventoryReconPanel.jsx';
import LedgerClaimsPanel from './ledger/LedgerClaimsPanel.jsx';
import LedgerMoneyGuide from './ledger/LedgerMoneyGuide.jsx';

/** Everyday tasks — shown first for a new PR. */
const PRIMARY_TABS = [
  { id: 'summary', label: 'Overview', hint: 'Simple picture of cash, property, and debts' },
  { id: 'accounts', label: 'Accounts', hint: 'Bank, retirement, SS, insurance, debts' },
  { id: 'expenses', label: 'Pay a bill', hint: 'Record a cost paid from estate cash' },
  { id: 'transactions', label: 'Money in/out', hint: 'Running list of deposits and payments' },
  { id: 'distributions', label: 'Give to heirs', hint: 'Cash or property delivered to beneficiaries' }
];

/** Secondary tools — always shown under the primary strip. */
const SECONDARY_TABS = [
  { id: 'claims', label: 'Creditor claims', hint: 'Who claimed money against the estate' },
  { id: 'loans', label: 'Money I advanced', hint: 'Personal money you paid for the estate' },
  { id: 'auction', label: 'Sale/auction sales', hint: 'Bids collected and still outstanding' },
  { id: 'inventory', label: 'Inventory check', hint: 'Make sure every item has one status' }
];

const ALL_TABS = [...PRIMARY_TABS, ...SECONDARY_TABS];

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
  refreshing = false,
  initialTab = 'summary',
  onClose,
  onChanged,
  onExpenseSaved,
  onSettingsSaved
}) => {
  const { caseNumber } = useEstateCase();
  const [tab, setTab] = useState(initialTab);
  const [showGuide, setShowGuide] = useState(false);
  const [showTourBanner, setShowTourBanner] = useState(false);
  const [canScrollTabs, setCanScrollTabs] = useState(false);
  const tabScrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setShowGuide(false);
    setShowTourBanner(!hasSeenMoneyGuide());
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const el = tabScrollRef.current;
    if (!el) return;

    const updateOverflow = () => {
      const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setCanScrollTabs(remaining > 10);
    };
    updateOverflow();
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOverflow) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateOverflow);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      ro?.disconnect();
      window.removeEventListener('resize', updateOverflow);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = tabScrollRef.current;
    if (!root) return;
    const activeBtn = root.querySelector('.ei-ledger-tab.is-active');
    activeBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [open, tab]);

  if (!open || !summary) return null;

  const cash =
    summary.fundsAvailable != null ? summary.fundsAvailable : summary.accountAssetsTotal;
  const active = ALL_TABS.find((t) => t.id === tab) || PRIMARY_TABS[0];

  const goToTab = (id) => {
    setTab(id);
    setShowGuide(false);
  };

  const openGuide = () => {
    setShowTourBanner(false);
    setShowGuide(true);
  };

  const dismissTourBanner = () => {
    markMoneyGuideSeen();
    setShowTourBanner(false);
  };

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
        onClick={() => goToTab(entry.id)}
      >
        {entry.label}
        {count ? <span className="ei-ledger-tab-count">{count}</span> : null}
      </button>
    );
  };

  return (
    <EstateModalShell
      title="Estate money"
      subtitle={active.hint}
      onClose={onClose}
      className="ei-modal-ledger"
      foot={
        <div className="ei-accounts-foot">
          <div className="ei-accounts-foot-row">
            <div className="ei-accounts-foot-net">
              <span className="ei-accounts-foot-label">
                <GlossaryTerm termKey="cash_available" iconOnly />
                Cash available
              </span>
              <strong className="ei-accounts-foot-amount">{formatMoney(cash)}</strong>
              <span className="ei-accounts-foot-hint-quiet">
                Fund accounts only · sales stay separate until deposited
              </span>
            </div>
            <button type="button" className="ei-btn ei-btn-secondary ei-accounts-foot-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="ei-ledger-nav">
        <div className="ei-ledger-nav-row">
          <div className="ei-ledger-nav-scroll-wrap">
            <div
              ref={tabScrollRef}
              className="ei-ledger-nav-scroll"
              role="tablist"
              aria-label="Everyday money tasks"
            >
              {PRIMARY_TABS.map(renderTab)}
            </div>
            {canScrollTabs ? (
              <button
                type="button"
                className="ei-ledger-nav-peek"
                aria-label="Show more tabs"
                onClick={() => {
                  const el = tabScrollRef.current;
                  if (!el) return;
                  el.scrollBy({ left: Math.max(140, el.clientWidth * 0.55), behavior: 'smooth' });
                }}
              >
                ›
              </button>
            ) : null}
          </div>
          <div className="ei-ledger-nav-aside">
            <button
              type="button"
              className="ei-ledger-help-link"
              aria-expanded={showGuide}
              title="How money works"
              onClick={() => {
                if (showGuide) setShowGuide(false);
                else openGuide();
              }}
            >
              <span className="ei-ledger-help-full">
                {showGuide ? 'Hide guide' : 'How money works'}
              </span>
              <span className="ei-ledger-help-short" aria-hidden="true">
                {showGuide ? 'Hide' : 'Guide'}
              </span>
            </button>
          </div>
        </div>
        <div className="ei-ledger-nav-more" role="tablist" aria-label="Additional money tools">
          {SECONDARY_TABS.map(renderTab)}
        </div>
      </div>

      {showTourBanner && !showGuide ? (
        <div className="ei-money-tour-banner" role="status">
          <p>
            <strong>New here?</strong> A one-minute tour of cash, sales, and bills.
          </p>
          <div className="ei-money-tour-actions">
            <button type="button" className="ei-btn ei-btn-small" onClick={openGuide}>
              How money works
            </button>
            <button type="button" className="ei-link-btn" onClick={dismissTourBanner}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {showGuide ? (
        <LedgerMoneyGuide
          firstVisit={showTourBanner}
          onGoTo={goToTab}
          onClose={() => {
            markMoneyGuideSeen();
            setShowGuide(false);
            setShowTourBanner(false);
          }}
        />
      ) : null}

      {readOnly ? (
        <p className="ei-ledger-readonly">
          This estate is closed for records. Money records are view-only.
        </p>
      ) : null}

      {refreshing ? (
        <p className="ei-status ei-ledger-refreshing" aria-live="polite">
          Updating lists…
        </p>
      ) : null}

      <div className="ei-ledger-panel" role="tabpanel">
        <header className="ei-ledger-page-head">
          <h3>
            {active.label}
            {tab === 'summary' ? (
              <GlossaryTerm termKey="estate_money_model" iconOnly className="ei-ledger-page-tip" />
            ) : null}
          </h3>
          <p>{active.hint}</p>
        </header>

        {tab === 'summary' ? (
          <LedgerSummaryPanel
            summary={summary}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onGoTo={goToTab}
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
