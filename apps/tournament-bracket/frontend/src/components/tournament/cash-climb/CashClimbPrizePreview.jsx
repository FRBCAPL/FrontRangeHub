import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { listedPlacePrizes } from './cashClimbPlacePrizes.js';

export default function CashClimbPrizePreview({
  prizePool,
  placePrizes,
  preview,
  formatLabel,
}) {
  if (!preview) {
    return (
      <p className="players-count">
        Prize pool: {formatMoney(prizePool)} • Add at least 2 players to see round payouts.
      </p>
    );
  }

  const finishing = listedPlacePrizes(placePrizes);
  const v2 = preview.rrBudget != null && preview.kohBudget != null;

  return (
    <div className="cc-prize-preview">
      <p className="players-count">
        Prize pool {formatMoney(prizePool)}
        {v2
          ? ` • RR bank ${formatMoney(preview.rrBudget)} • KOH bank ${formatMoney(preview.kohBudget)}`
          : finishing.length
            ? ` • Last standing leftover ${formatMoney(finishing.reduce((sum, row) => sum + row.amount, 0))}`
            : ''}
        {preview.expectedRounds ? ` • about ${preview.expectedRounds} RR round${preview.expectedRounds === 1 ? '' : 's'}` : ''}
        {preview.rrRounds || preview.kohRounds
          ? ` (${preview.rrRounds || 0} RR + ${preview.kohRounds || 0} KOH)`
          : ''}
        {formatLabel ? ` • ${formatLabel}` : ''}
      </p>
      {finishing.length > 0 && (
        <ul className="cc-place-list">
          {finishing.map((row) => (
            <li key={row.place}>
              <span>{row.place === 1 && v2 ? 'Championship floor' : row.label}</span>
              <strong>{formatMoney(row.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Round pool</th>
            <th>Per win</th>
            <th>This round pays</th>
          </tr>
        </thead>
        <tbody>
          {preview.rounds.map((r) => (
            <tr key={`${r.phase}-${r.roundNumber}`}>
              <td>{r.label || `Round ${r.roundNumber}`}</td>
              <td>{formatMoney(r.roundPrize)}</td>
              <td>{formatMoney(r.perWin)}</td>
              <td>{formatMoney(r.paidThisRound)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cc-prize-preview-note">
        {v2
          ? 'The full entry fee stays in this event. About 75% funds the round-robin climb; about 25% is a protected King of the Hill bank. Match pays are locked at the start. Extra RR rounds hold the last per-win if the RR bank can pay; they never take KOH money. Unused KOH is the championship. Unused RR splits 60 / 40 to 2nd and 3rd. King of the Hill starts at 3 players. Each win is a whole dollar.'
          : 'This table is the starting estimate. Match wins climb from $2. Last standing leftover is parked so the winner is always awarded. Extra rounds can shrink leftover; a short night can grow it. King of the Hill starts at 3 players. Each win is a whole dollar.'}
      </p>
    </div>
  );
}
