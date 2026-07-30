import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  FinanceBankInfo,
  FinanceBidsViewer,
  FinanceExpensesEditor,
  FinanceLoansEditor,
  FinanceNetInfo,
  FinanceOtherCashEditor
} from './EstateFinanceCardEditors.jsx';
import { useEstateCase } from './EstateCaseContext';

const CARD = {
  loans: 'loans',
  outstanding: 'outstanding',
  expenses: 'expenses',
  paid: 'paid',
  net: 'net',
  bank: 'bank',
  otherCash: 'otherCash'
};

function FinanceCard({ cardKey, title, amount, note, amountClass, rowClass, onOpen, readOnly = false }) {
  return (
    <button
      type="button"
      className={`ei-finance-row ei-finance-card-btn${rowClass ? ` ${rowClass}` : ''}`}
      onClick={() => onOpen?.(cardKey)}
      disabled={readOnly}
      title={readOnly ? 'Estate is closed for records. Financial values are view-only.' : ''}
    >
      <span className="ei-finance-card-dt">{title}</span>
      <span className="ei-finance-card-dd">
        <span className={`ei-finance-amount${amountClass ? ` ${amountClass}` : ''}`}>
          {formatMoney(amount)}
        </span>
        {note ? <span className="ei-finance-note">{note}</span> : null}
        <span className="ei-finance-card-edit">{readOnly ? 'View only' : 'Edit'}</span>
      </span>
    </button>
  );
}

function FinanceDetailsModal({ open, caseLabel, summary, netNegative, onClose, onOpenCard, readOnly }) {
  if (!open || !summary) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-finance-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-finance-details-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3 id="ei-finance-details-title">Financial details</h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              Case {caseLabel} · {readOnly ? 'view-only closed record' : 'tap a card to edit'}
            </p>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <div className="ei-finance-grid ei-finance-grid-details">
            <FinanceCard
              cardKey={CARD.loans}
              title="Total PR Capital Loans"
              amount={summary.prLoansTotal}
              note="Reimbursement Priority #1"
              onOpen={onOpenCard}
              readOnly={readOnly}
            />
            <FinanceCard
              cardKey={CARD.outstanding}
              title="Outstanding Bids"
              amount={summary.outstandingBids}
              note="Leading / winning — not paid yet"
              onOpen={onOpenCard}
              readOnly={readOnly}
            />
            <FinanceCard
              cardKey={CARD.expenses}
              title="Total Approved Expenses"
              amount={summary.expensesTotal}
              note="Locksmith, lot rent, utilities…"
              onOpen={onOpenCard}
              readOnly={readOnly}
            />
            <FinanceCard
              cardKey={CARD.paid}
              title="Amount Paid (items)"
              amount={summary.paidAuctionSales}
              note="Marked paid / deposited"
              onOpen={onOpenCard}
              readOnly={readOnly}
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
              onOpen={onOpenCard}
              readOnly={readOnly}
            />
          </div>
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Snapshot + per-card editors (admin home).
 * Bank balance always visible; full details open in a modal.
 */
const EstateFinanceDashboard = ({
  refreshKey = 0,
  settings,
  onSettingsSaved,
  onChanged,
  isClosed = false
}) => {
  const { caseNumber } = useEstateCase();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
  const caseLabel =
    summary.displayCaseNumber ||
    estateDisplayCaseNumber(settings, summary.caseNumber || '');

  return (
    <>
      <section
        className="ei-finance-snapshot ei-finance-snapshot-collapsed"
        aria-label={`Estate financial health · Case ${caseLabel}`}
      >
        <div className="ei-finance-head">
          <div>
            <h2 className="ei-finance-title">Estate Financial Health Snapshot</h2>
            <p className="ei-finance-case">Case {caseLabel} · bank on hand below</p>
          </div>
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small ei-finance-toggle"
            aria-haspopup="dialog"
            onClick={() => setDetailsOpen(true)}
          >
            Show details
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
            readOnly={isClosed}
          />
        </div>
      </section>

      <FinanceDetailsModal
        open={detailsOpen}
        caseLabel={caseLabel}
        summary={summary}
        netNegative={netNegative}
        onClose={() => setDetailsOpen(false)}
        onOpenCard={setActiveCard}
        readOnly={isClosed}
      />

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
