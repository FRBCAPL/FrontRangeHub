import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { useEstateCase } from './EstateCaseContext';

function ModalShell({ title, onClose, children, foot }) {
  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal"
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3>{title}</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">{children}</div>
        <div className="ei-modal-foot ei-btn-row">
          {foot || (
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanceLoansEditor({ open, initialValue = 0, onClose, onSaved }) {
  const { caseNumber } = useEstateCase();
  const [value, setValue] = useState(String(initialValue ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue(String(initialValue ?? 0));
    setError('');
  }, [open, initialValue]);

  if (!open) return null;

  const save = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.saveSettings({
      caseNumber,
      prLoansTotal: Number(value) || 0
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save PR loans.');
      return;
    }
    onSaved?.(result.data);
    onClose?.();
  };

  return (
    <ModalShell
      title="PR capital loans"
      onClose={onClose}
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ei-btn" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save loans'}
          </button>
        </>
      }
    >
      <p className="ei-settings-hint">
        Cash you loaned the estate (lot rent, etc.). Reimbursement priority #1.
      </p>
      <div className="ei-field">
        <label htmlFor="ei-card-loans">Total PR capital loans ($)</label>
        <input
          id="ei-card-loans"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>
      {error ? <div className="ei-error">{error}</div> : null}
    </ModalShell>
  );
}

export function FinanceOtherCashEditor({ open, initialValue = 0, onClose, onSaved }) {
  const { caseNumber } = useEstateCase();
  const [value, setValue] = useState(String(initialValue ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue(String(initialValue ?? 0));
    setError('');
  }, [open, initialValue]);

  if (!open) return null;

  const save = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.saveSettings({
      caseNumber,
      estateCashOnHand: Number(value) || 0
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save other cash.');
      return;
    }
    onSaved?.(result.data);
    onClose?.();
  };

  return (
    <ModalShell
      title="Other / starting estate cash"
      onClose={onClose}
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ei-btn" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p className="ei-settings-hint">
        Non-auction money in the estate account. Paid auction sales are added on top automatically for
        Bank / Cash on Hand.
      </p>
      <div className="ei-field">
        <label htmlFor="ei-card-other-cash">Other / starting cash ($)</label>
        <input
          id="ei-card-other-cash"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>
      {error ? <div className="ei-error">{error}</div> : null}
    </ModalShell>
  );
}

export function FinanceExpensesEditor({ open, onClose, onChanged }) {
  const { caseNumber } = useEstateCase();
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = async () => {
    const result = await estateInventoryService.listEstateExpenses(caseNumber);
    if (result.success) setExpenses(result.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setReceiptUrl('');
    setError('');
    setInfo('');
    load();
  }, [open]);

  if (!open) return null;

  const addExpense = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addEstateExpense({
      expenseName,
      amount: expenseAmount,
      datePaid: expenseDate ? new Date(`${expenseDate}T12:00:00`).toISOString() : undefined,
      receiptUrl,
      caseNumber
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not add expense.');
      return;
    }
    setExpenseName('');
    setExpenseAmount('');
    setReceiptUrl('');
    setInfo('Expense logged.');
    await load();
    onChanged?.();
  };

  const removeExpense = async (id, name) => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.deleteEstateExpense(id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || `Could not remove ${name}.`);
      return;
    }
    setInfo(`Removed ${name}.`);
    await load();
    onChanged?.();
  };

  return (
    <ModalShell title="Approved expenses" onClose={onClose}>
      <div className="ei-finance-expense-form">
        <div className="ei-field">
          <label htmlFor="ei-card-exp-name">Expense name</label>
          <input
            id="ei-card-exp-name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="e.g. Locksmith rekey"
          />
        </div>
        <div className="ei-field">
          <label htmlFor="ei-card-exp-amt">Amount ($)</label>
          <input
            id="ei-card-exp-amt"
            type="number"
            min="0"
            step="0.01"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />
        </div>
        <div className="ei-field">
          <label htmlFor="ei-card-exp-date">Date paid</label>
          <input
            id="ei-card-exp-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>
        <div className="ei-field">
          <label htmlFor="ei-card-exp-receipt">Receipt URL (optional)</label>
          <input
            id="ei-card-exp-receipt"
            type="url"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <button type="button" className="ei-btn ei-btn-small" onClick={addExpense} disabled={busy}>
          Add expense
        </button>
      </div>

      {expenses.length ? (
        <ul className="ei-finance-expense-list" aria-label="Logged expenses">
          {expenses.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.expense_name}</strong>
                <span className="ei-card-meta">
                  {formatMoney(row.amount)}
                  {row.date_paid ? ` · ${new Date(row.date_paid).toLocaleDateString()}` : ''}
                </span>
                {row.receipt_url ? (
                  <a href={row.receipt_url} target="_blank" rel="noreferrer">
                    Receipt
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => removeExpense(row.id, row.expense_name)}
                disabled={busy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ei-settings-hint">No expenses logged yet.</p>
      )}

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
    </ModalShell>
  );
}

export function FinanceBidsViewer({ open, mode, onClose }) {
  const { caseNumber } = useEstateCase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await estateInventoryService.listFinanceAuctionItems(caseNumber);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Could not load items.');
        setItems([]);
        return;
      }
      setItems(mode === 'paid' ? result.data.paid : result.data.outstanding);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, caseNumber]);

  if (!open) return null;

  const title = mode === 'paid' ? 'Amount paid (items)' : 'Outstanding bids';
  const empty =
    mode === 'paid'
      ? 'No auction sales marked paid yet. Mark paid in Edit asset profile.'
      : 'No outstanding bids right now.';

  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="ei-settings-hint">
        {mode === 'paid'
          ? 'These winning bids are deposited and count toward bank / net.'
          : 'Leading or winning bids not yet marked paid — they do not count toward net or bank.'}
      </p>
      {loading ? <p className="ei-status">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {!loading && !items.length ? <p className="ei-settings-hint">{empty}</p> : null}
      {!loading && items.length ? (
        <ul className="ei-finance-expense-list">
          {items.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <span className="ei-card-meta">{formatMoney(row.highest_bid)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </ModalShell>
  );
}

export function FinanceNetInfo({ open, summary, onClose }) {
  if (!open) return null;
  return (
    <ModalShell title="Net cash remaining" onClose={onClose}>
      <p className="ei-settings-hint">
        Net = Amount paid (items) − Approved expenses. Outstanding bids are not included.
      </p>
      <dl className="ei-finance-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="ei-finance-row">
          <dt>Amount paid</dt>
          <dd>
            <span className="ei-finance-amount">{formatMoney(summary?.paidAuctionSales)}</span>
          </dd>
        </div>
        <div className="ei-finance-row">
          <dt>Expenses</dt>
          <dd>
            <span className="ei-finance-amount">{formatMoney(summary?.expensesTotal)}</span>
          </dd>
        </div>
        <div
          className={`ei-finance-row ei-finance-net${
            summary?.netCashRemaining < 0 ? ' ei-finance-net-neg' : ''
          }`}
        >
          <dt>Net</dt>
          <dd>
            <span className="ei-finance-amount ei-finance-amount-lg">
              {formatMoney(summary?.netCashRemaining)}
            </span>
          </dd>
        </div>
      </dl>
    </ModalShell>
  );
}

export function FinanceBankInfo({ open, summary, onClose, onEditOtherCash }) {
  if (!open) return null;
  return (
    <ModalShell
      title="Estate bank / cash on hand"
      onClose={onClose}
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="ei-btn"
            onClick={() => {
              onClose?.();
              onEditOtherCash?.();
            }}
          >
            Edit other / starting cash
          </button>
        </>
      }
    >
      <p className="ei-settings-hint">
        Bank = paid auction deposits + other/starting cash. Mark sales paid on each item to increase
        the paid portion.
      </p>
      <dl className="ei-finance-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="ei-finance-row">
          <dt>Paid auction deposits</dt>
          <dd>
            <span className="ei-finance-amount">{formatMoney(summary?.paidAuctionSales)}</span>
          </dd>
        </div>
        <div className="ei-finance-row">
          <dt>Other / starting cash</dt>
          <dd>
            <span className="ei-finance-amount">{formatMoney(summary?.otherCashOnHand)}</span>
          </dd>
        </div>
        <div className="ei-finance-row ei-finance-bank">
          <dt>Bank total</dt>
          <dd>
            <span className="ei-finance-amount ei-finance-amount-lg">
              {formatMoney(summary?.estateCashOnHand)}
            </span>
          </dd>
        </div>
      </dl>
    </ModalShell>
  );
}
