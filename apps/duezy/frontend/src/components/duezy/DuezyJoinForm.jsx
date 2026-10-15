import React from 'react';
import DuezyJoinTeamFields from './DuezyJoinTeamFields.jsx';
import DuezyJoinCaptainFields from './DuezyJoinCaptainFields.jsx';
import DuezyJoinPlayers from './DuezyJoinPlayers.jsx';

/** The captain's sign-up fields. `website` is a hidden honeypot that people never see or fill in. */
export default function DuezyJoinForm({ form, divisions, teams = [], busy, error, onChange, onSubmit }) {
  const team = form.mode === 'existing' ? teams.find((t) => t.id === form.team_id) || null : null;
  return (
    <form className="dz-card dz-stack" onSubmit={onSubmit} noValidate>
      <DuezyJoinTeamFields form={form} divisions={divisions} teams={teams} onChange={onChange} />
      {form.mode === 'existing' && !team ? null : (
        <>
          <DuezyJoinCaptainFields form={form} team={team} onChange={onChange} />
          <DuezyJoinPlayers players={form.players} roster={team?.players || []} onChange={(players) => onChange({ players })} />
          <label className="dz-field">
            <span>Note for the league <em className="dz-muted">(optional)</em></span>
            <input value={form.note} onChange={(e) => onChange({ note: e.target.value })} maxLength={300} />
          </label>
        </>
      )}
      <div className="dz-hp" aria-hidden="true" inert="">
        <label>
          Website
          <input value={form.website} onChange={(e) => onChange({ website: e.target.value })} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? <p className="dz-error" role="alert">{error}</p> : null}
      <button type="submit" className="dz-btn dz-btn--primary" disabled={busy}>
        {busy ? 'Sending…' : form.mode === 'existing' ? 'Send my team’s info' : 'Sign up my team'}
      </button>
    </form>
  );
}
