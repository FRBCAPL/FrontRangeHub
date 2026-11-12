import React, { useState } from 'react';
import { money, paidFor } from '../../utils/duezyMath.js';
import { correctionEntry, correctionSummary, isSameEntry } from '../../utils/duezyCorrection.js';
import { defaultMethod, methodOptions } from '../../utils/duezyLeaguePrefs.js';
import { asksWhoPaid } from '../../utils/duezyPayers.js';
import { canAddPart, isSplit, methodText } from '../../utils/duezySplits.js';
import DuezyAddPayment from './DuezyAddPayment.jsx';

/**
 * A week that already has a payment: show what's recorded and offer "Correct this entry"
 * (prefilled amount/method, optional reason, before → after preview, confirm before saving).
 * A partly paid week can also "Add payment" — the rest coming in later, maybe by another method (a split).
 */
export default function DuezyCorrectPayment({
  league, team = null, dues, weekName, payment, onSetPayment, onAddPlayer, startOpen = false, startAdd = false,
}) {
  const recorded = paidFor(payment, dues);
  const canAdd = payment?.status === 'partial' && canAddPart(payment, dues);
  const [step, setStep] = useState(startAdd && canAdd ? 'add' : startOpen ? 'edit' : 'view');
  const [amount, setAmount] = useState(String(recorded));
  const [method, setMethod] = useState(payment?.method || defaultMethod(league));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = () => {
    setAmount(String(recorded));
    setMethod(payment?.method || defaultMethod(league));
    setReason('');
    setError('');
    setStep('edit');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const entry = correctionEntry(amount, dues, method, reason);
      const keepPayer = entry.amount > 0 && asksWhoPaid(entry.method) ? payment?.paid_by || null : null;
      await onSetPayment({ ...entry, paid_by: keepPayer });
      setStep('view');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const summary = correctionSummary(payment, dues, amount, method);
  const unchanged = isSameEntry(payment, dues, amount, method);
  const validAmount = amount !== '' && Number(amount) >= 0;

  if (step === 'add') {
    return (
      <DuezyAddPayment
        league={league} team={team} dues={dues} weekName={weekName} payment={payment}
        onSetPayment={onSetPayment} onAddPlayer={onAddPlayer} onCancel={() => setStep('view')}
      />
    );
  }

  if (step === 'view') {
    const how = methodText(payment);
    return (
      <div className="dz-recorded">
        <p className="dz-small">
          <strong>{money(recorded)} recorded</strong> for {weekName}
          {how ? ` · ${how}` : ''}
          {payment?.status === 'partial' ? ` · partial (${money(dues - recorded)} still due)` : ''}
        </p>
        <div className="dz-row dz-row--start">
          {canAdd ? (
            <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={() => setStep('add')} title="The rest came in — any method, it's kept as a split">
              + Add payment
            </button>
          ) : null}
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={open}>Correct this entry</button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="dz-correct dz-correct--confirm" role="alertdialog" aria-label="Confirm correction">
        <p className="dz-small"><strong>Save this correction?</strong></p>
        <p className="dz-correct-summary">{summary}</p>
        {reason.trim() ? <p className="dz-small dz-muted">Reason: {reason.trim()}</p> : null}
        <p className="dz-small dz-muted">The original entry stays in the payment history.</p>
        {error ? <p className="dz-error">{error}</p> : null}
        <div className="dz-row dz-row--start">
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Yes, save correction'}
          </button>
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setStep('edit')} disabled={busy}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dz-correct">
      <p className="dz-small"><strong>Correct the {weekName} entry</strong></p>
      <div className="dz-inline-form">
        <label className="dz-money-input">
          <span className="dz-sr-only">Correct amount</span>
          <em>$</em>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method" disabled={Number(amount) === 0}>
          {methodOptions(league, payment?.method).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={300} aria-label="Reason for correction" />
      </div>
      {isSplit(payment) ? (
        <p className="dz-small dz-muted">Recorded as a split ({methodText(payment)}). Saving a correction replaces it with one amount and method.</p>
      ) : null}
      {unchanged ? (
        <p className="dz-small dz-muted">Change the amount or method to correct this entry. Enter 0 if they haven't actually paid this week.</p>
      ) : (
        <>
          <p className="dz-correct-summary">{summary}</p>
          <p className="dz-small dz-muted">Enter 0 if they haven't actually paid this week.</p>
        </>
      )}
      <div className="dz-row dz-row--start">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={() => setStep('confirm')} disabled={!validAmount || unchanged}>
          Review correction
        </button>
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setStep('view')}>Cancel</button>
      </div>
    </div>
  );
}
