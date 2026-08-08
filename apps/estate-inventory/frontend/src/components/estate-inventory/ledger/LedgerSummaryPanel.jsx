import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { saleAuctionCopy } from '@shared/utils/estateSaleAuctionCopy.js';
import GlossaryTerm from '../GlossaryTerm';
import CashAvailableHint from '../CashAvailableHint';

function Line({ label, amount, sub, strong = false, onJump, jumpLabel }) {
  return (
    <div className={`ei-ledger-line${strong ? ' ei-ledger-line-strong' : ''}`}>
      <div className="ei-ledger-line-label">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </div>
      <div className="ei-ledger-line-value">
        <span>{formatMoney(amount)}</span>
        {onJump ? (
          <button type="button" className="ei-link-btn" onClick={onJump}>
            {jumpLabel || 'Open'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * First screen inside Estate money — teach the model, then offer next actions.
 * Accounting-style lines stay behind “Full breakdown”.
 */
const LedgerSummaryPanel = ({
  summary,
  caseNumber,
  readOnly,
  onGoTo,
  onChanged,
  onSettingsSaved
}) => {
  const [cash, setCash] = useState(String(summary?.otherCashOnHand ?? 0));
  const [editingCash, setEditingCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    setCash(String(summary?.otherCashOnHand ?? 0));
  }, [summary?.otherCashOnHand]);

  const saveCash = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      caseNumber,
      estateCashOnHand: Number(cash) || 0
    });
    if (!result.success) {
      setBusy(false);
      setError(result.error || 'Could not save cash on hand.');
      return;
    }
    setEditingCash(false);
    onSettingsSaved?.(result.data);
    try {
      await onChanged?.();
      setInfo('Extra cash saved.');
    } finally {
      setBusy(false);
    }
  };

  const cashAvailable =
    summary.fundsAvailable != null ? summary.fundsAvailable : summary.accountAssetsTotal;
  const propertyNotCash =
    summary.nonCashAssets != null
      ? summary.nonCashAssets
      : (summary.outstandingBids || 0) + (summary.unsoldInventoryValue || 0);
  const fundCount = (summary.accounts || []).filter((a) => a.kind !== 'debt').length;
  const negative = summary.netDistributable < 0;

  return (
    <div className="ei-ledger-summary ei-ledger-summary-simple">
      <div className="ei-money-picture" aria-label="Simple money picture">
        <button type="button" className="ei-money-picture-card" onClick={() => onGoTo('accounts')}>
          <span className="ei-money-picture-label">Cash available</span>
          <span className="ei-money-picture-amount">{formatMoney(cashAvailable)}</span>
          <span className="ei-money-picture-hint">
            {fundCount
              ? `${fundCount} bank account${fundCount === 1 ? '' : 's'}${
                  summary.undepositedPaidSales > 0
                    ? ` · ${formatMoney(summary.undepositedPaidSales)} paid, not deposited`
                    : ''
                }`
              : 'Add a bank account to start'}
          </span>
        </button>
        <button type="button" className="ei-money-picture-card" onClick={() => onGoTo('inventory')}>
          <span className="ei-money-picture-label">Property (not cash)</span>
          <span className="ei-money-picture-amount">{formatMoney(propertyNotCash)}</span>
          <span className="ei-money-picture-hint">Estimates &amp; unpaid sale amounts</span>
        </button>
        <button type="button" className="ei-money-picture-card" onClick={() => onGoTo('accounts')}>
          <span className="ei-money-picture-label">Debts owed</span>
          <span
            className={`ei-money-picture-amount${
              summary.totalLiabilities > 0 ? ' ei-finance-net-neg-text' : ''
            }`}
          >
            {formatMoney(summary.totalLiabilities)}
          </span>
          <span className="ei-money-picture-hint">Credit cards, loans, money you advanced</span>
        </button>
      </div>

      <CashAvailableHint />

      {!readOnly ? (
        <div className="ei-money-next" aria-label="What to do next">
          <h4>What do you need to do?</h4>
          <div className="ei-finance-simple-actions">
            {!fundCount ? (
              <button type="button" className="ei-btn" onClick={() => onGoTo('accounts')}>
                1. Add the estate bank account
              </button>
            ) : (
              <>
                <button type="button" className="ei-btn" onClick={() => onGoTo('expenses')}>
                  Pay a bill
                </button>
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={() => onGoTo('transactions')}
                >
                  Record money that came in
                </button>
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={() => onGoTo('distributions')}
                >
                  Give cash or property to heirs
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <details
        className="ei-money-breakdown"
        open={showBreakdown}
        onToggle={(e) => setShowBreakdown(e.currentTarget.open)}
      >
        <summary>Full breakdown (optional)</summary>

        <section className="ei-ledger-group">
          <h4>Cash</h4>
          <Line
            label="Bank accounts"
            amount={summary.accountAssetsTotal}
            sub="Starting balance + money in − money out"
            onJump={() => onGoTo('accounts')}
            jumpLabel="Accounts"
          />
          <Line
            label="Extra cash not in a bank account"
            amount={summary.otherCashOnHand}
            sub="Uncashed check, petty cash, etc."
            onJump={readOnly ? undefined : () => setEditingCash((on) => !on)}
            jumpLabel={editingCash ? 'Cancel' : 'Edit'}
          />
          {editingCash ? (
            <div className="ei-ledger-cash-row">
              <div className="ei-field">
                <label htmlFor="ei-ledger-cash">Amount ($)</label>
                <input
                  id="ei-ledger-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cash}
                  onChange={(ev) => setCash(ev.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="ei-btn ei-btn-small"
                onClick={saveCash}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : null}
          <Line label="Cash total" amount={cashAvailable} strong />
        </section>

        <section className="ei-ledger-group">
          <h4>Property (not cash)</h4>
          <Line
            label="Sale amounts not collected yet"
            amount={summary.outstandingBids}
            onJump={() => onGoTo('auction')}
            jumpLabel={saleAuctionCopy.ledgerTab}
          />
          {summary.undepositedPaidSales > 0 ? (
            <Line
              label="Sold — money not in an estate account yet"
              amount={summary.undepositedPaidSales}
              sub="Buyer paid; deposit into Cash on hand when the money hits the bank"
              onJump={() => onGoTo('auction')}
              jumpLabel={saleAuctionCopy.ledgerTab}
            />
          ) : null}
          <Line
            label="Unsold items (estimates)"
            amount={summary.unsoldInventoryValue}
            sub={
              summary.unvaluedInventoryCount
                ? `${summary.unvaluedInventoryCount} item(s) still need a value`
                : undefined
            }
          />
          <Line label="Property total" amount={propertyNotCash} strong />
        </section>

        <section className="ei-ledger-group">
          <h4>Owed</h4>
          <Line
            label="Debts"
            amount={summary.accountDebtsTotal}
            onJump={() => onGoTo('accounts')}
            jumpLabel="Accounts"
          />
          <Line
            label={<GlossaryTerm termKey="pr_loan">Money you advanced</GlossaryTerm>}
            amount={summary.prLoansTotal}
            onJump={() => onGoTo('loans')}
            jumpLabel="Open"
          />
          <Line label="Total owed" amount={summary.totalLiabilities} strong />
        </section>

        <section className="ei-ledger-group">
          <h4>Bills (already paid)</h4>
          <Line
            label="Expense history"
            amount={summary.expensesTotal}
            sub="Activity only — cash effect is already in bank balance when paid from Funds"
            onJump={() => onGoTo('expenses')}
            jumpLabel="Bills"
          />
        </section>

        <section className="ei-ledger-group">
          <h4>
            <GlossaryTerm termKey="distribution">Given to heirs</GlossaryTerm>
          </h4>
          <Line
            label="Cash given"
            amount={summary.distributedCashTotal || 0}
            onJump={() => onGoTo('distributions')}
            jumpLabel="Open"
          />
          <Line
            label="Property given"
            amount={summary.distributedPropertyValue || 0}
            onJump={() => onGoTo('distributions')}
            jumpLabel="Open"
          />
        </section>

        <div className={`ei-ledger-balance${negative ? ' ei-ledger-balance-neg' : ''}`}>
          <div>
            <span>
              <GlossaryTerm termKey="estate_balance">Rough estate total</GlossaryTerm>
            </span>
            <small>Cash + property − debts (for context, not a bank balance)</small>
          </div>
          <strong>{formatMoney(summary.netDistributable)}</strong>
        </div>
      </details>

      <p className="ei-settings-hint">
        Court-style beginning-to-end statements live under Reports →{' '}
        <GlossaryTerm termKey="formal_accounting">Formal accounting</GlossaryTerm>.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
    </div>
  );
};

export default LedgerSummaryPanel;
