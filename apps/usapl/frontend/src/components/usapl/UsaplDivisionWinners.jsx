import React from 'react';
import { usaplDivisionWinners } from '../../data/usaplPastDivisions.js';

export default function UsaplDivisionWinners({ division }) {
  const winners = usaplDivisionWinners(division);
  if (!winners.length) return null;
  return (
    <p className="usapl-winner-line">
      {winners.map((row, index) => (
        <span key={`${row.format}-${row.team}`}>
          {index > 0 ? <br /> : null}
          {row.format ? `${row.format} winner: ${row.team}` : `Winner: ${row.team}`}
        </span>
      ))}
    </p>
  );
}
