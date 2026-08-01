import React, { useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { fundsCategoryLabel } from '@shared/utils/estateFunds.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Estate Funds running ledger — deposits, expenses, distributions, adjustments.
 * Balance changes only through these rows (plus opening balance on the account).
 */
const LedgerFundsTransactionsPanel = ({
  rows = [],
  accounts = [],
  caseNumber,
  readOnly,
  onChanged
}) => {
  const fundAccounts = useMemo(
    () => (accounts || []).filter((a) => a.kind !== 'debt'),
    [accounts]
  );
  const primaryId =
    fundAccounts.find((a) => a.is_primary)?.id || fundAccounts[0]?.id || '';

  const [accountId, setAccountId] = useState(primaryId);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [txnDate, setTxnDate] = useState(today);
  const [mode, setMode] = useState('deposit'); // deposit | adjustment
  const [filterAccountId, setFilterAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const accountNameById = useMemo(() => {
    const map = {};
    for (const a of fundAccounts) map[a.id] = a.account_name || 'Account';
    return map;
  }, [fundAccounts]);

  const visible = useMemo(() => {
    const list = rows || [];
    if (!filterAccountId) return list;
    return list.filter((r) => r.account_id === filterAccountId);
  }, [rows, filterAccountId]);

  const saveDeposit = async (ev) => {
    ev.preventDefault();
    if (!accountId) {
      setError('Add a fund account first, then record deposits here.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    const result =
      mode === 'adjustment'
        ? await estateInventoryService.addEstateFundsAdjustment({
            accountId,
            amount,
            memo,
            txnDate,
            caseNumber
          })
        : await estateInventoryService.addEstateFundsDeposit({
            accountId,
            amount,
            memo,
            txnDate,
            caseNumber
          });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save the transaction.');
      return;
    }
    setInfo(mode === 'adjustment' ? 'Adjustment recorded.' : 'Deposit recorded. Funds balance updated.');
    setAmount('');
    setMemo('');
    onChanged?.();
  };

  const remove = async (row) => {
    const ok = window.confirm(
      'Remove this transaction? The Funds balance will recalculate from opening balance and remaining transactions.'
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    const result = await estateInventoryService.removeEstateFundsTransaction(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not remove transaction.');
      return;
    }
    setInfo('Transaction removed. Funds balance updated.');
    onChanged?.();
  };

  return (
    <>
      <p className="ei-settings-hint">
        Every time money moves, add it here (or use Pay a bill / Give to heirs, which do this for
        you). Opening balance was set on the bank account — you never type a new current balance.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly && fundAccounts.length ? (
        <form className="ei-finance-expense-form" onSubmit={saveDeposit}>
          <div className="ei-field">
            <label htmlFor="ei-funds-mode">Record</label>
            <select
              id="ei-funds-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="deposit">Deposit / income</option>
              <option value="adjustment">Adjustment (correction)</option>
            </select>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-funds-acct">Fund account</label>
            <select
              id="ei-funds-acct"
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
          <div className="ei-field">
            <label htmlFor="ei-funds-amt">
              {mode === 'adjustment' ? 'Amount (+ in / − out)' : 'Amount ($)'}
            </label>
            <input
              id="ei-funds-amt"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder={mode === 'adjustment' ? 'e.g. -25.00' : 'e.g. 1200'}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-funds-date">Date</label>
            <input
              id="ei-funds-date"
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              required
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-funds-memo">
              {mode === 'adjustment' ? 'Why (required)' : 'Description'}
            </label>
            <input
              id="ei-funds-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={
                mode === 'adjustment'
                  ? 'e.g. Corrected duplicate entry'
                  : 'e.g. Insurance refund'
              }
              required={mode === 'adjustment'}
            />
          </div>
          <div className="ei-btn-row ei-field-wide">
            <button type="submit" className="ei-btn ei-btn-small" disabled={busy}>
              {busy ? 'Saving…' : mode === 'adjustment' ? 'Record adjustment' : 'Record deposit'}
            </button>
          </div>
        </form>
      ) : null}

      {!fundAccounts.length ? (
        <p className="ei-settings-hint">
          Add a fund account under Accounts &amp; debts first. That sets the opening balance; then
          every change is a transaction.
        </p>
      ) : null}

      <div className="ei-field" style={{ maxWidth: '16rem', marginTop: '0.75rem' }}>
        <label htmlFor="ei-funds-filter">Show</label>
        <select
          id="ei-funds-filter"
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
        >
          <option value="">All fund accounts</option>
          {fundAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_name}
            </option>
          ))}
        </select>
      </div>

      <section className="ei-accounts-section" style={{ marginTop: '1rem' }}>
        <div className="ei-accounts-section-head">
          <h4>Recent transactions</h4>
          <span className="ei-accounts-total">{visible.length}</span>
        </div>
        {visible.length ? (
          <ul className="ei-accounts-list">
            {visible.map((row) => {
              const amt = Number(row.amount) || 0;
              return (
                <li key={row.id}>
                  <div className="ei-accounts-row-main">
                    <strong>{fundsCategoryLabel(row.category)}</strong>
                    <span className="ei-accounts-row-sub">
                      {accountNameById[row.account_id] || 'Account'}
                      {row.txn_date
                        ? ` · ${formatEstateDisplayDate(row.txn_date) || row.txn_date}`
                        : ''}
                    </span>
                    {row.memo ? <span className="ei-accounts-row-sub">{row.memo}</span> : null}
                  </div>
                  <div className="ei-accounts-row-side">
                    <span
                      className={`ei-accounts-amount${amt < 0 ? ' ei-finance-net-neg-text' : ''}`}
                    >
                      {amt > 0 ? '+' : ''}
                      {formatMoney(amt)}
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-danger"
                        disabled={busy}
                        onClick={() => remove(row)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ei-settings-hint">No funds transactions yet.</p>
        )}
      </section>
    </>
  );
};

export default LedgerFundsTransactionsPanel;
