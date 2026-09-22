import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';

function when(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function BreakAndRunLedger({ ledger = [], live, onUndo }) {
  return (
    <section className="bnr-ledger" aria-label="Pot history">
      <div className="bnr-section-head">
        <h2>Pot history</h2>
        {live && ledger[0] && ledger[0].type !== 'open' && ledger[0].type !== 'seed' && onUndo ? (
          <button type="button" className="tb-btn-new" onClick={onUndo}>Undo last</button>
        ) : null}
      </div>
      {!ledger.length ? (
        <p className="cc-setup-note">Entries, seed, and payouts show up here as the night goes.</p>
      ) : (
        <ol>
          {ledger.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.playerName || row.note || row.type}</strong>
                <span>{[row.note, when(row.at)].filter(Boolean).join(' · ')}</span>
              </div>
              <em className={row.amount < 0 || row.type === 'payout' ? 'bnr-out' : 'bnr-in'}>
                {row.type === 'payout' ? '−' : row.amount < 0 ? '' : '+'}
                {formatMoney(Math.abs(row.amount || 0))}
              </em>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
