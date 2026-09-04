import React from 'react';

export default function UsaplSignupTeamStep({
  kind,
  playerCount,
  onPlayerCount,
  needsTeamName,
  teamName,
  onTeamName,
  teamNameUnknown,
  onTeamNameUnknown,
  hideLocation,
  locationLabel,
  locationRequired,
  locationPlaceholder,
  location,
  onLocation,
  customLocation,
  onCustomLocation,
  locationNames,
  locationsLoading,
  locationUnknown,
  onLocationUnknown,
}) {
  return (
    <>
      {kind === 'partial_team' ? (
        <div className="usapl-field">
          <label htmlFor="usapl-signup-player-count">How many players do you have? *</label>
          <select
            id="usapl-signup-player-count"
            value={playerCount}
            onChange={(e) => onPlayerCount(e.target.value)}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      ) : null}

      {needsTeamName ? (
        <div className="usapl-field">
          <label htmlFor="usapl-signup-team-name">Team name{teamNameUnknown ? '' : ' *'}</label>
          <input
            id="usapl-signup-team-name"
            value={teamNameUnknown ? '' : teamName}
            onChange={(e) => onTeamName(e.target.value)}
            autoComplete="organization"
            disabled={teamNameUnknown}
            placeholder={teamNameUnknown ? 'Unknown' : ''}
          />
          <label className="usapl-signup-roster-toggle">
            <input
              type="checkbox"
              checked={teamNameUnknown}
              onChange={(e) => onTeamNameUnknown(e.target.checked)}
            />
            Unknown
          </label>
        </div>
      ) : (
        <p className="usapl-note">No team name needed. We will help place you.</p>
      )}

      {hideLocation ? (
        <p className="usapl-note">Home location is set by the in-house night you picked.</p>
      ) : (
        <>
          <div className="usapl-field">
            <label htmlFor="usapl-signup-location">
              {locationLabel}{locationRequired && !locationUnknown ? ' *' : ''}
            </label>
            <select
              id="usapl-signup-location"
              value={locationUnknown ? '' : location}
              onChange={(e) => onLocation(e.target.value)}
              disabled={locationUnknown}
            >
              <option value="">{locationsLoading ? 'Loading locations…' : locationPlaceholder}</option>
              <option value="Other">Other</option>
              {locationNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <label className="usapl-signup-roster-toggle">
              <input
                type="checkbox"
                checked={locationUnknown}
                onChange={(e) => onLocationUnknown(e.target.checked)}
              />
              Unknown
            </label>
          </div>
          {!locationUnknown && location === 'Other' ? (
            <div className="usapl-field">
              <label htmlFor="usapl-signup-location-other">Other location</label>
              <input
                id="usapl-signup-location-other"
                value={customLocation}
                onChange={(e) => onCustomLocation(e.target.value)}
                placeholder="Name it if you know"
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
