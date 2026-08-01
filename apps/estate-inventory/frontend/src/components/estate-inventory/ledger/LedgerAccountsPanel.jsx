import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  formatMoney,
  sumAccountDebts
} from '@shared/utils/estateFinance.js';
import { sumFundsAvailable } from '@shared/utils/estateFunds.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';
import LedgerAccountDocuments from './LedgerAccountDocuments.jsx';

const BLANK = {
  kind: 'asset',
  accountName: '',
  institution: '',
  last4: '',
  balance: '',
  asOfDate: new Date().toISOString().slice(0, 10),
  notes: '',
  isPrimary: false
};

function accountLine(row) {
  return [row.institution, row.last4 ? `••••${row.last4}` : ''].filter(Boolean).join(' · ');
}

function displayBalance(row) {
  if (row.kind === 'debt') return Number(row.balance) || 0;
  return Number(row.computed_balance != null ? row.computed_balance : row.balance) || 0;
}

function AccountList({
  rows,
  title,
  emptyText,
  total,
  onEdit,
  onRemove,
  onStatements,
  readOnly,
  busy,
  fundsMode
}) {
  return (
    <section className="ei-accounts-section">
      <div className="ei-accounts-section-head">
        <h4>{title}</h4>
        <span className="ei-accounts-total">{formatMoney(total)}</span>
      </div>
      {rows.length ? (
        <ul className="ei-accounts-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="ei-accounts-row-main">
                <strong>
                  {row.account_name}
                  {row.is_primary && row.kind !== 'debt' ? ' · Primary' : ''}
                </strong>
                {accountLine(row) ? (
                  <span className="ei-accounts-row-sub">{accountLine(row)}</span>
                ) : null}
                {fundsMode && row.kind !== 'debt' ? (
                  <span className="ei-accounts-row-sub">
                    Opening {formatMoney(row.opening_balance ?? row.balance)} · balance from
                    transactions
                  </span>
                ) : null}
                {row.as_of_date ? (
                  <span className="ei-accounts-row-sub">
                    As of {formatEstateDisplayDate(row.as_of_date) || row.as_of_date}
                  </span>
                ) : null}
                {row.notes ? <span className="ei-accounts-row-sub">{row.notes}</span> : null}
              </div>
              <div className="ei-accounts-row-side">
                <span className="ei-accounts-amount">{formatMoney(displayBalance(row))}</span>
                <span className="ei-btn-row">
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-secondary"
                    onClick={() => onStatements(row)}
                    disabled={busy}
                  >
                    Statements
                  </button>
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-secondary"
                        onClick={() => onEdit(row)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-danger"
                        onClick={() => onRemove(row)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ei-settings-hint">{emptyText}</p>
      )}
    </section>
  );
}

/** Fund accounts (computed balance) and debts (amount owed). */
const LedgerAccountsPanel = ({ rows = [], caseNumber, readOnly, onChanged }) => {
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [documentAccount, setDocumentAccount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const set = (key) => (ev) => {
    const value = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(BLANK);
    setEditingId(null);
  };

  const editingRow = editingId ? rows.find((r) => r.id === editingId) : null;
  const isDebt = form.kind === 'debt';
  const editingFund = Boolean(editingRow && editingRow.kind !== 'debt');

  const save = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const payload = {
      ...form,
      caseNumber,
      // Fund edits never send a new current balance
      balance: editingFund ? editingRow?.opening_balance ?? form.balance : form.balance
    };
    const result = editingId
      ? await estateInventoryService.updateEstateAccount(editingId, payload, caseNumber)
      : await estateInventoryService.addEstateAccount(payload, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save.');
      return;
    }
    setInfo(
      editingId
        ? 'Saved.'
        : isDebt
          ? 'Debt added.'
          : 'Fund account added. Current balance starts at the opening amount; later changes come from transactions.'
    );
    resetForm();
    onChanged?.();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setInfo('');
    setError('');
    setForm({
      kind: row.kind === 'debt' ? 'debt' : 'asset',
      accountName: row.account_name || '',
      institution: row.institution || '',
      last4: row.last4 || '',
      balance:
        row.kind === 'debt'
          ? row.balance == null
            ? ''
            : String(row.balance)
          : row.opening_balance == null
            ? String(row.balance ?? '')
            : String(row.opening_balance),
      asOfDate: row.as_of_date || '',
      notes: row.notes || '',
      isPrimary: Boolean(row.is_primary)
    });
  };

  const remove = async (row) => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.deleteEstateAccount(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not remove.');
      return;
    }
    if (editingId === row.id) resetForm();
    setInfo(`Removed ${row.account_name}.`);
    onChanged?.();
  };

  const assets = rows.filter((r) => r.kind !== 'debt');
  const debts = rows.filter((r) => r.kind === 'debt');

  return (
    <>
      <p className="ei-settings-hint">
        List the bank accounts that hold estate cash. Enter the <strong>opening balance</strong>{' '}
        from the statement once. After that, pay bills and record deposits — the balance updates
        itself. Property estimates do not change this number.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {documentAccount ? (
        <LedgerAccountDocuments
          account={documentAccount}
          caseNumber={caseNumber}
          readOnly={readOnly}
          onClose={() => setDocumentAccount(null)}
          onChanged={onChanged}
        />
      ) : null}

      {!readOnly ? (
        <div className="ei-finance-expense-form ei-accounts-form">
          {!editingId ? (
            <div className="ei-field ei-field-wide">
              <label htmlFor="ei-acct-kind">Type</label>
              <select id="ei-acct-kind" value={form.kind} onChange={set('kind')}>
                <option value="asset">Fund account (estate money)</option>
                <option value="debt">Debt the estate owes</option>
              </select>
            </div>
          ) : null}
          <div className="ei-field">
            <label htmlFor="ei-acct-name">{isDebt ? 'What is owed' : 'Account name'}</label>
            <input
              id="ei-acct-name"
              value={form.accountName}
              onChange={set('accountName')}
              placeholder={isDebt ? 'e.g. Visa credit card' : 'e.g. Estate checking'}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-inst">{isDebt ? 'Creditor' : 'Bank or firm'}</label>
            <input
              id="ei-acct-inst"
              value={form.institution}
              onChange={set('institution')}
              placeholder={isDebt ? 'e.g. Chase' : 'e.g. Wells Fargo'}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-last4">Last 4 digits (optional)</label>
            <input
              id="ei-acct-last4"
              inputMode="numeric"
              maxLength={4}
              value={form.last4}
              onChange={set('last4')}
              placeholder="1234"
            />
          </div>
          {isDebt || !editingFund ? (
            <div className="ei-field">
              <label htmlFor="ei-acct-balance">
                {isDebt ? 'Amount owed ($)' : 'Opening balance ($)'}
              </label>
              <input
                id="ei-acct-balance"
                type="number"
                min="0"
                step="0.01"
                value={form.balance}
                onChange={set('balance')}
              />
            </div>
          ) : (
            <div className="ei-field ei-field-wide">
              <p className="ei-settings-hint" style={{ margin: 0 }}>
                Current balance is calculated from opening balance plus transactions. To correct a
                mistake, record an Adjustment under Transactions — do not edit the balance here.
                Opening: {formatMoney(editingRow?.opening_balance ?? 0)} · Current:{' '}
                {formatMoney(displayBalance(editingRow))}
              </p>
            </div>
          )}
          {!isDebt && !editingId ? (
            <div className="ei-field ei-field-wide">
              <label className="ei-check-label">
                <input type="checkbox" checked={form.isPrimary} onChange={set('isPrimary')} />
                Primary fund account (default for expenses and deposits)
              </label>
            </div>
          ) : null}
          <div className="ei-field">
            <label htmlFor="ei-acct-date">{isDebt ? 'As of' : 'Opening as of'}</label>
            <input
              id="ei-acct-date"
              type="date"
              value={form.asOfDate}
              onChange={set('asOfDate')}
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-acct-notes">Notes (optional)</label>
            <input
              id="ei-acct-notes"
              value={form.notes}
              onChange={set('notes')}
              placeholder="e.g. Statement mailed to the house"
            />
          </div>
          <div className="ei-btn-row ei-field-wide">
            <button type="button" className="ei-btn ei-btn-small" onClick={save} disabled={busy}>
              {editingId ? 'Save changes' : isDebt ? 'Add debt' : 'Add fund account'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ei-btn ei-btn-small ei-btn-secondary"
                onClick={resetForm}
                disabled={busy}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="ei-settings-hint">This estate is closed for records, so this is view-only.</p>
      )}

      <AccountList
        rows={assets}
        title="Estate Funds accounts"
        emptyText="No fund accounts listed yet."
        total={sumFundsAvailable(rows)}
        onEdit={startEdit}
        onRemove={remove}
        onStatements={setDocumentAccount}
        readOnly={readOnly}
        busy={busy}
        fundsMode
      />
      <AccountList
        rows={debts}
        title="Debts the estate owes"
        emptyText="No debts listed yet."
        total={sumAccountDebts(rows)}
        onEdit={startEdit}
        onRemove={remove}
        onStatements={setDocumentAccount}
        readOnly={readOnly}
        busy={busy}
        fundsMode={false}
      />
    </>
  );
};

export default LedgerAccountsPanel;
