import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { formatEstateDisplayDate } from '@shared/utils/estateInventoryConstants.js';
import {
  CREDITOR_CLAIM_STATUSES,
  claimStatusLabel,
  sumActiveClaimAmounts
} from '@shared/utils/estateCreditorClaims.js';

const today = () => new Date().toISOString().slice(0, 10);

const BLANK = {
  creditorName: '',
  amount: '',
  status: 'open',
  noticedDate: '',
  filedDate: '',
  notes: ''
};

/**
 * Thin creditor claims register — Estate money tab.
 * Supporting PR record only; does not change Cash on hand.
 */
const LedgerClaimsPanel = ({ rows = [], caseNumber, readOnly, onChanged }) => {
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const set = (key) => (ev) => {
    setForm((prev) => ({ ...prev, [key]: ev.target.value }));
  };

  const resetForm = () => {
    setForm(BLANK);
    setEditingId(null);
  };

  const save = async (ev) => {
    ev?.preventDefault?.();
    setBusy(true);
    setError('');
    setInfo('');
    const payload = { ...form, caseNumber };
    const result = editingId
      ? await estateInventoryService.updateEstateCreditorClaim(editingId, payload)
      : await estateInventoryService.addEstateCreditorClaim(payload);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save the claim.');
      return;
    }
    setInfo(editingId ? 'Claim updated.' : 'Claim recorded.');
    resetForm();
    onChanged?.();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setError('');
    setInfo('');
    setForm({
      creditorName: row.creditor_name || '',
      amount: row.amount == null || row.amount === '' ? '' : String(row.amount),
      status: row.status || 'open',
      noticedDate: row.noticed_date || '',
      filedDate: row.filed_date || '',
      notes: row.notes || ''
    });
  };

  const remove = async (row) => {
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.deleteEstateCreditorClaim(row.id, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not remove the claim.');
      return;
    }
    if (editingId === row.id) resetForm();
    setInfo(`Removed claim from ${row.creditor_name}.`);
    onChanged?.();
  };

  const activeTotal = sumActiveClaimAmounts(rows);

  return (
    <>
      <p className="ei-settings-hint">
        Track creditor claims against the estate — who claimed, how much, whether you noticed
        them, when a claim was filed, and status. This is a <strong>supporting register</strong>{' '}
        for you and counsel. It does not change Cash on hand. Set the claims / probate window
        under Settings → Estate &amp; probate.
      </p>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}

      {!readOnly ? (
        <form className="ei-finance-expense-form ei-accounts-form" onSubmit={save}>
          <div className="ei-field ei-field-wide">
            <strong>{editingId ? 'Edit claim' : 'Add claim'}</strong>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-claim-creditor">Creditor / claimant</label>
            <input
              id="ei-claim-creditor"
              value={form.creditorName}
              onChange={set('creditorName')}
              placeholder="e.g. Memorial Hospital"
              required
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-claim-amount">Amount claimed ($)</label>
            <input
              id="ei-claim-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={set('amount')}
              placeholder="Optional if unknown"
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-claim-status">Status</label>
            <select id="ei-claim-status" value={form.status} onChange={set('status')}>
              {CREDITOR_CLAIM_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-claim-noticed">Notice date (optional)</label>
            <input
              id="ei-claim-noticed"
              type="date"
              value={form.noticedDate}
              onChange={set('noticedDate')}
              max={today()}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-claim-filed">Claim filed / received (optional)</label>
            <input
              id="ei-claim-filed"
              type="date"
              value={form.filedDate}
              onChange={set('filedDate')}
            />
          </div>
          <div className="ei-field ei-field-wide">
            <label htmlFor="ei-claim-notes">Notes (optional)</label>
            <input
              id="ei-claim-notes"
              value={form.notes}
              onChange={set('notes')}
              placeholder="e.g. Formal claim letter on file with counsel"
            />
          </div>
          <div className="ei-btn-row ei-field-wide">
            <button type="submit" className="ei-btn ei-btn-small" disabled={busy}>
              {editingId ? 'Save changes' : 'Add claim'}
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
        </form>
      ) : (
        <p className="ei-settings-hint">This estate is closed for records, so this is view-only.</p>
      )}

      <section className="ei-accounts-section">
        <div className="ei-accounts-section-head">
          <h4>Open / allowed claims</h4>
          <span className="ei-accounts-total">{formatMoney(activeTotal)}</span>
        </div>
        {rows.length ? (
          <ul className="ei-accounts-list">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="ei-accounts-row-main">
                  <strong>{row.creditor_name}</strong>
                  <span className="ei-accounts-row-sub">{claimStatusLabel(row.status)}</span>
                  {row.filed_date || row.noticed_date ? (
                    <span className="ei-accounts-row-sub">
                      {row.filed_date
                        ? `Filed ${formatEstateDisplayDate(row.filed_date) || row.filed_date}`
                        : null}
                      {row.filed_date && row.noticed_date ? ' · ' : null}
                      {row.noticed_date
                        ? `Noticed ${formatEstateDisplayDate(row.noticed_date) || row.noticed_date}`
                        : null}
                    </span>
                  ) : null}
                  {row.notes ? <span className="ei-accounts-row-sub">{row.notes}</span> : null}
                </div>
                <div className="ei-accounts-row-side">
                  <span className="ei-accounts-amount">
                    {row.amount == null || row.amount === ''
                      ? '—'
                      : formatMoney(row.amount)}
                  </span>
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
                        onClick={() => remove(row)}
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
          <p className="ei-settings-hint">No creditor claims recorded yet.</p>
        )}
      </section>
    </>
  );
};

export default LedgerClaimsPanel;
