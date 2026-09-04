import React from 'react';

export default function UsaplRosterTeamStep({
  mode,
  teamName,
  onTeamName,
  teamNameUnknown,
  onTeamNameUnknown,
  teamPick,
  onTeamPick,
  otherName,
  onOtherName,
  teamNames,
  loading,
}) {
  if (mode === 'new') {
    return (
      <>
        <p className="usapl-lede">Name the new team.</p>
        <div className="usapl-field">
          <label htmlFor="usapl-roster-team-name">Team name{teamNameUnknown ? '' : ' *'}</label>
          <input
            id="usapl-roster-team-name"
            value={teamNameUnknown ? '' : teamName}
            onChange={(event) => onTeamName(event.target.value)}
            autoComplete="organization"
            disabled={teamNameUnknown}
            placeholder={teamNameUnknown ? "Don't know yet" : ''}
          />
          <label className="usapl-signup-roster-toggle">
            <input
              type="checkbox"
              checked={teamNameUnknown}
              onChange={(event) => onTeamNameUnknown(event.target.checked)}
            />
            Don&apos;t know yet
          </label>
        </div>
      </>
    );
  }

  const listed = teamPick && teamPick !== 'Other';

  return (
    <>
      <p className="usapl-lede">
        {loading ? 'Loading current teams…' : 'Pick your team from the list.'}
      </p>
      <div className="usapl-field">
        <label htmlFor="usapl-roster-team-pick">Team name *</label>
        <select
          id="usapl-roster-team-pick"
          value={teamPick}
          onChange={(event) => onTeamPick(event.target.value)}
          required
        >
          <option value="">{loading ? 'Loading teams…' : 'Select a team'}</option>
          {teamNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>
      {teamPick === 'Other' ? (
        <div className="usapl-field">
          <label htmlFor="usapl-roster-team-other">Team name *</label>
          <input
            id="usapl-roster-team-other"
            value={otherName}
            onChange={(event) => onOtherName(event.target.value)}
            autoComplete="organization"
            required
          />
        </div>
      ) : null}
      {listed ? (
        <p className="usapl-note">Names on the next steps are filled in so you can change them.</p>
      ) : null}
    </>
  );
}
