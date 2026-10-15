import React from 'react';
import { teamsToPick } from '../../utils/duezyJoin.js';

const divisionLabel = (d) => (d.play_day ? `${d.name} · ${d.play_day}s` : d.name);

/**
 * Top of the sign-up form: new team or one already in the league, then the division and the team.
 * The "already in the league" choice only shows when the league has teams to pick from.
 */
export default function DuezyJoinTeamFields({ form, divisions, teams, onChange }) {
  const existing = form.mode === 'existing';
  const choices = teamsToPick(teams, divisions, form.division_id);

  return (
    <>
      {teams.length ? (
        <div className="dz-join-mode" role="radiogroup" aria-label="Your team">
          {[['new', 'New team', 'Signing up for the first time'], ['existing', 'Already in the league', 'Send your captain info for a listed team']].map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={form.mode === id}
              className={`dz-join-mode-btn${form.mode === id ? ' is-on' : ''}`}
              onClick={() => onChange({ mode: id, team_id: '', changeCaptain: false })}
            >
              <strong>{label}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </div>
      ) : null}

      {divisions.length > 1 ? (
        <label className="dz-field">
          <span>Division</span>
          <select value={form.division_id} onChange={(e) => onChange({ division_id: e.target.value, team_id: '', changeCaptain: false })} required>
            <option value="">Pick your division…</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{divisionLabel(d)}</option>)}
          </select>
        </label>
      ) : null}

      {existing ? (
        <label className="dz-field">
          <span>Your team</span>
          <select
            value={form.team_id}
            onChange={(e) => {
              const picked = choices.find((t) => t.id === e.target.value);
              // A captain name with no contact on file starts filled in; they only need to add a phone or email.
              const captain = picked?.captain && !picked.contact_hint ? picked.captain : '';
              onChange({ team_id: e.target.value, changeCaptain: false, captain, contact: '', players: [] });
            }}
            disabled={!choices.length}
            required
          >
            <option value="">
              {divisions.length > 1 && !form.division_id ? 'Pick your division first…' : choices.length ? 'Pick your team…' : 'No teams in this division yet'}
            </option>
            {choices.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      ) : (
        <label className="dz-field">
          <span>Team name</span>
          <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} required />
        </label>
      )}
    </>
  );
}
