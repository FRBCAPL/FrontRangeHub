import React from 'react';
import { formatUsaplVegasSeedNote, formatUsaplWinnerName, normalizeUsaplTeamKey } from '../../data/usaplVegasSeeds.js';
import { usaplDivisionShowsSessionStats, usaplDivisionWinners } from '../../data/usaplPastDivisions.js';

export default function UsaplDivisionWinners({ division, stats }) {
  if (!usaplDivisionShowsSessionStats(division)) return null;
  const winners = usaplDivisionWinners(division);
  if (!winners.length) return null;
  return (
    <p className="usapl-winner-line">
      {winners.map((row, index) => {
        const rowStats = stats?.get(normalizeUsaplTeamKey(row.team));
        const team = formatUsaplWinnerName(row.team, rowStats?.wins || 1);
        return (
          <span key={`${row.format}-${row.team}`}>
            {index > 0 ? <br /> : null}
            {row.format ? `${row.format} winner: ${team}` : `Winner: ${team}`}
            {formatUsaplVegasSeedNote(rowStats)}
          </span>
        );
      })}
    </p>
  );
}
