import React from 'react';
import { usaplNightLabel } from '../../data/usaplDivisions.js';
import { stripUsaplFargoCapNotes } from '../../data/usaplFargoCapCopy.js';
import UsaplPlayPlaceBadge from './UsaplPlayPlaceBadge.jsx';

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

function Fact({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <p className="usapl-fact">
      <span className="usapl-fact-label">{label}</span>
      <span className="usapl-fact-value">{children}</span>
    </p>
  );
}

export default function UsaplDivisionFactsBody({ division, summary = false }) {
  const extraNotes = stripUsaplFargoCapNotes(division.notes);
  const teamSize = division.teamSize || '';
  const rosterMax = division.rosterMax || '';
  return (
    <div className="usapl-facts-body">
      <h2>{division.name || division.shortName}</h2>
      <div className="usapl-facts-place">
        <UsaplPlayPlaceBadge division={division} />
      </div>
      <div className="usapl-facts-grid">
        <Fact label="Day of play">{division.night ? usaplNightLabel(division.night) : ''}</Fact>
        <Fact label="First week">{formatDate(division.playStarts)}</Fact>
        {summary ? (
          <Fact label="Last week of play">{formatDate(division.lastWeek)}</Fact>
        ) : (
          <>
            <Fact label="Dues">
              {division.duesPerPlayer != null && division.duesPerPlayer !== ''
                ? `$${division.duesPerPlayer} / player`
                : ''}
            </Fact>
            <Fact label="Last week of play">{formatDate(division.lastWeek)}</Fact>
            <Fact label="Teams">{teamSize ? `${teamSize} players` : ''}</Fact>
            <Fact label="Roster">{rosterMax ? `${rosterMax} max` : ''}</Fact>
            <Fact label="Fargo cap">
              {division.combinedFargoCap ? `${division.combinedFargoCap} combined` : ''}
            </Fact>
            {extraNotes.length ? (
              <div className="usapl-fact usapl-facts-notes">
                <span className="usapl-fact-label">Notes</span>
                <ul className="usapl-fact-value">
                  {extraNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
