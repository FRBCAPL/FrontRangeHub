import React, { useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  formatMoney,
  sumAccountDebts
} from '@shared/utils/estateFinance.js';
import { sumFundsAvailable, sumTrackedNonFundAssets } from '@shared/utils/estateFunds.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';
import {
  ASSET_ACCOUNT_TYPES,
  DEBT_ACCOUNT_TYPES,
  accountTypeLabel,
  accountCountsAsFunds,
  countsAsFundsDefaultForType
} from '@shared/utils/estateAccountTypes.js';
import LedgerAccountDocuments from './LedgerAccountDocuments.jsx';
import LedgerDebtPayPanel from './LedgerDebtPayPanel.jsx';
import GlossaryTerm from '../GlossaryTerm.jsx';

const BLANK = {
  kind: 'asset',
  accountType: 'checking',
  accountName: '',
  institution: '',
  last4: '',
  balance: '',
  asOfDate: new Date().toISOString().slice(0, 10),
  notes: '',
  isPrimary: false,
  countsAsFunds: true
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
  onPay,
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
                  {row.is_primary && accountCountsAsFunds(row) ? ' · Primary' : ''}
                </strong>
                <span className="ei-accounts-row-sub">
                  {accountTypeLabel(row.account_type, row.kind)}
                  {!fundsMode && row.kind !== 'debt' && !accountCountsAsFunds(row)
                    ? ' · Not in Cash on hand'
                    : ''}
                  {fundsMode && row.kind !== 'debt' ? ' · Estate Funds' : ''}
                </span>
                {accountLine(row) ? (
                  <span className="ei-accounts-row-sub">{accountLine(row)}</span>
                ) : null}
                {fundsMode && row.kind !== 'debt' ? (
                  <span className="ei-accounts-row-sub">
                    Starting {formatMoney(row.opening_balance ?? row.balance)} · balance from
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
                  {!readOnly && onPay && row.kind === 'debt' ? (
                    <button
                      type="button"
                      className="ei-btn ei-btn-small"
                      onClick={() => onPay(row)}
                      disabled={busy}
                    >
                      Pay
                    </button>
                  ) : null}
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

/** Fund accounts, other recorded assets, and debts. */
const LedgerAccountsPanel = ({ rows = [], caseNumber, readOnly, onChanged }) => {
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [documentAccount, setDocumentAccount] = useState(null);
  const [payingDebt, setPayingDebt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const composeRef = useRef(null);
  const documentsRef = useRef(null);
  const payRef = useRef(null);

  const scrollTo = (ref) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const set = (key) => (ev) => {
    const value = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'kind') {
        if (value === 'debt') {
          next.accountType = 'other_debt';
          next.countsAsFunds = false;
          next.isPrimary = false;
        } else {
          next.accountType = 'checking';
          next.countsAsFunds = true;
        }
      }
      if (key === 'accountType' && prev.kind !== 'debt') {
        next.countsAsFunds = countsAsFundsDefaultForType(value, 'asset');
        if (!next.countsAsFunds) next.isPrimary = false;
      }
      if (key === 'countsAsFunds' && !value) {
        next.isPrimary = false;
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(BLANK);
    setEditingId(null);
  };

  const editingRow = editingId ? rows.find((r) => r.id === editingId) : null;
  const isDebt = form.kind === 'debt';
  const editingFund = Boolean(editingRow && editingRow.kind !== 'debt');
  const typeOptions = isDebt ? DEBT_ACCOUNT_TYPES : ASSET_ACCOUNT_TYPES;

  const save = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const payload = {
      ...form,
      caseNumber,
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
          : form.countsAsFunds
            ? 'Fund account added. Current balance starts at the opening amount; later changes come from transactions.'
            : 'Account added and tracked. It is not included in Cash on hand — turn on “Include in Cash on hand” if estate money sits there.'
    );
    resetForm();
    onChanged?.();
  };

  const openStatements = (row) => {
    setPayingDebt(null);
    setDocumentAccount(row);
    scrollTo(documentsRef);
  };

  const startEdit = (row) => {
    setPayingDebt(null);
    setDocumentAccount(null);
    setEditingId(row.id);
    setInfo('');
    setError('');
    const kind = row.kind === 'debt' ? 'debt' : 'asset';
    setForm({
      kind,
      accountType: row.account_type || (kind === 'debt' ? 'other_debt' : 'checking'),
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
      isPrimary: Boolean(row.is_primary),
      countsAsFunds: accountCountsAsFunds(row)
    });
    scrollTo(composeRef);
  };

  const startPay = (row) => {
    setDocumentAccount(null);
    resetForm();
    setPayingDebt(row);
    setError('');
    setInfo('');
    scrollTo(payRef);
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
    if (payingDebt?.id === row.id) setPayingDebt(null);
    setInfo(`Removed ${row.account_name}.`);
    onChanged?.();
  };

  const fundAccounts = rows.filter((r) => r.kind !== 'debt' && accountCountsAsFunds(r));
  const trackedAssets = rows.filter((r) => r.kind !== 'debt' && !accountCountsAsFunds(r));
  const debts = rows.filter((r) => r.kind === 'debt');

  return (
    <>
      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      <div ref={documentsRef}>
        {documentAccount ? (
          <LedgerAccountDocuments
            account={documentAccount}
            caseNumber={caseNumber}
            readOnly={readOnly}
            onClose={() => setDocumentAccount(null)}
            onChanged={onChanged}
          />
        ) : null}
      </div>

      <div ref={payRef}>
        {payingDebt && !readOnly ? (
          <LedgerDebtPayPanel
            debt={payingDebt}
            fundAccounts={fundAccounts}
            caseNumber={caseNumber}
            onClose={(message) => {
              setPayingDebt(null);
              if (message) setInfo(message);
            }}
            onChanged={onChanged}
          />
        ) : null}
      </div>

      {!readOnly ? (
        <section
          ref={composeRef}
          className="ei-ledger-compose"
          aria-labelledby="ei-accounts-compose-title"
        >
          <h4 id="ei-accounts-compose-title" className="ei-ledger-compose-title">
            {editingId ? (isDebt ? 'Edit debt' : 'Edit account') : 'Add account'}
          </h4>
          <p className="ei-settings-hint">
            {editingId
              ? 'Update the fields below, then save.'
              : 'Add spendable bank accounts to Cash on hand; keep retirement, insurance, and debts tracked separately.'}
          </p>
          <div className="ei-finance-expense-form ei-accounts-form">
          {!editingId ? (
            <div className="ei-field ei-field-wide">
              <label htmlFor="ei-acct-kind">Category</label>
              <select id="ei-acct-kind" value={form.kind} onChange={set('kind')}>
                <option value="asset">Asset / account (money or benefit)</option>
                <option value="debt">Debt the estate owes</option>
              </select>
            </div>
          ) : null}
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-acct-type">Account type</label>
            <select id="ei-acct-type" value={form.accountType} onChange={set('accountType')}>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-name">{isDebt ? 'What is owed' : 'Account name'}</label>
            <input
              id="ei-acct-name"
              value={form.accountName}
              onChange={set('accountName')}
              placeholder={
                isDebt
                  ? 'e.g. Visa credit card'
                  : form.accountType === 'social_security'
                    ? 'e.g. SSA survivors benefit'
                    : form.accountType === 'retirement'
                      ? 'e.g. Fidelity IRA'
                      : 'e.g. Estate checking'
              }
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-acct-inst">
              {isDebt ? 'Creditor' : 'Bank, firm, or agency'}
            </label>
            <input
              id="ei-acct-inst"
              value={form.institution}
              onChange={set('institution')}
              placeholder={
                isDebt
                  ? 'e.g. Chase'
                  : form.accountType === 'social_security'
                    ? 'e.g. Social Security Administration'
                    : 'e.g. Wells Fargo'
              }
            />
          </div>
          {isDebt || !editingFund ? (
            <div className="ei-field-wide ei-accounts-last4-balance-row">
              <div className="ei-accounts-last4">
                <label htmlFor="ei-acct-last4">Last 4 digits (optional)</label>
                <input
                  id="ei-acct-last4"
                  inputMode="numeric"
                  maxLength={4}
                  size={4}
                  value={form.last4}
                  onChange={set('last4')}
                  placeholder="1234"
                  autoComplete="off"
                  style={{ width: '5.5rem', maxWidth: '5.5rem', minWidth: '5.5rem' }}
                />
              </div>
              <div className="ei-accounts-balance">
                <label htmlFor="ei-acct-balance">
                  {isDebt
                    ? 'Amount owed ($)'
                    : form.countsAsFunds
                      ? 'Starting balance ($)'
                      : 'Starting value ($)'}
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
              <div className="ei-accounts-asof">
                <label htmlFor="ei-acct-date">{isDebt ? 'As of' : 'Starting as of'}</label>
                <input
                  id="ei-acct-date"
                  type="date"
                  value={form.asOfDate}
                  onChange={set('asOfDate')}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="ei-field-wide ei-accounts-last4-balance-row">
                <div className="ei-accounts-last4">
                  <label htmlFor="ei-acct-last4">Last 4 digits (optional)</label>
                  <input
                    id="ei-acct-last4"
                    inputMode="numeric"
                    maxLength={4}
                    size={4}
                    value={form.last4}
                    onChange={set('last4')}
                    placeholder="1234"
                    autoComplete="off"
                    style={{ width: '5.5rem', maxWidth: '5.5rem', minWidth: '5.5rem' }}
                  />
                </div>
                <div className="ei-accounts-asof">
                  <label htmlFor="ei-acct-date">Starting as of</label>
                  <input
                    id="ei-acct-date"
                    type="date"
                    value={form.asOfDate}
                    onChange={set('asOfDate')}
                  />
                </div>
              </div>
              <div className="ei-field ei-field-wide">
                <p className="ei-settings-hint" style={{ margin: 0 }}>
                  Current balance is calculated from the starting balance plus transactions. To
                  correct a mistake, record an Adjustment under Money in/out — do not edit the
                  balance here. Starting: {formatMoney(editingRow?.opening_balance ?? 0)} ·
                  Current: {formatMoney(displayBalance(editingRow))}
                </p>
              </div>
            </>
          )}
          {!isDebt ? (
            <div className="ei-field ei-field-wide ei-accounts-funds-toggle">
              <label className="ei-check-label">
                <input
                  type="checkbox"
                  checked={form.countsAsFunds}
                  onChange={set('countsAsFunds')}
                />
                Include in Cash on hand / Estate Funds
              </label>
              <p className="ei-settings-hint">
                Turn this on for checking, savings, and other spendable estate money.<br />
                Leave off for retirement, Social Security, life insurance, and similar accounts
                <br /> until that money is actually available to the estate.
              </p>
            </div>
          ) : null}
          {!isDebt && form.countsAsFunds && !editingId ? (
            <div className="ei-field ei-field-wide ei-accounts-funds-toggle">
              <label className="ei-check-label">
                <input type="checkbox" checked={form.isPrimary} onChange={set('isPrimary')} />
                <span>Primary fund account</span>
                <GlossaryTerm termKey="primary_fund_account" iconOnly />
              </label>
            </div>
          ) : null}
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
        </section>
      ) : (
        <p className="ei-settings-hint">This estate is closed for records, so this is view-only.</p>
      )}

      <div className="ei-ledger-history">
      <AccountList
        rows={fundAccounts}
        title="Cash on hand (Estate Funds)"
        emptyText="No fund accounts yet — add checking or savings and include them in Cash on hand."
        total={sumFundsAvailable(rows)}
        onEdit={startEdit}
        onRemove={remove}
        onStatements={openStatements}
        readOnly={readOnly}
        busy={busy}
        fundsMode
      />
      <AccountList
        rows={trackedAssets}
        title="Other recorded accounts"
        emptyText="No retirement, SS, insurance, or other non-cash accounts yet."
        total={sumTrackedNonFundAssets(rows)}
        onEdit={startEdit}
        onRemove={remove}
        onStatements={openStatements}
        readOnly={readOnly}
        busy={busy}
        fundsMode={false}
      />
      <AccountList
        rows={debts}
        title="Debts the estate owes"
        emptyText="No debts listed yet."
        total={sumAccountDebts(rows)}
        onEdit={startEdit}
        onRemove={remove}
        onStatements={openStatements}
        onPay={startPay}
        readOnly={readOnly}
        busy={busy}
        fundsMode={false}
      />
      </div>
    </>
  );
};

export default LedgerAccountsPanel;
