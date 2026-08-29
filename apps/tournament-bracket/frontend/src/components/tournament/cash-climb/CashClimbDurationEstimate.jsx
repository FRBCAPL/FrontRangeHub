import React from 'react';
import { formatEventRaces } from './cashClimbRace.js';

export default function CashClimbDurationEstimate({ estimate, compact = false }) {
  if (!estimate) {
    return compact ? null : (
      <p className="cc-duration cc-duration-placeholder">
        Add at least 2 players to see a time estimate.
      </p>
    );
  }

  if (compact) {
    return <span>{estimate.remaining ? 'Est. remaining' : 'Est.'} {estimate.label}</span>;
  }

  const roundCopy = estimate.earlyKoh
    ? `1 opening round, then King of the Hill with ${estimate.kohPlayers}`
    : `about ${estimate.rrRounds} round-robin round${estimate.rrRounds === 1 ? '' : 's'} as the field thins, then King of the Hill at 3`;

  return (
    <div className="cc-duration">
      <p className="cc-duration-main">
        {estimate.remaining ? 'Estimated time remaining' : 'Estimated time'}: <strong>{estimate.label}</strong>
      </p>
      <p className="cc-duration-note">
        {formatEventRaces(estimate.raceTo, estimate.kohRaceTo)} {estimate.gameType} • {estimate.tableCount} table
        {estimate.tableCount === 1 ? '' : 's'} • {roundCopy}.
        Later rounds have fewer matches as players go out. Pace varies.
      </p>
    </div>
  );
}
