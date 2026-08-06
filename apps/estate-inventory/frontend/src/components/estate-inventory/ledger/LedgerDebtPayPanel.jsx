import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { confirmFundsOverspendIfNeeded } from '@shared/utils/estateFunds.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Pay down a listed debt from a Cash on hand fund account.
 * Records an expense (moves Funds) and reduces the debt balance.
 */
const LedgerDebtPayPanel = ({ debt, fundAccounts = [], caseNumber, onClose, onChanged }) => {
  const owed = Number(debt?.balance) || 0;
  const defaultAccountId =
    fundAccounts.find((a) => a.is_primary)?.id || fundAccounts[0]?.id || '';
  const [amount, setAmount] = useState(owed > 0 ? String(owed) : '');
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [payDate, setPayDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(owed > 0 ? String(owed) : '');
    setAccountId(defaultAccountId);
    setPayDate(today());
    setError('');
  }, [debt?.id, owed, defaultAccountId]);

  if (!debt) return null;

  const submit = async (ev) => {
    ev.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    if (amt > owed + 0.001) {
      setError(`Payment can’t be more than the amount owed (${formatMoney(owed)}).`);
      return;
    }
    if (!accountId) {
      setError('Choose a fund account to pay from.');
      return;
    }

    const account = fundAccounts.find((a) => a.id === accountId);
    const okToPay = confirmFundsOverspendIfNeeded({
      account,
      signedDelta: -Math.abs(amt),
      actionLabel: 'debt payment'
    });
    if (!okToPay) return;

    setBusy(true);
    setError('');
    const label = `Debt payment · ${debt.account_name || 'creditor'}`;
    const expenseResult = await estateInventoryService.addEstateExpense({
      expenseName: label,
      amount: amt,
      datePaid: payDate ? new Date(`${payDate}T12:00:00`).toISOString() : undefined,
      caseNumber,
      accountId
    });
    if (!expenseResult.success) {
      setBusy(false);
      setError(expenseResult.error || 'Could not record the payment from Funds.');
      return;
    }

    const nextBalance = Math.max(0, Math.round((owed - amt) * 100) / 100);
    const debtResult = await estateInventoryService.updateEstateAccount(
      debt.id,
      {
        caseNumber,
        kind: 'debt',
        accountType: debt.account_type,
        accountName: debt.account_name,
        institution: debt.institution || '',
        last4: debt.last4 || '',
        balance: nextBalance,
        asOfDate: payDate,
        notes: debt.notes || '',
        countsAsFunds: false,
        isPrimary: false
      },
      caseNumber
    );
    if (!debtResult.success) {
      setError(
        debtResult.error ||
          'Payment left Cash on hand, but the debt balance could not be updated. Edit the debt amount manually.'
      );
      try {
        await onChanged?.();
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      await onChanged?.();
      onClose?.(
        expenseResult.warning
          ? `Paid ${formatMoney(amt)} toward ${debt.account_name}. ${expenseResult.warning}`
          : `Paid ${formatMoney(amt)} toward ${debt.account_name}. Remaining: ${formatMoney(nextBalance)}.`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ei-ledger-compose" aria-labelledby="ei-debt-pay-title">
      <h4 id="ei-debt-pay-title" className="ei-ledger-compose-title">
        Pay debt · {debt.account_name}
      </h4>
      <p className="ei-settings-hint">
        Pays from Cash on hand and lowers this debt. Owed now: {formatMoney(owed)}.
      </p>
      {error ? <div className="ei-error">{error}</div> : null}
      {!fundAccounts.length ? (
        <p className="ei-settings-hint">
          Add a fund account under Cash on hand first, then record the payment.
        </p>
      ) : (
        <form className="ei-finance-expense-form" onSubmit={submit}>
          <div className="ei-field">
            <label htmlFor="ei-debt-pay-amt">Payment amount ($)</label>
            <input
              id="ei-debt-pay-amt"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-debt-pay-date">Date paid</label>
            <input
              id="ei-debt-pay-date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-debt-pay-acct">Pay from fund account</label>
            <select
              id="ei-debt-pay-acct"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {fundAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                  {a.is_primary ? ' (primary)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="ei-btn-row ei-field-wide">
            <button type="submit" className="ei-btn ei-btn-small" disabled={busy || !accountId}>
              {busy ? 'Saving…' : 'Record payment'}
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-small ei-btn-secondary"
              onClick={() => onClose?.()}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default LedgerDebtPayPanel;
