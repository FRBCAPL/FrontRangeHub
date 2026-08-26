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
          </tr>
        </thead>
        <tbody>
          {preview.rounds.map((r) => (
            <tr key={r.roundNumber}>
              <td>Round {r.roundNumber}</td>
              <td>{formatMoney(r.roundPrize)}</td>
              <td>{formatMoney(r.perWin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cc-prize-preview-note">
        Per win is what the match winner earns in that round. King of the Hill uses whatever is left after round-robin payouts and the 1st-place reserve.
      </p>
    </div>
  );
}
