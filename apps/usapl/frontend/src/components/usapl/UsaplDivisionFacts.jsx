import React from 'react';
import { usaplNightLabel } from '../../data/usaplDivisions.js';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function UsaplDivisionFacts({ division }) {
  return (
    <details className="usapl-facts">
      <summary>Division details</summary>
      <div className="usapl-facts-body">
        <h2>{usaplNightLabel(division.night)} division</h2>
        {division.playStarts ? (
          <p>Play starts: {formatDate(division.playStarts)}</p>
        ) : null}
        {division.lastWeek ? (
          <p>Last week of play: {formatDate(division.lastWeek)}</p>
        ) : null}
        {division.duesPerPlayer != null && division.duesPerPlayer !== '' ? (
          <p>${division.duesPerPlayer} dues per player per match</p>
        ) : null}
        {division.teamSize || division.rosterMax ? (
          <p>{division.teamSize} person teams / {division.rosterMax} max on roster</p>
        ) : null}
        {division.combinedFargoCap ? (
          <p>Playable combined max FargoRate: {division.combinedFargoCap}</p>
        ) : null}
        {division.locationNote ? <p>{division.locationNote}</p> : null}
        {division.notes?.length ? (
          <ul>
            {division.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
