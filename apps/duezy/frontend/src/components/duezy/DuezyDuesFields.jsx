import React from 'react';
import { memberWord } from '../../data/duezyOptions.js';
import { matchesPerNight } from '../../utils/duezyMath.js';

/** Dues amount / basis / players / weeks — shared by the setup wizard and league settings. */
export default function DuezyDuesFields({ league, onChange, showTeamSize = false }) {
  const word = memberWord(league.sport);
  const perPlayer = league.dues_basis === 'player';
  const matches = matchesPerNight(league);
  return (
    <div className="dz-stack">
      <div className="dz-segment" role="radiogroup" aria-label="How dues are charged">
        <button
          type="button"
          role="radio"
          aria-checked={league.dues_basis === 'team'}
          className={league.dues_basis === 'team' ? 'is-active' : ''}
          onClick={() => onChange({ dues_basis: 'team' })}
        >
          A set amount per team
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={league.dues_basis === 'player'}
          className={league.dues_basis === 'player' ? 'is-active' : ''}
          onClick={() => onChange({ dues_basis: 'player' })}
        >
          An amount per {word.replace(/s$/, '')}
        </button>
      </div>

      <div className="dz-grid-3">
        <label className="dz-field">
          <span>{perPlayer ? `Per ${word.replace(/s$/, '')}` : 'Per team'}, per {matches > 1 ? 'match' : 'week'}</span>
          <div className="dz-money-input">
            <em>$</em>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={league.dues_amount}
              onChange={(e) => onChange({ dues_amount: e.target.value })}
            />
          </div>
        </label>
        {perPlayer || showTeamSize ? (
          <label className="dz-field">
            <span>{perPlayer ? `${word[0].toUpperCase() + word.slice(1)} per team, per week` : `Team size (${word})`}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="50"
              value={league.players_per_match}
              onChange={(e) => onChange({ players_per_match: e.target.value })}
            />
          </label>
        ) : null}
        <label className="dz-field">
          <span>Weeks in the season</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="104"
            value={league.total_weeks}
            onChange={(e) => onChange({ total_weeks: e.target.value })}
          />
        </label>
      </div>

      <div className="dz-field">
        <span>Matches each night</span>
        <div className="dz-segment" role="radiogroup" aria-label="Matches each night">
          {[[1, 'One match'], [2, 'Double play (2 matches)']].map(([n, label]) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={matches === n}
              className={matches === n ? 'is-active' : ''}
              onClick={() => onChange({ matches_per_night: n })}
            >
              {label}
            </button>
          ))}
        </div>
        {matches > 1 ? <small className="dz-small dz-muted">Dues are charged for each match, so the weekly amount doubles.</small> : null}
      </div>
    </div>
  );
}
