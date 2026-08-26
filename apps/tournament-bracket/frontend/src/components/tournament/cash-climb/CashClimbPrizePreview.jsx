import React from 'react';
import { formatMoney } from './cashClimbEngine.js';

export default function CashClimbPrizePreview({ prizePool, firstPlaceAmount, firstPlacePercent, preview, formatLabel }) {
  if (!preview) {
    return (
      <p className="players-count">
        Prize pool: {formatMoney(prizePool)} • Add at least 2 players to see round payouts.
      </p>
    );
  }

  return (
    <div className="cc-prize-preview">
      <p className="players-count">
        Prize pool {formatMoney(prizePool)} • 1st reserved {formatMoney(firstPlaceAmount)}
        {firstPlacePercent != null ? ` (${firstPlacePercent}%)` : ''} • Match pool {formatMoney(preview.available)}
        {formatLabel ? ` • ${formatLabel}` : ''}
      </p>
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
            <tr key={r.roundNumber}>
              <td>Round {r.roundNumber}</td>
              <td>{formatMoney(r.roundPrize)}</td>
              <td>{formatMoney(r.perWin)}</td>
              <td>{formatMoney(r.paidThisRound)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cc-prize-preview-note">
        Per-win amounts are rounded down to the cent, so a round pool may be a few cents larger than what that round actually pays. Leftover cents, and any scheduled rounds that are not played after the field reaches King of the Hill, stay in the pool for later matches and the winner.
      </p>
    </div>
  );
}
