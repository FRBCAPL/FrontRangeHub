import React from 'react';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';

export default function UsaplSignupReviewStep({
  kindLabel,
  divisionNames,
  teamName,
  locationSummary,
  captain,
  includeRoster,
  onIncludeRoster,
  players,
  onPlayerChange,
}) {
  return (
    <>
      <dl className="usapl-signup-recap">
        <div>
          <dt>Joining as</dt>
          <dd>{kindLabel}</dd>
        </div>
        <div>
          <dt>Nights</dt>
          <dd>{divisionNames.length ? divisionNames.join(', ') : 'None selected'}</dd>
        </div>
        {teamName ? (
          <div>
            <dt>Team</dt>
            <dd>{teamName}</dd>
          </div>
        ) : null}
        {locationSummary ? (
          <div>
            <dt>Location</dt>
            <dd>{locationSummary}</dd>
          </div>
        ) : null}
        <div>
          <dt>Contact</dt>
          <dd>{[captain.firstName, captain.lastName].filter(Boolean).join(' ') || '—'}</dd>
        </div>
      </dl>

      <p className="usapl-note">
        Dues are $10 per player per match. Play starts around 6:30 pm, no later than 7:00 pm unless both teams agree.
      </p>

      <label className="usapl-signup-roster-toggle">
        <input
          type="checkbox"
          checked={includeRoster}
          onChange={(e) => onIncludeRoster(e.target.checked)}
        />
        Add roster names now (optional — a full roster is still required at start of play)
      </label>

      {includeRoster ? players.map((player, index) => (
        <UsaplPlayerFields
          key={index}
          title={`Player ${index + 2}`}
          player={player}
          onChange={(next) => onPlayerChange(index, next)}
        />
      )) : null}
    </>
  );
}
