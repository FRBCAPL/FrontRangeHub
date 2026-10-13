import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { parseDepositAmount } from '../../utils/duezyDeposits.js';
import DuezyModal from './DuezyModal.jsx';

/** "Deposited in bank" for one method: the full amount on hand, or a custom amount. */
export default function DuezyDepositModal({ balance, today, onSave, onClose }) {
  const { method, onHand } = balance;
  const canFull = onHand > 0;
  const [mode, setMode] = useState(canFull ? 'full' : 'custom');
  const [custom, setCustom] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const amount = mode === 'full' ? onHand : parseDepositAmount(custom);
  const over = amount && amount > Math.max(0, onHand);

  const save = async (e) => {
    e.preventDefault();
    if (!amount) { setError('Enter an amount more than $0.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({ method, amount, deposited_on: date || today, note: note.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <DuezyModal title={`${method}: deposited in bank`} onClose={onClose} className="dz-deposit-modal">
      <form className="dz-team-modal-form" onSubmit={save}>
        <p className="dz-small dz-muted">{money(Math.max(0, onHand))} of {method} money is on hand (collected, not yet deposited).</p>

        <fieldset className="dz-deposit-choice">
          <legend className="dz-sr-only">How much</legend>
          <label className={`dz-check-label${canFull ? '' : ' is-disabled'}`}>
            <input type="radio" name="dz-deposit-mode" checked={mode === 'full'} disabled={!canFull} onChange={() => setMode('full')} />
            Full amount <b>{money(Math.max(0, onHand))}</b>
          </label>
          <label className="dz-check-label">
            <input type="radio" name="dz-deposit-mode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
            Custom amount
          </label>
          {mode === 'custom' ? (
            <input
              className="dz-deposit-amount"
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="$0.00"
              aria-label="Custom amount"
              autoFocus
            />
          ) : null}
        </fieldset>

        <label className="dz-field">
          <span>Date deposited</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="dz-field">
          <span>Note <em>(optional)</em></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Deposit slip #1042" />
        </label>

        {over ? <p className="dz-small dz-owe-due">That’s more than Duezy shows on hand for {method}. You can still save it.</p> : null}
        {error ? <p className="dz-error">{error}</p> : null}

        <div className="dz-team-modal-actions">
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !amount}>
            {busy ? 'Saving…' : `Save deposit${amount ? ` · ${money(amount)}` : ''}`}
          </button>
        </div>
      </form>
    </DuezyModal>
  );
}
