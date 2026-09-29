import React, { useEffect, useState } from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import './BreakAndRunOperator.css';

/** Folded bookkeeping: fees, seed, reserve, and manual pot adjustments. */
export default function BreakAndRunMoneyDetails({ tournament, snapshot, live, onAddToPot, onSetReserve }) {
  const called = snapshot.payoutMode === 'called-ball';
  const [potDelta, setPotDelta] = useState('');
  const [reserveDraft, setReserveDraft] = useState(String(tournament.reserve ?? ''));

  useEffect(() => {
    setReserveDraft(String(tournament.reserve ?? ''));
  }, [tournament.id, tournament.reserve]);

  const handleAddPot = (e) => {
    e.preventDefault();
    const amount = Number(potDelta);
    if (!Number.isFinite(amount) || amount === 0) {
      alert('Enter an amount to add or take.');
      return;
    }
    onAddToPot(amount, amount > 0 ? 'Added to pot' : 'Taken from pot');
    setPotDelta('');
  };

  const handleReserve = (e) => {
    e.preventDefault();
    const amount = Number(reserveDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      alert('Enter a reserve of $0 or more.');
      return;
    }
    onSetReserve?.(amount);
  };

  const rows = [
    ['Total pot', formatMoney(snapshot.currentPot)],
    ['Reserve', formatMoney(snapshot.reserve)],
    [called ? 'League seed (total)' : 'Seed (one-time)', formatMoney(called ? snapshot.seedTotal : snapshot.startingSeed)],
    ['Paid out', formatMoney(snapshot.totalPaidOut)],
    ['Entry fees collected', formatMoney(snapshot.entryFees)],
    ['Admin fees', formatMoney(snapshot.adminFees)],
    ['Entries', String(snapshot.buyInCount ?? 0)],
  ];

  return (
    <details className="bnr-money-details">
      <summary>Money details</summary>
      <dl className="bnr-money-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="bnr-money-note">
        Admin is $1 of each $10 entry and $2 of each $20 — held out of the pot (not paid on balls).
        {called ? ' Reserve is 20% of the pot once it is over $100 and carries forward.' : ''}
      </p>
      {live ? (
        <div className="bnr-money-forms">
          {called ? null : (
            <form className="bnr-add-pot" onSubmit={handleReserve}>
              <label>
                Reserve held ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reserveDraft}
                  onChange={(e) => setReserveDraft(e.target.value)}
                />
              </label>
              <button type="submit" className="tb-btn-new">Set reserve</button>
            </form>
          )}
          <form className="bnr-add-pot" onSubmit={handleAddPot}>
            <label>
              Adjust pot ($)
              <input
                type="number"
                step="0.01"
                value={potDelta}
                onChange={(e) => setPotDelta(e.target.value)}
                placeholder="+ seed or − house"
              />
            </label>
            <button type="submit" className="tb-btn-new">Apply</button>
          </form>
        </div>
      ) : null}
    </details>
  );
}
