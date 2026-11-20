import React from 'react';
import { usaplNightLabel } from '../../data/usaplDivisions.js';
import { isDenverMetroCash } from '../../data/usaplDenverMetroCash.js';
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
    <div className="usapl-fact">
      <span className="usapl-fact-label">{label}</span>
      <span className="usapl-fact-value">{children}</span>
    </div>
  );
}

export default function UsaplDivisionFactsBody({ division }) {
  const cashNight = isDenverMetroCash(division);
  const extraNotes = cashNight ? [] : stripUsaplFargoCapNotes(division.notes);
  const teamSize = division.teamSize || '';
  const rosterMax = division.rosterMax || '';
  const duesLabel = cashNight
    ? `$${division.duesPerPlayer} / player / format`
    : (division.duesPerPlayer != null && division.duesPerPlayer !== ''
      ? `$${division.duesPerPlayer} / player`
      : '');

  return (
    <div className="usapl-facts-body">
      <div className="usapl-facts-place">
        <UsaplPlayPlaceBadge division={division} />
      </div>
      <div className="usapl-facts-grid">
        <Fact label="Day of play">{division.night ? usaplNightLabel(division.night) : ''}</Fact>
        <Fact label="Area">{String(division.divisionArea || '').trim()}</Fact>
        <Fact label="First week">{formatDate(division.playStarts)}</Fact>
        <Fact label="Dues">{duesLabel}</Fact>
        <Fact label="Last week of play">{formatDate(division.lastWeek)}</Fact>
        <Fact label="Teams">{teamSize ? `${teamSize} players` : ''}</Fact>
        <Fact label="Roster">{rosterMax ? `${rosterMax} max` : ''}</Fact>
        <Fact label="Fargo cap">
          {division.combinedFargoCap ? `${division.combinedFargoCap} combined` : ''}
        </Fact>
      </div>
      {extraNotes.length ? (
        <div className="usapl-facts-notes">
          <p className="usapl-facts-notes-label">Notes</p>
          <ul>
            {extraNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
