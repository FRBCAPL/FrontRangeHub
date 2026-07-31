import React, { useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney, sumExpenses } from '@shared/utils/estateFinance.js';

const today = () => new Date().toISOString().slice(0, 10);

function looksLikeImage(url) {
  if (!url) return false;
  return /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(url) || /estate-inventory-photos/i.test(url);
}

/** Money the estate has actually paid out, with a photo of the receipt when available. */
const LedgerExpensesPanel = ({ rows = [], caseNumber, readOnly, onChanged }) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [clearReceipt, setClearReceipt] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!receiptFile) {
      if (!editingId || clearReceipt) setReceiptPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile, editingId, clearReceipt]);

  const resetForm = () => {
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDate(today());
    setReceiptUrl('');
    setReceiptFile(null);
    setReceiptPreview('');
    setClearReceipt(false);
    setEditingId(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setError('Choose a photo of the receipt (JPG, PNG, etc.).');
      return;
    }
    setError('');
    setClearReceipt(false);
    setReceiptFile(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
    setReceiptUrl('');
    setClearReceipt(true);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const saveExpense = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    const input = {
      expenseName,
      amount: expenseAmount,
      datePaid: expenseDate ? new Date(`${expenseDate}T12:00:00`).toISOString() : undefined,
      receiptUrl: receiptFile ? undefined : receiptUrl,
      receiptFile: receiptFile || undefined,
      clearReceipt: clearReceipt && !receiptFile,
      caseNumber
    };
    const result = editingId
      ? await estateInventoryService.updateEstateExpense(editingId, input)
      : await estateInventoryService.addEstateExpense(input);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save the expense.');
      return;
    }
    setInfo(
      result.warning
        ? result.warning
        : editingId
          ? 'Expense changes saved. If you paid this from an estate account, update that account balance so the estate balance stays accurate.'
          : 'Expense logged. If you paid this from an estate account, update that account balance so the estate balance stays accurate.'
    );
    resetForm();
    onChanged?.();
  };

  const startEdit = (row) => {
    setExpenseName(row.expense_name || '');
    setExpenseAmount(row.amount == null ? '' : String(row.amount));
    setExpenseDate(row.date_paid ? new Date(row.date_paid).toISOString().slice(0, 10) : today());
    setReceiptUrl(row.receipt_url || '');
    setReceiptFile(null);
    setReceiptPreview(row.receipt_url && looksLikeImage(row.receipt_url) ? row.receipt_url : '');
    setClearReceipt(false);
    setEditingId(row.id);
    setError('');
    setInfo('');
  };

  const removeExpense = async (row) => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.deleteEstateExpense(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || `Could not remove ${row.expense_name}.`);
      return;
    }
    if (editingId === row.id) resetForm();
    setInfo(`Removed ${row.expense_name}.`);
    onChanged?.();
  };

  return (
    <>
      <p className="ei-settings-hint">
        Costs the estate has paid — cleaning, storage, filing fees, repairs. Snap a photo of the
        receipt whenever you can; the court pack includes the link.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly ? (
        <form className="ei-finance-expense-form" onSubmit={saveExpense}>
          <div className="ei-field">
            <label htmlFor="ei-card-exp-name">Expense name</label>
            <input
              id="ei-card-exp-name"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="e.g. Locksmith rekey"
              required
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
              required
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

          <div className="ei-field ei-field-wide ei-expense-receipt">
            <span className="ei-expense-receipt-label">Receipt photo (optional)</span>
            {receiptPreview ? (
              <div className="ei-photo-grid-mini">
                <img className="ei-photo-preview" src={receiptPreview} alt="Receipt preview" />
              </div>
            ) : null}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="ei-file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(ev) => pickFile(ev.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="ei-file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(ev) => pickFile(ev.target.files?.[0])}
            />
            <div className="ei-photo-actions">
              <button
                type="button"
                className="ei-btn ei-btn-camera ei-btn-small"
                onClick={() => cameraInputRef.current?.click()}
                disabled={busy}
              >
                Take a picture
              </button>
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => galleryInputRef.current?.click()}
                disabled={busy}
              >
                Gallery
              </button>
              {receiptPreview || receiptUrl ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  onClick={removeReceipt}
                  disabled={busy}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-card-exp-receipt">Or paste a receipt link</label>
            <input
              id="ei-card-exp-receipt"
              type="url"
              value={receiptFile ? '' : receiptUrl}
              onChange={(e) => {
                setClearReceipt(false);
                setReceiptUrl(e.target.value);
              }}
              placeholder="https://…"
              disabled={Boolean(receiptFile)}
            />
          </div>

          <button
            type="submit"
            className="ei-btn ei-btn-small ei-field-wide"
            disabled={busy || !expenseName.trim() || !expenseAmount}
          >
            {busy ? 'Saving…' : editingId ? 'Save expense changes' : 'Add expense'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="ei-btn ei-btn-small ei-btn-secondary ei-field-wide"
              onClick={resetForm}
              disabled={busy}
            >
              Cancel edit
            </button>
          ) : null}
        </form>
      ) : (
        <p className="ei-settings-hint">This estate is closed for records, so this is view-only.</p>
      )}

      <section className="ei-pr-loan-ledger">
        <div className="ei-accounts-section-head">
          <h4>Expense history</h4>
          <span className="ei-accounts-total">{formatMoney(sumExpenses(rows))}</span>
        </div>
        {rows.length ? (
          <ul className="ei-pr-loan-list" aria-label="Logged expenses">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="ei-expense-row-main">
                  {looksLikeImage(row.receipt_url) ? (
                    <a
                      className="ei-expense-thumb"
                      href={row.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open receipt photo"
                    >
                      <img src={row.receipt_url} alt="" />
                    </a>
                  ) : null}
                  <div>
                    <strong>{row.expense_name}</strong>
                    <span>
                      {row.date_paid
                        ? new Date(row.date_paid).toLocaleDateString()
                        : 'Date not recorded'}
                      {row.receipt_url ? ' · ' : ''}
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer">
                          {looksLikeImage(row.receipt_url) ? 'Receipt photo' : 'Receipt'}
                        </a>
                      ) : null}
                    </span>
                  </div>
                </div>
                <div className="ei-pr-loan-row-side">
                  <strong>{formatMoney(row.amount)}</strong>
                  {!readOnly ? (
                    <span className="ei-btn-row">
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-secondary"
                        onClick={() => startEdit(row)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-danger"
                        onClick={() => removeExpense(row)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ei-settings-hint">No expenses logged yet.</p>
        )}
      </section>
    </>
  );
};

export default LedgerExpensesPanel;
