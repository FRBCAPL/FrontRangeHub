import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney, sumPrLoans } from '@shared/utils/estateFinance.js';

const today = () => new Date().toISOString().slice(0, 10);

/** Itemized advances the executor made personally. The total is derived, never typed. */
const LedgerPrLoansPanel = ({ rows = [], caseNumber, readOnly, onChanged }) => {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loanDate, setLoanDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const resetForm = () => {
    setAmount('');
    setPurpose('');
    setLoanDate(today());
    setNotes('');
    setEditingId(null);
  };

  const saveLoan = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    const input = {
      amount,
      purpose,
      loanDate,
      notes,
      caseNumber
    };
    const result = editingId
      ? await estateInventoryService.updateEstatePrLoan(editingId, input)
      : await estateInventoryService.addEstatePrLoan(input);
    if (!result.success) {
      setBusy(false);
      setError(result.error || 'Could not save the loan.');
      return;
    }
    const wasEditing = Boolean(editingId);
    resetForm();
    try {
      await onChanged?.();
      setInfo(wasEditing ? 'Loan changes saved.' : 'Loan recorded.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (loan) => {
    setAmount(loan.amount == null ? '' : String(loan.amount));
    setPurpose(loan.purpose || '');
    setLoanDate(loan.loan_date || today());
    setNotes(loan.notes || '');
    setEditingId(loan.id);
    setError('');
    setInfo('');
  };

  const removeLoan = async (loan) => {
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.deleteEstatePrLoan(loan.id, caseNumber);
    if (!result.success) {
      setBusy(false);
      setError(result.error || 'Could not remove the loan.');
      return;
    }
    if (editingId === loan.id) resetForm();
    try {
      await onChanged?.();
      setInfo(`Removed ${loan.purpose}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="ei-settings-hint">
        Record each time you personally advance money to the estate. Reimbursed to you before
        anything is distributed to heirs.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly ? (
        <form className="ei-pr-loan-form" onSubmit={saveLoan}>
          <div className="ei-field">
            <label htmlFor="ei-pr-loan-amount">Amount loaned ($)</label>
            <input
              id="ei-pr-loan-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              required
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-loan-date">Date</label>
            <input
              id="ei-pr-loan-date"
              type="date"
              value={loanDate}
              onChange={(ev) => setLoanDate(ev.target.value)}
              required
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-pr-loan-purpose">What was the money for?</label>
            <input
              id="ei-pr-loan-purpose"
              value={purpose}
              onChange={(ev) => setPurpose(ev.target.value)}
              placeholder="e.g. Locksmith invoice or property tax"
              required
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-pr-loan-notes">Notes (optional)</label>
            <input
              id="ei-pr-loan-notes"
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="e.g. Paid personally by check 1042"
            />
          </div>
          <button
            type="submit"
            className="ei-btn ei-btn-small ei-field-wide"
            disabled={busy || !amount || !purpose.trim()}
          >
            {busy ? 'Saving…' : editingId ? 'Save loan changes' : 'Add loan'}
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
          <h4>Loan history</h4>
          <span className="ei-accounts-total">{formatMoney(sumPrLoans(rows))}</span>
        </div>
        {rows.length ? (
          <ul className="ei-pr-loan-list">
            {rows.map((loan) => (
              <li key={loan.id}>
                <div>
                  <strong>{loan.purpose}</strong>
                  <span>
                    {loan.loan_date || 'Date not recorded'}
                    {loan.notes ? ` · ${loan.notes}` : ''}
                  </span>
                </div>
                <div className="ei-pr-loan-row-side">
                  <strong>{formatMoney(loan.amount)}</strong>
                  {!readOnly ? (
                    <span className="ei-btn-row">
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-secondary"
                        onClick={() => startEdit(loan)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-danger"
                        onClick={() => removeLoan(loan)}
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
          <p className="ei-settings-hint">No PR loans recorded yet.</p>
        )}
      </section>
    </>
  );
};

export default LedgerPrLoansPanel;
