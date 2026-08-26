import React from 'react';

export default function CashClimbDurationEstimate({ estimate, compact = false }) {
  if (!estimate) {
    return compact ? null : (
      <p className="cc-duration cc-duration-placeholder">
        Add at least 2 players to see a time estimate.
      </p>
    );
  }

  if (compact) {
    return <span>Est. {estimate.label}</span>;
  }

  const roundCopy = estimate.earlyKoh
    ? `1 opening round, then King of the Hill with ${estimate.kohPlayers}`
    : `about ${estimate.rrRounds} round-robin round${estimate.rrRounds === 1 ? '' : 's'}, then King of the Hill with ${estimate.kohPlayers}`;

  return (
    <div className="cc-duration">
      <p className="cc-duration-main">
        Estimated time: <strong>{estimate.label}</strong>
      </p>
      <p className="cc-duration-note">
        Race to {estimate.raceTo} {estimate.gameType} • {estimate.tableCount} table
        {estimate.tableCount === 1 ? '' : 's'} • {roundCopy}.
        Pace varies.
      </p>
    </div>
  );
}
