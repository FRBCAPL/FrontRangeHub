import React from 'react';

/** The captain can be kept only when the league has a name and a contact on file for the team. */
export const canKeepCaptain = (team) => Boolean(team?.captain && team?.contact_hint);

/**
 * Captain section of the sign-up form. For a team already in the league it shows the captain on file
 * (contact masked, the real one never reaches this page) with "Change captain?" to enter someone new.
 */
export default function DuezyJoinCaptainFields({ form, team, onChange }) {
  if (canKeepCaptain(team) && !form.changeCaptain) {
    return (
      <div className="dz-join-captain">
        <div>
          <span className="dz-join-captain-label">Captain</span>
          <strong>{team.captain}</strong>
          <small className="dz-muted">{team.contact_hint}</small>
        </div>
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => onChange({ changeCaptain: true })}>
          Change captain?
        </button>
      </div>
    );
  }

  const changing = canKeepCaptain(team);
  return (
    <div className="dz-join-captain-edit">
      {team && !changing ? (
        <p className="dz-small dz-muted">
          {team.captain
            ? `The league doesn’t have a phone or email for ${team.captain} yet. Add one below.`
            : 'The league doesn’t have a captain for this team yet. Add yours below.'}
        </p>
      ) : null}
      <div className="dz-join-grid">
        <label className="dz-field">
          <span>{changing ? 'New captain' : team ? 'Captain' : 'Captain (you)'}</span>
          <input value={form.captain} onChange={(e) => onChange({ captain: e.target.value })} maxLength={80} autoComplete="name" required />
        </label>
        <label className="dz-field">
          <span>Phone or email</span>
          <input value={form.contact} onChange={(e) => onChange({ contact: e.target.value })} maxLength={120} autoComplete="tel" required />
        </label>
      </div>
      {changing ? (
        <button type="button" className="dz-link dz-small dz-join-keep" onClick={() => onChange({ changeCaptain: false, captain: '', contact: '' })}>
          Keep {team.captain} as captain
        </button>
      ) : null}
    </div>
  );
}
