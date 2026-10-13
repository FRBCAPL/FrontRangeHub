import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { archiveLeague, getLeague, updateLeague } from '../../services/duezyService.js';
import { matchesToSave, money, weeklyDues } from '../../utils/duezyMath.js';
import { DAYS, DUEZY_PATH, sportToSave } from '../../data/duezyOptions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyDivisionSettings from './DuezyDivisionSettings.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';
import DuezyPeoplePanel from './DuezyPeoplePanel.jsx';
import { scheduleToSave } from '../../utils/duezySchedule.js';
import { getPeople } from '../../services/duezyPeopleService.js';
import { canEdit, isOwner } from '../../utils/duezyPeople.js';

/**
 * League settings = the organization only (name, sport, late rule, payment note).
 * Night, dates, dues and weeks belong to divisions (section below). Leagues that predate
 * division rows still edit those here, labelled as their one division.
 */
export default function DuezyLeagueSettings() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState(undefined);
  const back = `${DUEZY_PATH}/league/${leagueId}`;

  useEffect(() => {
    getLeague(leagueId)
      .then((l) => setForm(l ? { ...l, payment_note: l.payment_note || '' } : null))
      .catch((e) => setError(e.message));
    getPeople(leagueId).then((p) => setRole(p?.my_role || null)).catch(() => setRole(null));
  }, [leagueId]);

  if (error && !form) return <p className="dz-error">{error}</p>;
  if (!form || role === undefined) return <p className="dz-muted dz-center">Loading…</p>;

  if (!canEdit(role)) {
    return (
      <div className="dz-stack dz-stack--lg">
        <Link to={back} className="dz-link dz-small">Back to {form.name}</Link>
        <p className="dz-viewonly"><span aria-hidden="true">👀</span><span>You can view this league but not change its settings.</span></p>
        <DuezyPeoplePanel league={form} />
      </div>
    );
  }

  const hasDivisions = Boolean(form.multi_division);

  const set = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setSaved(false);
  };

  const leagueFields = () => ({
    name: form.name.trim(),
    sport: sportToSave(form.sport),
    payment_note: form.payment_note.trim() || null,
    ...('grace_days' in form ? scheduleToSave({ grace_days: form.grace_days }, { league: true }) : {}),
  });

  const legacyDivisionFields = () => {
    const totalWeeks = Number(form.total_weeks) || 12;
    return {
      play_day: form.play_day,
      dues_amount: Number(form.dues_amount) || 0,
      dues_basis: form.dues_basis,
      players_per_match: Number(form.players_per_match) || 1,
      total_weeks: totalWeeks,
      current_week: Math.min(form.current_week, totalWeeks),
      ...matchesToSave(form),
      ...scheduleToSave(form, { league: true }),
    };
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateLeague(leagueId, hasDivisions ? leagueFields() : { ...leagueFields(), ...legacyDivisionFields() });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!window.confirm(`Archive ${form.name}? It disappears from your list but nothing is deleted.`)) return;
    try {
      await archiveLeague(leagueId);
      navigate(DUEZY_PATH, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dz-stack dz-stack--lg">
      <form className="dz-card dz-stack" onSubmit={save}>
        <Link to={back} className="dz-link dz-small">Back to {form.name}</Link>
        <div>
          <span className="dz-eyebrow">League</span>
          <h1 className="dz-h1">League settings</h1>
          <p className="dz-small dz-muted">These apply to the whole league. Night, dates, dues and weeks are set per division.</p>
        </div>

        <label className="dz-field">
          <span>League name</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} required />
        </label>
        <div className="dz-field">
          <span>What you play</span>
          <DuezySportPicker value={form.sport} onChange={(sport) => set({ sport })} />
        </div>

        {hasDivisions ? (
          <>
            <h2 className="dz-h3">When a team counts as late</h2>
            <DuezyScheduleFields value={form} onChange={set} showDates={false} />
            <p className="dz-small dz-muted">League default — a division can use its own in its settings below.</p>
          </>
        ) : (
          <>
            <h2 className="dz-h3">Your division</h2>
            <p className="dz-small dz-muted">This league has one division. Its night, dues and schedule:</p>
            <label className="dz-field">
              <span>Night you play</span>
              <select value={form.play_day || ''} onChange={(e) => set({ play_day: e.target.value })}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <DuezyDuesFields league={form} onChange={set} />
            <p className="dz-small dz-muted">
              Each team pays {money(weeklyDues(form))} per week. Changing dues updates what every team owes, including past weeks.
            </p>
            <DuezyScheduleFields value={form} onChange={set} />
          </>
        )}

        <label className="dz-field">
          <span>Payment instructions for reminders <em className="dz-muted">(optional)</em></span>
          <input
            value={form.payment_note}
            onChange={(e) => set({ payment_note: e.target.value })}
            placeholder="e.g. Venmo @yourname or cash at the table"
            maxLength={300}
          />
          <small className="dz-small dz-muted">Added to the end of reminder texts so teams know how to pay you.</small>
        </label>

        {error ? <p className="dz-error">{error}</p> : null}
        {saved ? <p className="dz-notice">Saved.</p> : null}

        <div className="dz-row">
          {isOwner(role) ? <button type="button" className="dz-link dz-link--danger dz-small" onClick={archive}>Archive league</button> : <span />}
          <button type="submit" className="dz-btn dz-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save league'}</button>
        </div>
      </form>
      <DuezyDivisionSettings
        league={form}
        isOwner={isOwner(role)}
        onConverted={() => setForm((prev) => ({ ...prev, multi_division: true }))}
      />
      <DuezyPeoplePanel league={form} />
    </div>
  );
}
