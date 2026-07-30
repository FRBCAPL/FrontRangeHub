import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  formatMoney,
  sumAccountAssets,
  sumAccountDebts
} from '@shared/utils/estateFinance.js';
import { ModalShell } from './EstateFinanceCardEditors.jsx';
import { useEstateCase } from './EstateCaseContext';

const BLANK = {
  kind: 'asset',
  accountName: '',
  institution: '',
  last4: '',
  balance: '',
  asOfDate: new Date().toISOString().slice(0, 10),
  notes: ''
};

function accountLine(row) {
  const parts = [row.institution, row.last4 ? `••••${row.last4}` : ''].filter(Boolean);
  return parts.join(' · ');
}

function AccountList({ rows, title, emptyText, total, onEdit, onRemove, readOnly, busy }) {
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
                <strong>{row.account_name}</strong>
                {accountLine(row) ? (
                  <span className="ei-accounts-row-sub">{accountLine(row)}</span>
                ) : null}
                {row.as_of_date ? (
                  <span className="ei-accounts-row-sub">As of {row.as_of_date}</span>
                ) : null}
                {row.notes ? <span className="ei-accounts-row-sub">{row.notes}</span> : null}
              </div>
              <div className="ei-accounts-row-side">
                <span className="ei-accounts-amount">{formatMoney(row.balance)}</span>
                {!readOnly ? (
                  <span className="ei-btn-row">
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
                  </span>
                ) : null}
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

/**
 * Ledger of the decedent's bank / investment accounts and the debts the estate
 * owes. Together with cash and unsold bids this is what produces a net
 * distributable figure — the number a court and the heirs actually ask for.
 */
const EstateAccountsModal = ({ open, onClose, onChanged, readOnly = false }) => {
  const { caseNumber } = useEstateCase();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    const result = await estateInventoryService.listEstateAccounts(caseNumber);
    if (!result.success) {
      setError(result.error || 'Could not load accounts.');
      setRows([]);
      return;
    }
    setError('');
    setRows(result.data || []);
  }, [caseNumber]);

  useEffect(() => {
    if (!open) return;
    setForm(BLANK);
    setEditingId(null);
    setError('');
    setInfo('');
    load();
  }, [open, load]);

  if (!open) return null;

  const set = (key) => (ev) => setForm((prev) => ({ ...prev, [key]: ev.target.value }));

  const resetForm = () => {
    setForm(BLANK);
    setEditingId(null);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const payload = { ...form, caseNumber };
    const result = editingId
      ? await estateInventoryService.updateEstateAccount(editingId, payload, caseNumber)
      : await estateInventoryService.addEstateAccount(payload, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save.');
      return;
    }
    setInfo(editingId ? 'Saved.' : 'Added.');
    resetForm();
    await load();
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
      balance: row.balance == null ? '' : String(row.balance),
      asOfDate: row.as_of_date || '',
      notes: row.notes || ''
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
    await load();
    onChanged?.();
  };

  const assets = rows.filter((r) => r.kind !== 'debt');
  const debts = rows.filter((r) => r.kind === 'debt');
  const assetsTotal = sumAccountAssets(rows);
  const debtsTotal = sumAccountDebts(rows);
  const isDebt = form.kind === 'debt';

  return (
    <ModalShell title="Accounts & debts" onClose={onClose}>
      <p className="ei-settings-hint">
        List each of the decedent&apos;s bank or investment accounts and each debt the estate
        owes. Balances here are a record for the court — the app never connects to a bank.
        Heirs and helpers cannot see this page.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly ? (
        <div className="ei-finance-expense-form">
          <div className="ei-field">
            <label htmlFor="ei-acct-kind">Type</label>
            <select id="ei-acct-kind" value={form.kind} onChange={set('kind')}>
              <option value="asset">Account the estate holds</option>
              <option value="debt">Debt the estate owes</option>
            </select>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-name">{isDebt ? 'What is owed' : 'Account name'}</label>
            <input
              id="ei-acct-name"
              value={form.accountName}
              onChange={set('accountName')}
              placeholder={isDebt ? 'e.g. Visa credit card' : 'e.g. Savings'}
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
          <div className="ei-field">
            <label htmlFor="ei-acct-balance">
              {isDebt ? 'Amount owed ($)' : 'Balance ($)'}
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
          <div className="ei-field">
            <label htmlFor="ei-acct-date">Balance as of</label>
            <input
              id="ei-acct-date"
              type="date"
              value={form.asOfDate}
              onChange={set('asOfDate')}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-notes">Notes (optional)</label>
            <input
              id="ei-acct-notes"
              value={form.notes}
              onChange={set('notes')}
              placeholder="e.g. Statement mailed to the house"
            />
          </div>
          <div className="ei-btn-row">
            <button type="button" className="ei-btn ei-btn-small" onClick={save} disabled={busy}>
              {editingId ? 'Save changes' : isDebt ? 'Add debt' : 'Add account'}
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
        <p className="ei-settings-hint">
          This estate is closed for records, so accounts and debts are view-only.
        </p>
      )}

      <AccountList
        rows={assets}
        title="Accounts the estate holds"
        emptyText="No accounts listed yet."
        total={assetsTotal}
        onEdit={startEdit}
        onRemove={remove}
        readOnly={readOnly}
        busy={busy}
      />
      <AccountList
        rows={debts}
        title="Debts the estate owes"
        emptyText="No debts listed yet."
        total={debtsTotal}
        onEdit={startEdit}
        onRemove={remove}
        readOnly={readOnly}
        busy={busy}
      />

      <div className="ei-accounts-net">
        <span>Accounts minus debts</span>
        <strong className={assetsTotal - debtsTotal < 0 ? 'ei-finance-net-neg-text' : ''}>
          {formatMoney(assetsTotal - debtsTotal)}
        </strong>
      </div>
    </ModalShell>
  );
};

export default EstateAccountsModal;
