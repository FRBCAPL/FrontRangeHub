import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { listedPlacePrizes, placePotPercent } from './cashClimbPlacePrizes.js';

export default function CashClimbPrizePreview({
  prizePool,
  placePrizes,
  preview,
  formatLabel,
}) {
  const listed = listedPlacePrizes(placePrizes);
  const reserved = listed.reduce((sum, row) => sum + row.amount, 0);

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
        Prize pool {formatMoney(prizePool)}
        {listed.length ? ` • Last standing ${placePotPercent()}% (${formatMoney(reserved)})` : ''}
        {' '}• Match pool {formatMoney(preview.available)}
        {preview.expectedRounds ? ` • about ${preview.expectedRounds} round${preview.expectedRounds === 1 ? '' : 's'}` : ''}
        {preview.rrRounds || preview.kohRounds
          ? ` (${preview.rrRounds || 0} RR + ${preview.kohRounds || 0} KOH)`
          : ''}
        {formatLabel ? ` • ${formatLabel}` : ''}
      </p>
      {listed.length > 0 && (
        <ul className="cc-place-list">
          {listed.map((row) => (
            <li key={row.place}>
              <span>{row.label}</span>
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
        This table is the starting estimate. Match money is one ladder from round 1 through King of the Hill. Round 1 pays at least $2 per win. Each later round pays $1 more per win when leftover can cover that climb without later rounds dropping. King of the Hill starts at 3 players. Each win is a whole dollar. Last standing is reserved separately.
      </p>
    </div>
  );
}
