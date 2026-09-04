import React from 'react';

export default function UsaplSignupTeamStep({
  kind,
  playerCount,
  onPlayerCount,
  needsTeamName,
  teamName,
  onTeamName,
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
          <label htmlFor="usapl-signup-team-name">Team name *</label>
          <input
            id="usapl-signup-team-name"
            value={teamName}
            onChange={(e) => onTeamName(e.target.value)}
            autoComplete="organization"
          />
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
              {locationLabel}{locationRequired ? ' *' : ''}
            </label>
            <select
              id="usapl-signup-location"
              value={location}
              onChange={(e) => onLocation(e.target.value)}
            >
              <option value="">{locationsLoading ? 'Loading locations…' : locationPlaceholder}</option>
              <option value="Other">{kind === 'full_team' ? 'Other/unknown' : 'Other'}</option>
              {locationNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          {location === 'Other' ? (
            <div className="usapl-field">
              <label htmlFor="usapl-signup-location-other">
                {kind === 'full_team' ? 'Name it if you know' : 'Other location'}
              </label>
              <input
                id="usapl-signup-location-other"
                value={customLocation}
                onChange={(e) => onCustomLocation(e.target.value)}
                placeholder={kind === 'full_team' ? 'Optional' : ''}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
