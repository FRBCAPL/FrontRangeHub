import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  FinanceBankInfo,
  FinanceBidsViewer,
  FinanceExpensesEditor,
  FinanceLoansEditor,
  FinanceNetInfo,
  FinanceOtherCashEditor
} from './EstateFinanceCardEditors.jsx';

const CARD = {
  loans: 'loans',
  outstanding: 'outstanding',
  expenses: 'expenses',
  paid: 'paid',
  net: 'net',
  bank: 'bank',
  otherCash: 'otherCash'
};

function FinanceCard({ cardKey, title, amount, note, amountClass, rowClass, onOpen }) {
  return (
    <button
      type="button"
      className={`ei-finance-row ei-finance-card-btn${rowClass ? ` ${rowClass}` : ''}`}
      onClick={() => onOpen?.(cardKey)}
    >
      <span className="ei-finance-card-dt">{title}</span>
      <span className="ei-finance-card-dd">
        <span className={`ei-finance-amount${amountClass ? ` ${amountClass}` : ''}`}>
          {formatMoney(amount)}
        </span>
        {note ? <span className="ei-finance-note">{note}</span> : null}
        <span className="ei-finance-card-edit">Edit</span>
      </span>
    </button>
  );
}

/**
 * Snapshot + per-card editors (admin home).
 * Bank balance always visible; other cards collapsed by default.
 */
const EstateFinanceDashboard = ({
  refreshKey = 0,
  settings,
  onSettingsSaved,
  onChanged
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.getFinanceSummary();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load financial snapshot.');
      setSummary(null);
      return;
    }
    setSummary(result.data);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefresh]);

  const bump = () => {
    setLocalRefresh((n) => n + 1);
    onChanged?.();
  };

  const close = () => setActiveCard(null);

  if (loading && !summary) {
    return <p className="ei-status">Loading financial snapshot…</p>;
  }

  if (error && !summary) {
    return <div className="ei-error">{error}</div>;
  }

  if (!summary) return null;

  const netNegative = summary.netCashRemaining < 0;
  const caseLabel = summary.caseNumber || CASE_NUMBER;

  return (
    <>
      <section
        className={`ei-finance-snapshot${detailsOpen ? '' : ' ei-finance-snapshot-collapsed'}`}
        aria-label={`Estate financial health · Case ${caseLabel}`}
      >
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Estate Financial Health Snapshot</h2>
            <p className="ei-finance-case">Case {caseLabel} · tap a card to edit</p>
          </div>
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small ei-finance-toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? 'Hide details' : 'Show details'}
          </button>
        </div>

        <div className="ei-finance-grid ei-finance-grid-bank">
          <FinanceCard
            cardKey={CARD.bank}
            title="Estate Bank / Cash on Hand"
            amount={summary.estateCashOnHand}
            note={`Paid ${formatMoney(summary.paidAuctionSales)}${
              summary.otherCashOnHand
                ? ` + other ${formatMoney(summary.otherCashOnHand)}`
                : ''
            }`}
            amountClass="ei-finance-amount-lg"
            rowClass="ei-finance-bank"
            onOpen={setActiveCard}
          />
        </div>

        {detailsOpen ? (
          <div className="ei-finance-grid ei-finance-grid-details">
            <FinanceCard
              cardKey={CARD.loans}
              title="Total PR Capital Loans"
              amount={summary.prLoansTotal}
              note="Reimbursement Priority #1"
              onOpen={setActiveCard}
            />
            <FinanceCard
              cardKey={CARD.outstanding}
              title="Outstanding Bids"
              amount={summary.outstandingBids}
              note="Leading / winning — not paid yet"
              onOpen={setActiveCard}
            />
            <FinanceCard
              cardKey={CARD.expenses}
              title="Total Approved Expenses"
              amount={summary.expensesTotal}
              note="Locksmith, lot rent, utilities…"
              onOpen={setActiveCard}
            />
            <FinanceCard
              cardKey={CARD.paid}
              title="Amount Paid (items)"
              amount={summary.paidAuctionSales}
              note="Marked paid / deposited"
              onOpen={setActiveCard}
            />
            <FinanceCard
              cardKey={CARD.net}
              title="Net Cash Remaining"
              amount={summary.netCashRemaining}
              note={
                netNegative
                  ? 'Red = Paid sales − Expenses is negative'
                  : 'Paid sales − Expenses (outstanding bids excluded)'
              }
              amountClass="ei-finance-amount-lg"
              rowClass={`ei-finance-net${netNegative ? ' ei-finance-net-neg' : ''}`}
              onOpen={setActiveCard}
            />
          </div>
        ) : null}
      </section>

      <FinanceLoansEditor
        open={activeCard === CARD.loans}
        initialValue={settings?.pr_loans_total ?? summary.prLoansTotal}
        onClose={close}
        onSaved={(data) => {
          onSettingsSaved?.(data);
          bump();
        }}
      />
      <FinanceOtherCashEditor
        open={activeCard === CARD.otherCash}
        initialValue={settings?.estate_cash_on_hand ?? summary.otherCashOnHand}
        onClose={close}
        onSaved={(data) => {
          onSettingsSaved?.(data);
          bump();
        }}
      />
      <FinanceExpensesEditor
        open={activeCard === CARD.expenses}
        onClose={close}
        onChanged={bump}
      />
      <FinanceBidsViewer
        open={activeCard === CARD.outstanding}
        mode="outstanding"
        onClose={close}
      />
      <FinanceBidsViewer open={activeCard === CARD.paid} mode="paid" onClose={close} />
      <FinanceNetInfo open={activeCard === CARD.net} summary={summary} onClose={close} />
      <FinanceBankInfo
        open={activeCard === CARD.bank}
        summary={summary}
        onClose={close}
        onEditOtherCash={() => setActiveCard(CARD.otherCash)}
      />
    </>
  );
};

export default EstateFinanceDashboard;
